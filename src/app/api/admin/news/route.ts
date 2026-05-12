import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// 获取新闻列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * pageSize;

    const [newsRows] = await pool.execute(
      `SELECT id, title, content, summary, category, source, image_url, is_published, view_count, created_at, updated_at 
       FROM news 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM news`
    );

    return NextResponse.json({
      success: true,
      data: newsRows,
      total: (countRows as any[])[0]?.total || 0,
      page,
      pageSize
    });
  } catch (error: any) {
    console.error('获取新闻失败:', error);
    return NextResponse.json({ success: false, error: '获取新闻失败: ' + (error?.message || String(error)), data: [] });
  }
}

// 创建或更新新闻
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, summary, category, source, image_url, is_published } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: '标题不能为空' });
    }

    if (id) {
      // 更新
      await pool.execute(
        `UPDATE news SET title = ?, content = ?, summary = ?, category = ?, source = ?, image_url = ?, is_published = ?, updated_at = NOW() WHERE id = ?`,
        [title, content || '', summary || '', category || 'general', source || 'AI生成', image_url || '', is_published ?? true, id]
      );
      return NextResponse.json({ success: true, message: '新闻已更新', id });
    } else {
      // 创建
      const [result] = await pool.execute(
        `INSERT INTO news (title, content, summary, category, source, image_url, is_published, view_count, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        [title, content || '', summary || '', category || 'general', source || 'AI生成', image_url || '', is_published ?? true]
      );
      const insertId = (result as any).insertId;
      return NextResponse.json({ success: true, message: '新闻已创建', id: insertId });
    }
  } catch (error) {
    console.error('保存新闻失败:', error);
    return NextResponse.json({ success: false, error: '保存新闻失败' });
  }
}

// 删除新闻
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少新闻ID' });
    }

    await pool.execute(`DELETE FROM news WHERE id = ?`, [id]);
    return NextResponse.json({ success: true, message: '新闻已删除' });
  } catch (error) {
    console.error('删除新闻失败:', error);
    return NextResponse.json({ success: false, error: '删除新闻失败' });
  }
}
