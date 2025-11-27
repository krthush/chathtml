import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';

export default async function Page({ params }: { params: { code: string } }) {
  
  // ... your existing code (if any) ...
  
  const code = params.code;
  
  // Check if it's an affiliate code
  const res = await fetch('https://faved.com/api/affiliate-links/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'prada', code }),
    cache: 'no-store'
  });
  
  const data = await res.json();
  
  if (data.success && data.url) {
    // Check if it's a bot (for social previews)
    const userAgent = (await headers()).get('user-agent') || '';
    const isBot = /bot|crawler|spider|facebookexternalhit|twitterbot/i.test(userAgent);
    
    if (isBot) {
      // Return HTML with meta tags for social bots
      return (
        <html>
          <head>
            <title>{data.preview.title}</title>
            <meta property="og:title" content={data.preview.title} />
            <meta property="og:description" content={data.preview.description} />
            <meta property="og:image" content={data.preview.image} />
            <meta httpEquiv="refresh" content={`0;url=${data.url}`} />
          </head>
          <body>Redirecting...</body>
        </html>
      );
    }
    
    // For regular users, redirect immediately
    redirect(data.url);
  }
  
  // Not an affiliate link, show 404
  notFound();
}