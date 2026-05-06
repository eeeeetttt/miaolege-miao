import { NextResponse } from 'next/server';
import { createReadStream, statSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'jinhuohuo.app.apk');
    const stat = statSync(filePath);
    const fileSize = stat.size;
    
    const chunks: Uint8Array[] = [];
    const stream = createReadStream(filePath);
    
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }
    
    const fileBuffer = Buffer.concat(chunks);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="jinhuohuo.app.apk"',
        'Content-Length': fileSize.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
