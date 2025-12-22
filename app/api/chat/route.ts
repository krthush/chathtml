import { generateText, streamText } from 'ai';
import Anthropic from '@anthropic-ai/sdk';
import { azure } from '@ai-sdk/azure';

// Initialize the Anthropic client for Azure-hosted Claude
const AZURE_RESOURCE_NAME = process.env.AZURE_RESOURCE_NAME || "faved-resource";

const anthropicClient = new Anthropic({
  apiKey: process.env.AZURE_API_KEY || "",
  baseURL: `https://${AZURE_RESOURCE_NAME}.openai.azure.com/anthropic`,
});

const CLAUDE_SONNET_MODEL = "claude-sonnet-4-5";

interface ImageAttachment {
  name: string;
  url: string;
}

interface ExtendedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: ImageAttachment[];
}

type SelectedModel = 'claude' | 'gpt';
const DEFAULT_PROVIDER: SelectedModel = 'gpt';
const GPT_MODEL_ID = 'gpt-5.2';

const MAX_TOKENS_DEFAULT = 8192;

function sseEncode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function buildSystemPromptBase() {
  return `You are an expert web developer assistant helping users build HTML pages.

When the user asks you to create or modify HTML:
1. First, provide a brief explanation of what you're doing
2. Then provide the COMPLETE updated HTML document in a SINGLE code block with the language identifier "html"
3. Always include the full HTML document structure (DOCTYPE, html, head, body tags). This app edits ONE standalone HTML file.
4. Use modern, semantic HTML5
5. Include beautiful, modern CSS styling (you can use inline styles or <style> tags)
6. Make the pages visually appealing and professional
7. If modifying existing code, treat the editor content as the canonical single HTML page: preserve all unrelated parts and apply the requested edits to the whole document (do not output patches/diffs or partial snippets).

Output rules:
- If you include any planning section (e.g. "Plan"), it must be OUTSIDE the html code block.
- The html code block must contain ONLY the final HTML document (no commentary inside the code block).

When the user provides images:
- You can see and analyze the images directly using vision
- The images are uploaded to permanent, publicly accessible URLs (Vercel Blob storage)
- The exact image URLs will be provided in the format: "Image X: https://..."
- IMPORTANT: When creating or modifying HTML, you MUST use these exact URLs in your <img> tags
- Example: If provided "Image 1: https://abc123.public.blob.vercel-storage.com/image.jpg", use <img src="https://abc123.public.blob.vercel-storage.com/image.jpg" alt="description">
- Analyze image content to provide relevant descriptions, styling suggestions, or HTML structure
- Always incorporate uploaded images into the HTML output using their provided URLs

When modifying existing code, carefully read the current code and make only the requested changes while preserving the overall structure unless asked to rebuild from scratch.`;
}

