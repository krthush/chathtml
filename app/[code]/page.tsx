import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';

export default async function Page({ 
  params 
}: { 
  params: Promise<{ code: string }> 
}) {
  
  // ... your existing code (if any) ...
  
  // Await params in Next.js 15+
  const { code } = await params;
  
  // Get user's actual headers to pass through
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const referrer = headersList.get('referer') || '';
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             headersList.get('x-real-ip') || '';
  
  // Check if it's an affiliate code
  const res = await fetch('https://faved.com/api/affiliate-links/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      slug: 'prada', 
      code,
      ip,
      userAgent,
      referrer
    }),
    cache: 'no-store'
  });
  
  const data = await res.json();
  
  if (data.success && data.url) {
    // Check if it's a bot (for social previews)
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