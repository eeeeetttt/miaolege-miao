import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 默认导航配置
const DEFAULT_NAV_CONFIG = [
  { navKey: 'users', navName: '用户管理', isVisible: 1, sortOrder: 1 },
  { navKey: 'recharge', navName: '充值审核', isVisible: 1, sortOrder: 2 },
  { navKey: 'complaints', navName: '投诉管理', isVisible: 1, sortOrder: 3 },
  { navKey: 'suggestions', navName: '建议管理', isVisible: 1, sortOrder: 4 },
  { navKey: 'docs', navName: '文档管理', isVisible: 1, sortOrder: 5 },
  { navKey: 'config', navName: '系统配置', isVisible: 1, sortOrder: 6 },
  { navKey: 'database', navName: '数据库', isVisible: 1, sortOrder: 7 },
  { navKey: 'challenge', navName: 'K线征途', isVisible: 1, sortOrder: 8 },
  { navKey: 'ea', navName: 'EA管理', isVisible: 1, sortOrder: 9 },
];

// 获取导航配置
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查管理员权限
    const [adminUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id));

    if (adminUser?.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取导航配置
    const { data: config, error } = await supabase
      .from('admin_nav_config')
      .select('*')
      .order('sort_order');

    // 如果没有配置，初始化默认配置
    if (!config || config.length === 0) {
      await supabase.from('admin_nav_config').insert(DEFAULT_NAV_CONFIG);
      return NextResponse.json({
        config: DEFAULT_NAV_CONFIG.map(c => ({
          nav_key: c.navKey,
          nav_name: c.navName,
          is_visible: c.isVisible,
          sort_order: c.sortOrder,
        })),
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Get nav config error:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// 更新导航配置
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查管理员权限
    const [adminUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id));

    if (adminUser?.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { navKey, isVisible } = await request.json();

    if (!navKey) {
      return NextResponse.json({ error: '缺少导航键' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 检查配置是否存在
    const { data: existing } = await supabase
      .from('admin_nav_config')
      .select('*')
      .eq('nav_key', navKey)
      .single();

    if (existing) {
      // 更新
      await supabase
        .from('admin_nav_config')
        .update({ 
          is_visible: isVisible ? 1 : 0,
          updated_at: new Date().toISOString(),
        })
        .eq('nav_key', navKey);
    } else {
      // 插入
      const nav = DEFAULT_NAV_CONFIG.find(c => c.navKey === navKey);
      await supabase.from('admin_nav_config').insert({
        nav_key: navKey,
        nav_name: nav?.navName || navKey,
        is_visible: isVisible ? 1 : 0,
        sort_order: nav?.sortOrder || 0,
      });
    }

    return NextResponse.json({ success: true, message: '配置已更新' });
  } catch (error) {
    console.error('Update nav config error:', error);
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 });
  }
}
