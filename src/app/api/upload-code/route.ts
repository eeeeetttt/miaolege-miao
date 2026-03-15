import { NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });

    // 读取压缩包文件
    const filePath = join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'public', 'mlmg-planet-code.tar.gz');
    const fileContent = readFileSync(filePath);

    // 上传到对象存储
    const key = await storage.uploadFile({
      fileContent,
      fileName: 'mlmg-planet-code.tar.gz',
      contentType: 'application/gzip',
    });

    // 生成7天有效的下载链接
    const downloadUrl = await storage.generatePresignedUrl({
      key,
      expireTime: 604800, // 7天
    });

    return NextResponse.json({
      success: true,
      downloadUrl,
      fileName: 'mlmg-planet-code.tar.gz',
      fileSize: fileContent.length,
      expiresIn: '7天',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: '上传失败', details: String(error) },
      { status: 500 }
    );
  }
}
