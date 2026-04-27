import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  bucketName: process.env.COZE_BUCKET_NAME,
});

// 获取微信支付配置
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取系统配置
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['wechat_qrcode_url', 'wechat_qrcode_key', 'wechat_exchange_rate', 'wechat_enabled']);

    if (configError) {
      console.error('获取微信配置失败:', configError);
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
        exchangeRate: parseFloat(config['wechat_exchange_rate'] || '7'),
        enabled: config['wechat_enabled'] === 'true',
      },
    });
  } catch (error) {
    console.error('获取微信支付配置错误:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}
