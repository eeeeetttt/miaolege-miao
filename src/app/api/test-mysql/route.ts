import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userAccounts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // 测试查询
    const users = await db.select().from(userAccounts).limit(5);
    
    return NextResponse.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        userId: u.userId,
        email: u.email,
        name: u.name,
        role: u.role
      }))
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
