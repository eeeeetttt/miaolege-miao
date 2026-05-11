import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM complaints ORDER BY created_at DESC LIMIT 50'
    ) as [any[], any];
    return NextResponse.json({ complaints: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { content } = await request.json();
    const complaintId = `CP${Date.now()}`;
    
    await pool.query(
      'INSERT INTO complaints (id, user_id, content, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [complaintId, session.user.id, content, 'pending']
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
