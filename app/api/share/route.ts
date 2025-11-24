import { put } from '@vercel/blob';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return Response.json(
        { error: 'Invalid HTML code provided' },
        { status: 400 }
      );
    }

    // Generate a unique ID for this shared code
    const id = randomBytes(6).toString('base64url'); // generates a short unique ID
    
    // Save to Vercel Blob with the ID as the filename
    const blob = await put(`shared/${id}.html`, code, {
      access: 'public',
      contentType: 'text/html',
    });

    // Return the ID and the full URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin')}?share=${id}`;

    return Response.json({
      id,
      shareUrl,
      blobUrl: blob.url,
    });
  } catch (error) {
    console.error('Error saving shared code:', error);
    return Response.json(
      { error: 'Failed to save shared code' },
      { status: 500 }
    );
  }
}

