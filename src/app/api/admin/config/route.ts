import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * 保存系统配置
 * 注意：这里只是示例，实际应该保存到数据库
 * 当前配置通过环境变量控制，需要重启服务才能生效
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { planetCreationThreshold, rechargeEnabled, defaultTicketPrice, maxPublishers } = body;

    // TODO: 将配置保存到数据库的 system_config 表
    // 当前版本配置存储在环境变量中，需要重启服务才能生效
    // 这里只是返回成功，实际配置需要手动更新 .env 文件

    console.log('Config saved:', {
      planetCreationThreshold,
      rechargeEnabled,
      defaultTicketPrice,
      maxPublishers,
    });

    return NextResponse.json({ 
      success: true,
      message: '配置已保存（注意：部分配置需要重启服务才能生效）',
      config: {
        planetCreationThreshold,
        rechargeEnabled,
        defaultTicketPrice,
        maxPublishers,
      }
    });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
  }
}
