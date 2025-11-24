import { put, list, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

// GET - List all custom templates from blob storage
export async function GET() {
  try {
    const { blobs } = await list({
      prefix: 'templates/',
    });

    const templates = blobs.map(blob => ({
      name: blob.pathname.replace('templates/', '').replace('.html', ''),
      url: blob.url,
      uploadedAt: blob.uploadedAt,
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error listing templates:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}

// POST - Save a new template to blob storage
export async function POST(request: Request) {
  try {
    const { name, content } = await request.json();

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    // Sanitize the template name
    const sanitizedName = name
      .trim()
      .replace(/[^a-zA-Z0-9-_\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();

    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Invalid template name' },
        { status: 400 }
      );
    }

    // Create a blob from the HTML content
    const blob = new Blob([content], { type: 'text/html' });
    const file = new File([blob], `${sanitizedName}.html`, { type: 'text/html' });

    // Upload to Vercel Blob with templates/ prefix
    const uploadedBlob = await put(`templates/${sanitizedName}.html`, file, {
      access: 'public',
      addRandomSuffix: false, // Don't add random suffix for template names
    });

    return NextResponse.json({
      success: true,
      template: {
        name: sanitizedName,
        url: uploadedBlob.url,
      },
    });
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a custom template from blob storage
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Template URL is required' },
        { status: 400 }
      );
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

