# ChatHTML - AI-Powered HTML Editor

An intuitive AI-powered HTML editor designed for non-technical users to build beautiful landing pages, newsletters, and email templates.

## Features

- **AI Chat Interface**: Communicate with an AI assistant to generate and modify HTML code
- **Image Upload**: Upload images that are automatically hosted and embedded in your HTML
- **Live Code Editor**: Monaco Editor (VS Code's editor) with syntax highlighting and auto-formatting
- **Real-time Preview**: Instant preview of your HTML changes
- **Modern UI**: Beautiful gradient-based design with excellent contrast and readability

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Vercel AI SDK** (with OpenAI integration)
- **Vercel Blob Storage** (for image uploads)
- **Monaco Editor** (VS Code editor)
- **Lucide React** (Icons)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory and add your API keys:

```env
OPENAI_API_KEY=sk-your-api-key-here
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

**Getting a Vercel Blob Token:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Storage → Create → Blob Storage
3. Create a new blob store
4. Copy the `BLOB_READ_WRITE_TOKEN` from the store settings

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How to Use

1. **Chat with AI**: Type your request in the chat interface (e.g., "Create a landing page for a coffee shop")
2. **Upload Images**: Click the image icon to upload images. They'll be automatically hosted and available for use
3. **AI Generates Code**: The AI will generate HTML code with your images and automatically update the editor
4. **Edit Manually**: You can also manually edit the code in the middle panel
5. **Live Preview**: See your changes instantly in the preview panel on the right

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
