import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import { eq, desc, asc, like, or, and } from 'drizzle-orm';

// 获取文档列表（管理端）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let docs;
    if (search) {
      docs = await db
        .select()
        .from(documents)
        .where(
          or(
            like(documents.title, `%${search}%`),
            like(documents.content, `%${search}%`)
          )
        )
        .orderBy(asc(documents.sortOrder), desc(documents.createdAt));
    } else {
      docs = await db
        .select()
        .from(documents)
        .orderBy(asc(documents.sortOrder), desc(documents.createdAt));
    }

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error('Get admin documents error:', error);
    return NextResponse.json({ error: '获取文档失败' }, { status: 500 });
  }
}

// 创建文档
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { title, slug, content, category, sortOrder, status } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ error: '标题、别名和内容为必填项' }, { status: 400 });
    }

    // 检查slug是否已存在
    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.slug, slug))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: '别名已存在，请更换' }, { status: 400 });
    }

    await db.insert(documents).values({
      title,
      slug,
      content,
      category: category || 'general',
      sortOrder: sortOrder || 0,
      status: status || 'published',
    });

    // 获取刚创建的文档
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.slug, slug))
      .limit(1);

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json({ error: '创建文档失败' }, { status: 500 });
  }
}

// 更新文档
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, slug, content, category, sortOrder, status } = body;

    if (!id) {
      return NextResponse.json({ error: '文档ID为必填项' }, { status: 400 });
    }

    // 检查slug是否与其他文档冲突
    if (slug) {
      const [existing] = await db
        .select()
        .from(documents)
        .where(and(
          eq(documents.slug, slug),
          eq(documents.id, id)
        ))
        .limit(1);

      // 如果找到了其他文档使用相同slug
      if (!existing) {
        const [otherDoc] = await db
          .select()
          .from(documents)
          .where(eq(documents.slug, slug))
          .limit(1);
        
        if (otherDoc && otherDoc.id !== id) {
          return NextResponse.json({ error: '别名已存在，请更换' }, { status: 400 });
        }
      }
    }

    await db
      .update(documents)
      .set({
        ...(title && { title }),
        ...(slug && { slug }),
        ...(content && { content }),
        ...(category && { category }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(status && { status }),
      })
      .where(eq(documents.id, id));

    // 获取更新后的文档
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({ error: '更新文档失败' }, { status: 500 });
  }
}

// 删除文档
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '文档ID为必填项' }, { status: 400 });
    }

    await db.delete(documents).where(eq(documents.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: '删除文档失败' }, { status: 500 });
  }
}
