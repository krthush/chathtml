import { openai } from '@ai-sdk/openai';
import { generateText, type ModelMessage } from 'ai';

export async function POST(req: Request) {
  const { messages, currentCode }: { messages: ModelMessage[]; currentCode: string } = await req.json();

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

When modifying existing code, carefully read the current code and make only the requested changes while preserving the overall structure unless asked to rebuild from scratch.`;

  const { response } = await generateText({
    model: openai('gpt-5'),
    providerOptions: {
      openai: {
        reasoningEffort: 'high',
      },
    },
    system: systemPrompt,
    messages,
  });

  return Response.json({ messages: response.messages });
}