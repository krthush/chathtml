import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

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

  // Process messages to include images with vision support
  const processedMessages = messages.map((msg) => {
    if (msg.images && msg.images.length > 0) {
      // Format message with vision content parts
      const contentParts: any[] = [];
      
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
          image: img.url
        });
      });
      
      return {
        role: msg.role,
        content: contentParts
      };
    }
    
    // For messages without images, keep as simple string content
    return {
      role: msg.role,
      content: msg.content
    };
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
- You can see and analyze the images directly using vision
- The images are uploaded to permanent, publicly accessible URLs (Vercel Blob storage)
- The exact image URLs will be provided in the format: "Image X: https://..."
- IMPORTANT: When creating or modifying HTML, you MUST use these exact URLs in your <img> tags
- Example: If provided "Image 1: https://abc123.public.blob.vercel-storage.com/image.jpg", use <img src="https://abc123.public.blob.vercel-storage.com/image.jpg" alt="description">
- Analyze image content to provide relevant descriptions, styling suggestions, or HTML structure
- Always incorporate uploaded images into the HTML output using their provided URLs

When modifying existing code, carefully read the current code and make only the requested changes while preserving the overall structure unless asked to rebuild from scratch.`;

  const { response } = await generateText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: systemPrompt,
    messages: processedMessages as any[],
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