import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ 
        success: false,
        announcement: null,
        error: '数据库连接失败' 
      }, { status: 500 });
    }
    
    const { data, error } = await supabase
      .from('challenge_announcement')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching announcement:', error);
      return NextResponse.json({ 
        success: false,
        announcement: null,
        error: '获取公告失败' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      announcement: data 
    });
  } catch (error) {
    console.error('Error in GET /api/admin/announcement:', error);
    return NextResponse.json({ 
      success: false,
      error: '服务器错误' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ 
        success: false,
        error: '无权限' 
      }, { status: 403 });
    }
    
    const body = await request.json();
    const { title, content, is_active } = body;
    
    if (!content) {
      return NextResponse.json({ 
        success: false,
        error: '公告内容不能为空' 
      }, { status: 400 });
    }
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ 
        success: false,
        error: '数据库连接失败' 
      }, { status: 500 });
    }
    
    // 先获取当前公告
    const { data: existing } = await supabase
      .from('challenge_announcement')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let result;
    
    if (existing) {
      // 更新现有公告
      const { data, error } = await supabase
        .from('challenge_announcement')
        .update({ 
          title: title || '公告',
          content,
          is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating announcement:', error);
        return NextResponse.json({ 
          success: false,
          error: '更新公告失败' 
        }, { status: 500 });
      }
      
      result = data;
    } else {
      // 创建新公告
      const { data, error } = await supabase
        .from('challenge_announcement')
        .insert({ 
          title: title || '公告',
          content,
          is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating announcement:', error);
        return NextResponse.json({ 
          success: false,
          error: '创建公告失败' 
        }, { status: 500 });
      }
      
      result = data;
    }
    
    return NextResponse.json({ 
      success: true,
      announcement: result
    });
  } catch (error) {
    console.error('Error in POST /api/admin/announcement:', error);
    return NextResponse.json({ 
      success: false,
      error: '服务器错误' 
    }, { status: 500 });
  }
}
