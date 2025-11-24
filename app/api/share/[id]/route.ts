import { list, put, del } from '@vercel/blob';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return Response.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // List blobs with the specific prefix to find our file
    const { blobs } = await list({
      prefix: `shared/${id}.html`,
      limit: 1,
    });

    if (blobs.length === 0) {
      return Response.json(
        { error: 'Shared code not found' },
        { status: 404 }
      );
    }

    // Fetch the content from the blob URL
    const response = await fetch(blobs[0].url);
    const code = await response.text();

    return Response.json({ code });
  } catch (error) {
    console.error('Error loading shared code:', error);
    return Response.json(
      { error: 'Failed to load shared code' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { code } = await req.json();

    if (!id) {
      return Response.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    if (!code || typeof code !== 'string') {
      return Response.json(
        { error: 'Invalid HTML code provided' },
        { status: 400 }
      );
    }

    // Check if blob exists and delete it first
    const { blobs } = await list({
      prefix: `shared/${id}.html`,
      limit: 1,
    });

    if (blobs.length > 0) {
      await del(blobs[0].url);
    }

    // Create new blob with the same ID
    const blob = await put(`shared/${id}.html`, code, {
      access: 'public',
      contentType: 'text/html',
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin')}?share=${id}`;

    return Response.json({
      id,
      shareUrl,
      blobUrl: blob.url,
    });
  } catch (error) {
    console.error('Error updating shared code:', error);
    return Response.json(
      { error: 'Failed to update shared code' },
      { status: 500 }
    );
  }
}

