import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const [rows] = await pool.query(
      `SELECT ct.*, 
        (SELECT name FROM user_accounts WHERE user_id = ct.from_user_id) as from_name,
        (SELECT name FROM user_accounts WHERE user_id = ct.to_user_id) as to_name
       FROM coin_transfers ct
       WHERE ct.from_user_id = ? OR ct.to_user_id = ?
       ORDER BY ct.created_at DESC
       LIMIT 50`,
      [userId, userId]
    ) as [any[], any];

    return NextResponse.json({ transfers: rows });
  } catch (error: any) {
    console.error('获取转账记录失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { targetUserId, amount } = await request.json();
    const fromUserId = session.user.id;

    if (!targetUserId || !amount || amount <= 0) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    // 检查余额
    const [balanceRows] = await pool.query(
      'SELECT coin_balance FROM user_accounts WHERE user_id = ?',
      [fromUserId]
    ) as [any[], any];

    if (balanceRows.length === 0 || balanceRows[0].coin_balance < amount) {
      return NextResponse.json({ error: '余额不足' }, { status: 400 });
    }

    // 执行转账
    const transferId = `TR${Date.now()}`;
    await pool.query('START TRANSACTION');
    
    await pool.query(
      'UPDATE user_accounts SET coin_balance = coin_balance - ? WHERE user_id = ?',
      [amount, fromUserId]
    );
    await pool.query(
      'UPDATE user_accounts SET coin_balance = coin_balance + ? WHERE user_id = ?',
      [amount, targetUserId]
    );
    await pool.query(
      `INSERT INTO coin_transfers (id, from_user_id, to_user_id, amount, status, created_at)
       VALUES (?, ?, ?, ?, 'completed', NOW())`,
      [transferId, fromUserId, targetUserId, amount]
    );
    
    await pool.query('COMMIT');

    return NextResponse.json({ success: true, message: '转账成功' });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('转账失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
