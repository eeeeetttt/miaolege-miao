import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取挑战赛申请列表
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询
    let sql = `SELECT cr.*, ua.name as user_name, ua.email as user_email 
               FROM challenge_registrations cr
               LEFT JOIN user_accounts ua ON cr.user_id = ua.user_id
               WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      sql += ` AND cr.status = ?`;
      params.push(status);
    }

    // 获取总数
    const [countRows] = await pool.query(sql.replace('cr.*, ua.name as user_name, ua.email as user_email', 'COUNT(*) as total'), params);
    const total = (countRows as any)[0]?.total || 0;

    // 获取分页数据
    sql += ` ORDER BY cr.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);

    return NextResponse.json({
      registrations: rows,
      total,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('获取挑战赛申请列表失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新挑战赛申请状态
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, registration_id, ...data } = body;

    if (!registration_id) {
      return NextResponse.json({ error: '缺少申请ID' }, { status: 400 });
    }

    switch (action) {
      case 'approve': {
        // 审核通过
        const { server, account, password, level_id } = data;
        await pool.query(
          `UPDATE challenge_registrations 
           SET status = 'approved', server = ?, mt_account = ?, mt_password = ?, level_id = ?, reviewed_by = ?, reviewed_at = NOW()
           WHERE id = ?`,
          [server, account, password, level_id || 1, session.user.id, registration_id]
        );
        return NextResponse.json({ success: true, message: '审核通过' });
      }

      case 'reject': {
        // 审核拒绝
        const { reject_reason } = data;
        await pool.query(
          `UPDATE challenge_registrations 
           SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = NOW()
           WHERE id = ?`,
          [reject_reason || '', session.user.id, registration_id]
        );
        return NextResponse.json({ success: true, message: '已拒绝' });
      }

      case 'activate': {
        // 激活挑战
        await pool.query(
          `UPDATE challenge_registrations SET status = 'active', activated_at = NOW() WHERE id = ?`,
          [registration_id]
        );
        return NextResponse.json({ success: true, message: '已激活' });
      }

      case 'fail': {
        // 标记失败
        const { fail_reason } = data;
        await pool.query(
          `UPDATE challenge_registrations 
           SET status = 'failed', fail_reason = ?, failed_at = NOW()
           WHERE id = ?`,
          [fail_reason || '', registration_id]
        );
        return NextResponse.json({ success: true, message: '已标记失败' });
      }

      case 'complete': {
        // 标记通关
        await pool.query(
          `UPDATE challenge_registrations 
           SET status = 'completed', completed_at = NOW()
           WHERE id = ?`,
          [registration_id]
        );
        return NextResponse.json({ success: true, message: '已标记通关' });
      }

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('更新挑战赛申请失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
