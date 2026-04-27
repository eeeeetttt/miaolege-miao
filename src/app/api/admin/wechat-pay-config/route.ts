import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  bucketName: process.env.COZE_BUCKET_NAME,
});

// 获取微信支付配置
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const { data: configData, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['wechat_qrcode_url', 'wechat_qrcode_key', 'wechat_exchange_rate', 'wechat_enabled']);

    if (error) {
      console.error('获取配置失败:', error);
      return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
    }

    const config: Record<string, string> = {};
    if (configData) {
      for (const item of configData) {
        config[item.config_key] = item.config_value || '';
      }
    }

    // 从 key 动态生成 URL
    let qrcodeUrl = '';
    const qrcodeKey = config['wechat_qrcode_key'] || config['wechat_qrcode_url'];
    if (qrcodeKey) {
      try {
        qrcodeUrl = await storage.generatePresignedUrl({
          key: qrcodeKey,
          expireTime: 86400, // 1天有效期
        });
      } catch (e) {
        console.error('生成收款码URL失败:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        qrcodeUrl,
        exchangeRate: config['wechat_exchange_rate'] || '7',
        enabled: config['wechat_enabled'] === 'true',
      },
    });
  } catch (error) {
    console.error('获取微信支付配置错误:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// 更新微信支付配置
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const formData = await request.formData();
    const action = formData.get('action') as string;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    if (action === 'uploadQrcode') {
      // 上传收款二维码
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: '请上传文件' }, { status: 400 });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: '仅支持 JPG、PNG、GIF、WebP 格式' }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: '文件大小不能超过 5MB' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileName = `config/wechat-qrcode-${Date.now()}.${file.name.split('.').pop()}`;
      const key = await storage.uploadFile({
        fileContent: buffer,
        fileName,
        contentType: file.type,
      });

      // 保存 key 而不是 URL（URL会过期，key不会）
      await supabase
        .from('system_config')
        .upsert({ 
          config_key: 'wechat_qrcode_key', 
          config_value: key 
        }, { onConflict: 'config_key' });

      // 返回带签名的URL用于立即显示
      const qrcodeUrl = await storage.generatePresignedUrl({
        key,
        expireTime: 86400, // 1天有效期
      });

      return NextResponse.json({
        success: true,
        message: '收款码上传成功',
        qrcodeUrl,
      });
    } else {
      // 更新其他配置
      const { exchangeRate, enabled } = JSON.parse(formData.get('config') as string);

      if (exchangeRate !== undefined) {
        const rate = parseFloat(exchangeRate);
        if (isNaN(rate) || rate <= 0) {
          return NextResponse.json({ error: '汇率必须为正数' }, { status: 400 });
        }
        await supabase
          .from('system_config')
          .upsert({ 
            config_key: 'wechat_exchange_rate', 
            config_value: String(rate) 
          }, { onConflict: 'config_key' });
      }

      if (enabled !== undefined) {
        await supabase
          .from('system_config')
          .upsert({ 
            config_key: 'wechat_enabled', 
            config_value: enabled ? 'true' : 'false' 
          }, { onConflict: 'config_key' });
      }

      return NextResponse.json({
        success: true,
        message: '配置更新成功',
      });
    }
  } catch (error) {
    console.error('更新微信支付配置错误:', error);
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 });
  }
}
