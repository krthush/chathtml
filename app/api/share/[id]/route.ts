import { list } from '@vercel/blob';

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

