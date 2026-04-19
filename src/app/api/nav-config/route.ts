import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取导航栏按钮配置（公众接口）
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
}