export async function POST(req: Request) {
  const {
    messages,
    currentCode,
    model,
    stream,
    showPlan,
    maxTokens,
  }: {
    messages: ExtendedMessage[];
    currentCode: string;
    model?: string;
    stream?: boolean;
    showPlan?: boolean;
    maxTokens?: number;
  } = await req.json();

  const provider: SelectedModel = model === 'claude' ? 'claude' : DEFAULT_PROVIDER;

  // Prompt size management removed: always include the full current HTML and full chat history.
  const modelMessages = messages;
  const codeContext =
    currentCode && currentCode.trim()
      ? `CURRENT HTML CODE IN EDITOR (full document):\n\`\`\`html\n${currentCode}\n\`\`\`\n\n`
      : '';

  const systemPrompt =
    `${buildSystemPromptBase()}\n\n` +
    (codeContext ? `${codeContext}\n` : '') +
    (showPlan
      ? `When you respond, first include a short section titled "Plan" with 1-3 bullet points describing what you'll do at a high level. Do not reveal hidden chain-of-thought or detailed internal reasoning. Then provide your full answer.\n`
      : '');

  // Streaming (SSE) response: enables Cursor-like "Stop" and faster perceived speed.
  if (stream) {
    const encoder = new TextEncoder();
    const tokenLimit = typeof maxTokens === 'number' && maxTokens > 0 ? Math.floor(maxTokens) : MAX_TOKENS_DEFAULT;

    const bodyStream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        };

        send('meta', { provider, model: provider === 'gpt' ? GPT_MODEL_ID : CLAUDE_SONNET_MODEL });
        send('status', { state: 'thinking' });

        // Use Azure-hosted Claude Sonnet only when explicitly selected
        if (provider !== 'gpt') {
          const anthropicMessages: Anthropic.MessageParam[] = modelMessages.map((msg) => {
            if (msg.images && msg.images.length > 0) {
              const contentParts: Anthropic.ContentBlockParam[] = [];

              const imageUrlsText = msg.images
                .map((img, idx) => `Image ${idx + 1}: ${img.url}`)
                .join('\n');

              const textContent = msg.content && msg.content.trim()
                ? `${msg.content}\n\n[Uploaded Images - Use these URLs in your HTML]:\n${imageUrlsText}`
                : `[Uploaded Images - Use these URLs in your HTML]:\n${imageUrlsText}`;

              contentParts.push({ type: 'text', text: textContent });

              msg.images.forEach((img) => {
                contentParts.push({
                  type: 'image',
                  source: { type: 'url', url: img.url }
                });
              });

              return { role: msg.role as 'user' | 'assistant', content: contentParts };
            }

            return { role: msg.role as 'user' | 'assistant', content: msg.content };
          });

          const msgStream = anthropicClient.messages.stream(
            {
              model: CLAUDE_SONNET_MODEL,
              max_tokens: tokenLimit,
              system: systemPrompt,
              messages: anthropicMessages,
            },
            { signal: req.signal },
          );

          msgStream.on('text', (delta) => {
            send('status', { state: 'streaming' });
            send('token', { delta });
          });

          msgStream.on('error', (err: any) => {
            send('error', { message: err?.message ?? 'Model error' });
            controller.close();
          });

          msgStream.on('abort', () => {
            send('done', { reason: 'abort' });
            controller.close();
          });

          msgStream.on('end', () => {
            send('done', { reason: 'end' });
            controller.close();
          });

          return;
        }

        // OpenAI GPT streaming via AI SDK
        (async () => {
          try {
            const processedMessages = modelMessages.map((msg) => {
              if (msg.images && msg.images.length > 0) {
                const contentParts: any[] = [];

                const imageUrlsText = msg.images
                  .map((img, idx) => `Image ${idx + 1}: ${img.url}`)
                  .join('\n');

                const textContent = msg.content && msg.content.trim()
                  ? `${msg.content}\n\n[Uploaded Images - Use these URLs in your HTML]:\n${imageUrlsText}`
                  : `[Uploaded Images - Use these URLs in your HTML]:\n${imageUrlsText}`;

                contentParts.push({ type: 'text', text: textContent });
                msg.images.forEach((img) => contentParts.push({ type: 'image', image: img.url }));

                return { role: msg.role, content: contentParts };
              }

              return { role: msg.role, content: msg.content };
            });

            const result = streamText({
              model: azure(GPT_MODEL_ID),
              system: systemPrompt,
              messages: processedMessages as any[],
              abortSignal: req.signal,
              maxOutputTokens: tokenLimit,
            });

            for await (const delta of result.textStream) {
              send('status', { state: 'streaming' });
              send('token', { delta });
            }

            send('done', { reason: 'end' });
            controller.close();
          } catch (err: any) {
            if (req.signal.aborted) {
              send('done', { reason: 'abort' });
              controller.close();
              return;
            }
            send('error', { message: err?.message ?? 'Model error' });
            controller.close();
          }
        })();
      },
    });

    return new Response(bodyStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  // Non-streaming path (legacy): use the same provider selection logic.
  if (provider !== 'gpt') {
    // Process messages for Anthropic SDK format
    const anthropicMessages: Anthropic.MessageParam[] = modelMessages.map((msg) => {
      if (msg.images && msg.images.length > 0) {
        const contentParts: Anthropic.ContentBlockParam[] = [];
        
        // Add text content with image URLs
        const imageUrlsText = msg.images
          .map((img, idx) => `Image ${idx + 1}: ${img.url}`)
          .join('\n');
        
        const textContent = msg.content && msg.content.trim()
          ? `${msg.content}\n\n[Uploaded Images - Use these URLs in your HTML]:\n${imageUrlsText}`
          : `[Uploaded Images - Use these URLs in your HTML]:\n${imageUrlsText}`;
        
        contentParts.push({
          type: 'text',
          text: textContent
        });
        
        // Add each image as an image part for vision
        msg.images.forEach((img) => {
          contentParts.push({
            type: 'image',
            source: {
              type: 'url',
              url: img.url
            }
          });
        });
        
        return {
          role: msg.role as 'user' | 'assistant',
          content: contentParts
        };
      }
      
      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      };
    });

    const response = await anthropicClient.messages.create({
      model: CLAUDE_SONNET_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    // Extract text content from response
    const assistantContent = response.content
      .filter((block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === 'text')
      .map((block: Anthropic.TextBlock) => block.text)
      .join('\n');

    const extendedMessages: ExtendedMessage[] = [
      ...messages,
      { role: 'assistant', content: assistantContent }
    ];

    return Response.json({ messages: extendedMessages });
  }

  // Use OpenAI GPT only when explicitly selected (model === 'gpt')
  // Process messages for AI SDK (OpenAI) format
  const processedMessages = modelMessages.map((msg) => {
    if (msg.images && msg.images.length > 0) {
      const contentParts: any[] = [];
      
      const imageUrlsText = msg.images
        .map((img, idx) => `Image ${idx + 1}: ${img.url}`)
        .join('\n');
      
      const textContent = msg.content && msg.content.trim()
        ? `${msg.content}\n\n[Uploaded Images - Use these URLs in your HTML]:\n${imageUrlsText}`
        : `[Uploaded Images - Use these URLs in your HTML]:\n${imageUrlsText}`;
      
      contentParts.push({
        type: 'text',
        text: textContent
      });
      
      msg.images.forEach((img) => {
        contentParts.push({
          type: 'image',
          image: img.url
        });
      });
      
      return {
        role: msg.role,
        content: contentParts
      };
    }
    
    return {
      role: msg.role,
      content: msg.content
    };
  });

  const tokenLimit = typeof maxTokens === 'number' && maxTokens > 0 ? Math.floor(maxTokens) : MAX_TOKENS_DEFAULT;

  const { text } = await generateText({
    model: azure(GPT_MODEL_ID),
    system: systemPrompt,
    messages: processedMessages as any[],
    maxOutputTokens: tokenLimit,
  });

  const assistantContent = (text || '').trim();
  return Response.json({ messages: [...messages, { role: 'assistant', content: assistantContent }] });
}