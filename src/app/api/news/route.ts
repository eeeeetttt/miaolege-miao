import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// 获取新闻列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;
    const category = searchParams.get('category');

    let whereClause = '';
    let params: any[] = [];
    if (category) {
      whereClause = 'WHERE category = ?';
      params.push(category);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as cnt FROM news ${whereClause}`,
      params
    ) as [any[], any];
    const total = countResult[0]?.cnt || 0;

    const [rows] = await pool.query(
      `SELECT * FROM news ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    ) as [any[], any];

    return NextResponse.json({ list: rows, total, page, pageSize });
  } catch (error: any) {
    console.error('获取新闻失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 创建新闻（管理员）
export async function POST(request: NextRequest) {
  try {
    const { title, content, summary, category, coverImage } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    const newsId = `NEWS${Date.now()}`;
    await pool.query(
      `INSERT INTO news (id, title, content, summary, category, cover_image, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [newsId, title, content, summary || '', category || 'general', coverImage || '']
    );

    return NextResponse.json({ success: true, id: newsId });
  } catch (error: any) {
    console.error('创建新闻失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
