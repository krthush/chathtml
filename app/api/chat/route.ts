import { openai } from '@ai-sdk/openai';
import { generateText, type ModelMessage } from 'ai';

interface ImageAttachment {
  name: string;
  url: string;
}

interface ExtendedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: ImageAttachment[];
}

export async function POST(req: Request) {
  const { messages, currentCode }: { messages: ExtendedMessage[]; currentCode: string } = await req.json();

  // Process messages to include image information
  const processedMessages = messages.map((msg) => {
    if (msg.images && msg.images.length > 0) {
      // Format image information for the AI with publicly accessible URLs
      const imageInfo = msg.images
        .map((img, idx) => `Image ${idx + 1} (${img.name}): ${img.url}`)
        .join('\n');
      
      const contentWithImages = `${msg.content}\n\n[IMAGES ATTACHED]:\n${imageInfo}`;
      
      return {
        ...msg,
        content: contentWithImages,
      };
    }
    return msg;
  });

  const systemPrompt = `You are an expert web developer assistant helping users build HTML pages.

${currentCode ? `CURRENT HTML CODE IN EDITOR:
\`\`\`html
${currentCode}
\`\`\`

` : ''}When the user asks you to create or modify HTML:
1. First, provide a brief explanation of what you're doing
2. Then provide the COMPLETE HTML code in a code block with the language identifier "html"
3. Always include the full HTML document structure (DOCTYPE, html, head, body tags)
4. Use modern, semantic HTML5
5. Include beautiful, modern CSS styling (you can use inline styles or <style> tags)
6. Make the pages visually appealing and professional
7. If modifying existing code, make sure to preserve any parts the user wants to keep

When the user provides images:
- Images are provided as publicly accessible URLs (e.g., https://...)
- You can use these URLs directly in the src attribute of <img> tags
- Example: <img src="https://example.com/image.jpg" alt="description">
- These are permanent URLs that can be used directly in the HTML

When modifying existing code, carefully read the current code and make only the requested changes while preserving the overall structure unless asked to rebuild from scratch.`;

  const { response } = await generateText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: processedMessages as ModelMessage[],
  });

  // Convert response messages to ExtendedMessage format
  const extendedMessages: ExtendedMessage[] = response.messages.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: typeof msg.content === 'string' 
      ? msg.content 
      : msg.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('\n'),
  }));

  return Response.json({ messages: extendedMessages });
}