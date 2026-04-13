import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import { eq, desc, asc, and } from 'drizzle-orm';

// 获取文档列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const slug = searchParams.get('slug');

    // 获取单个文档
    if (slug) {
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.slug, slug))
        .limit(1);

      if (!doc) {
        return NextResponse.json({ error: '文档不存在' }, { status: 404 });
      }

      // 增加浏览次数
      await db
        .update(documents)
        .set({ viewCount: (doc.viewCount || 0) + 1 })
        .where(eq(documents.id, doc.id));

      return NextResponse.json({ document: doc });
    }

    // 获取文档列表
    let docs;
    if (category) {
      docs = await db
        .select()
        .from(documents)
        .where(and(
          eq(documents.status, 'published'),
          eq(documents.category, category)
        ))
        .orderBy(asc(documents.sortOrder), desc(documents.createdAt));
    } else {
      docs = await db
        .select()
        .from(documents)
        .where(eq(documents.status, 'published'))
        .orderBy(asc(documents.sortOrder), desc(documents.createdAt));
    }

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json({ error: '获取文档失败' }, { status: 500 });
  }
}
