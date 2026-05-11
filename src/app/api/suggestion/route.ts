import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取建议列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    const [countResult] = await pool.query('SELECT COUNT(*) as cnt FROM suggestions') as [any[], any];
    const total = countResult[0]?.cnt || 0;

    const [rows] = await pool.query(
      `SELECT s.*, ua.name as user_name 
       FROM suggestions s 
       JOIN user_accounts ua ON s.user_id = ua.user_id 
       ORDER BY s.created_at DESC 
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    ) as [any[], any];

    return NextResponse.json({
      list: rows,
      total,
      page,
      pageSize
    });
  } catch (error: any) {
    console.error('获取建议列表失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 提交建议
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { content } = await request.json();
    const userId = session.user.id;

    if (!content || content.trim().length < 10) {
      return NextResponse.json({ error: '建议内容至少10个字符' }, { status: 400 });
    }

    const suggestionId = `SUG${Date.now()}`;
    await pool.query(
      'INSERT INTO suggestions (id, user_id, content, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [suggestionId, userId, content, 'pending']
    );

    return NextResponse.json({ success: true, message: '建议提交成功' });
  } catch (error: any) {
    console.error('提交建议失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
