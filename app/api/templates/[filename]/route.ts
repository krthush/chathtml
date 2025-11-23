import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Security: Only allow .html files and prevent directory traversal
    if (!filename.endsWith('.html') || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Read the template file from the templates directory
    const templatesDir = join(process.cwd(), 'templates');
    const filePath = join(templatesDir, filename);
    
    const content = await readFile(filePath, 'utf-8');
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error reading template:', error);
    return NextResponse.json(
      { error: 'Template not found' },
      { status: 404 }
    );
  }
}

