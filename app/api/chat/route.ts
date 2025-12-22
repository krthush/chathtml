import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import Anthropic from '@anthropic-ai/sdk';

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

// ---- Prompt size management (simple + robust; avoids hard context/token errors) ----

const MAX_CODE_CHARS_INLINE = 24_000;
const CODE_SNIPPET_CHARS = 8_000;
const MAX_TRANSCRIPT_CHARS_BEFORE_SUMMARY = 80_000;
const KEEP_LAST_MESSAGES = 12;
const SUMMARY_CHUNK_CHARS = 12_000;

function approxTokensFromText(text: string) {
  // Very rough heuristic: ~4 chars per token for English/code-ish text.
  return Math.ceil((text || '').length / 4);
}

function chunkTextByChars(text: string, chunkSize: number): string[] {
  if (!text) return [];
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function messageToTranscript(msg: ExtendedMessage): string {
  const role = msg.role.toUpperCase();
  const text = msg.content ?? '';
  const imagesText = msg.images?.length
    ? `\n[Images (${msg.images.length})]\n${msg.images.map((img, idx) => `- Image ${idx + 1}: ${img.url} (${img.name})`).join('\n')}`
    : '';
  return `${role}:\n${text}${imagesText}`.trim();
}

function buildSystemPromptBase() {
  return `You are an expert web developer assistant helping users build HTML pages.

When the user asks you to create or modify HTML:
1. First, provide a brief explanation of what you're doing
2. Then provide the COMPLETE HTML code in a code block with the language identifier "html"
3. Always include the full HTML document structure (DOCTYPE, html, head, body tags)
4. Use modern, semantic HTML5
5. Include beautiful, modern CSS styling (you can use inline styles or <style> tags)
6. Make the pages visually appealing and professional
7. If modifying existing code, make sure to preserve any parts the user wants to keep

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

async function summarizeTextChunk(params: {
  provider: SelectedModel;
  title: string;
  chunk: string;
}) {
  const system = `You are a compression engine. Summarize the provided ${params.title} chunk into a dense, faithful representation.
Preserve: structure, key constraints, ids/classes, important copy, and must-keep details.
Output plain text. Prefer bullets. Be concise but do not omit critical information.`;

  if (params.provider === 'gpt') {
    const { text } = await generateText({
      model: openai('gpt-5-mini'),
      system,
      messages: [{ role: 'user', content: params.chunk }] as any[],
    });
    return (text || '').trim();
  }

  const resp = await anthropicClient.messages.create({
    model: CLAUDE_SONNET_MODEL,
    max_tokens: 1200,
    system,
    messages: [{ role: 'user', content: params.chunk }],
  });

  return resp.content
    .filter((block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === 'text')
    .map((block: Anthropic.TextBlock) => block.text)
    .join('\n')
    .trim();
}

async function summarizeLargeText(params: {
  provider: SelectedModel;
  title: string;
  text: string;
}) {
  const chunks = chunkTextByChars(params.text, SUMMARY_CHUNK_CHARS);
  if (chunks.length === 0) return '';
  if (chunks.length === 1) {
    return summarizeTextChunk({ provider: params.provider, title: params.title, chunk: chunks[0] });
  }

  const partials: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const header = `Chunk ${i + 1} of ${chunks.length}\n`;
    const partial = await summarizeTextChunk({
      provider: params.provider,
      title: params.title,
      chunk: `${header}${chunks[i]}`,
    });
    if (partial) partials.push(partial);
  }

  const combined = partials.join('\n\n---\n\n');
  // Reduce once more if needed.
  if (combined.length <= SUMMARY_CHUNK_CHARS) return combined;
  return summarizeTextChunk({
    provider: params.provider,
    title: `${params.title} (combined summary)`,
    chunk: combined,
  });
}

export async function POST(req: Request) {
  const { messages, currentCode, model }: { messages: ExtendedMessage[]; currentCode: string; model?: string } = await req.json();

  const provider: SelectedModel = model === 'gpt' ? 'gpt' : 'claude';

  // Build a size-aware system prompt: inline smaller code, otherwise include snippets + summary.
  let codeContext = '';
  if (currentCode && currentCode.trim()) {
    if (currentCode.length <= MAX_CODE_CHARS_INLINE) {
      codeContext = `CURRENT HTML CODE IN EDITOR:\n\`\`\`html\n${currentCode}\n\`\`\`\n\n`;
    } else {
      const startSnippet = currentCode.slice(0, CODE_SNIPPET_CHARS);
      const endSnippet = currentCode.slice(-CODE_SNIPPET_CHARS);
      const codeSummary = await summarizeLargeText({
        provider,
        title: 'CURRENT HTML CODE',
        text: currentCode,
      });

      codeContext =
        `CURRENT HTML CODE IN EDITOR (very large; provided as summary + snippets):\n` +
        (codeSummary ? `\n[CODE SUMMARY]\n${codeSummary}\n` : '') +
        `\n[CODE SNIPPET: START]\n\`\`\`html\n${startSnippet}\n\`\`\`\n` +
        `\n[CODE SNIPPET: END]\n\`\`\`html\n${endSnippet}\n\`\`\`\n\n` +
        `If some detail needed for an exact edit is missing from the summary/snippets, ask the user to paste the relevant section.`;
    }
  }

  // If chat history gets large, summarize older messages and keep only the tail verbatim.
  const transcript = messages.map(messageToTranscript).join('\n\n====\n\n');
  let conversationSummary = '';
  let modelMessages = messages;
  if (transcript.length > MAX_TRANSCRIPT_CHARS_BEFORE_SUMMARY && messages.length > KEEP_LAST_MESSAGES) {
    const head = messages.slice(0, Math.max(0, messages.length - KEEP_LAST_MESSAGES));
    const tail = messages.slice(-KEEP_LAST_MESSAGES);
    const headTranscript = head.map(messageToTranscript).join('\n\n====\n\n');
    conversationSummary = await summarizeLargeText({
      provider,
      title: 'CHAT HISTORY (older messages)',
      text: headTranscript,
    });
    modelMessages = tail;
  }

  const systemPrompt =
    `${buildSystemPromptBase()}\n\n` +
    (codeContext ? `${codeContext}\n` : '') +
    (conversationSummary ? `CONVERSATION SUMMARY (older context):\n${conversationSummary}\n\n` : '');

  // Use Azure-hosted Claude Sonnet as default, GPT only when explicitly selected
  if (model !== 'gpt') {
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

  const { text } = await generateText({
    model: openai('gpt-5-mini'),
    system: systemPrompt,
    messages: processedMessages as any[],
  });

  const assistantContent = (text || '').trim();
  return Response.json({ messages: [...messages, { role: 'assistant', content: assistantContent }] });
}