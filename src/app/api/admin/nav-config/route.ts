import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取导航栏按钮配置
 */
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // 返回默认配置
      return NextResponse.json({ 
        config: {
          nav_show_challenge_hall: true,
          nav_show_kline_challenge: true,
          nav_show_social: true,
          nav_show_docs: true,
          nav_show_suggestion: true,
          nav_show_complaint: true,
          nav_show_download: true,
          nav_show_app_download: true,
        }
      });
    }

    const { data: configData, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', [
        'nav_show_challenge_hall',
        'nav_show_kline_challenge',
        'nav_show_social',
        'nav_show_docs',
        'nav_show_suggestion',
        'nav_show_complaint',
        'nav_show_download',
        'nav_show_app_download',
      ]);

    if (error) {
      console.error('获取导航配置失败:', error);
      // 返回默认配置
      return NextResponse.json({ 
        config: {
          nav_show_challenge_hall: true,
          nav_show_kline_challenge: true,
          nav_show_social: true,
          nav_show_docs: true,
          nav_show_suggestion: true,
          nav_show_complaint: true,
          nav_show_download: true,
          nav_show_app_download: true,
        }
      });
    }

    const configMap: Record<string, string> = {};
    if (configData) {
      for (const item of configData) {
        configMap[item.config_key] = item.config_value || '';
      }
    }

    const navConfig = {
      nav_show_challenge_hall: configMap['nav_show_challenge_hall'] !== 'false',
      nav_show_kline_challenge: configMap['nav_show_kline_challenge'] !== 'false',
      nav_show_social: configMap['nav_show_social'] !== 'false',
      nav_show_docs: configMap['nav_show_docs'] !== 'false',
      nav_show_suggestion: configMap['nav_show_suggestion'] !== 'false',
      nav_show_complaint: configMap['nav_show_complaint'] !== 'false',
      nav_show_download: configMap['nav_show_download'] !== 'false',
      nav_show_app_download: configMap['nav_show_app_download'] !== 'false',
    };

    return NextResponse.json({ config: navConfig });
  } catch (error) {
    console.error('Get nav config error:', error);
    return NextResponse.json({ 
      config: {
        nav_show_challenge_hall: true,
        nav_show_kline_challenge: true,
        nav_show_social: true,
        nav_show_docs: true,
        nav_show_suggestion: true,
        nav_show_complaint: true,
        nav_show_download: true,
        nav_show_app_download: true,
      }
    });
  }
}

/**
 * 保存导航栏按钮配置
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const {
      nav_show_challenge_hall,
      nav_show_kline_challenge,
      nav_show_social,
      nav_show_docs,
      nav_show_suggestion,
      nav_show_complaint,
      nav_show_download,
      nav_show_app_download,
    } = body;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 保存每个导航配置
    const configs = [
      { key: 'nav_show_challenge_hall', value: String(nav_show_challenge_hall ?? true) },
      { key: 'nav_show_kline_challenge', value: String(nav_show_kline_challenge ?? true) },
      { key: 'nav_show_social', value: String(nav_show_social ?? true) },
      { key: 'nav_show_docs', value: String(nav_show_docs ?? true) },
      { key: 'nav_show_suggestion', value: String(nav_show_suggestion ?? true) },
      { key: 'nav_show_complaint', value: String(nav_show_complaint ?? true) },
      { key: 'nav_show_download', value: String(nav_show_download ?? true) },
      { key: 'nav_show_app_download', value: String(nav_show_app_download ?? true) },
    ];

    for (const config of configs) {
      const { error } = await supabase
        .from('system_config')
        .upsert({ 
          config_key: config.key, 
          config_value: config.value 
        }, { 
          onConflict: 'config_key' 
        });

      if (error) {
        console.error(`保存配置 ${config.key} 失败:`, error);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: '导航配置已保存',
    });
  } catch (error) {
    console.error('Save nav config error:', error);
    return NextResponse.json({ error: '保存导航配置失败' }, { status: 500 });
  }
}
