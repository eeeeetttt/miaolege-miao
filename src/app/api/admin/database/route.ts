import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { execSql } from '@/storage/database/exec-sql';

// 获取可管理的表列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const supabase = getSupabaseClient();

    // 如果没有指定表名，返回所有可管理的表
    if (!tableName) {
      // 获取所有用户创建的表（排除系统表）
      const sql = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'sql_%'
          AND table_name NOT LIKE 'pg_%'
        ORDER BY table_name
      `;
      
      try {
        const result = await execSql(sql);
        const tables = result.map((row: any) => row.table_name);
        
        // 获取每个表的记录数
        const tablesWithCounts = await Promise.all(
          tables.map(async (table: string) => {
            try {
              const countResult = await execSql(`SELECT COUNT(*) as count FROM "${table}"`);
              return {
                name: table,
                count: countResult[0]?.count || 0
              };
            } catch {
              return { name: table, count: 0 };
            }
          })
        );

        return NextResponse.json({
          success: true,
          tables: tablesWithCounts,
        });
      } catch (error) {
        console.error('Failed to get tables:', error);
        return NextResponse.json({
          success: true,
          tables: [],
        });
      }
    }

    // 获取指定表的数据
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取表结构
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    // 构建查询
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    // 添加排序
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // 添加分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: `查询失败: ${error.message}` }, { status: 500 });
    }

    // 获取关联的外键信息（简化处理）
    const foreignKeys: Record<string, string> = {};
    try {
      const fkResult = await execSql(`
        SELECT
          tc.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = '${tableName}'
      `);
      
      fkResult.forEach((fk: any) => {
        foreignKeys[fk.column_name] = `${fk.foreign_table_name}.${fk.foreign_column_name}`;
      });
    } catch {
      // 忽略外键查询错误
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      columns: columns || [],
      foreignKeys,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '操作失败'
    }, { status: 500 });
  }
}

// 添加/更新/删除数据
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const { action, table, data, id, ids } = await request.json();

    if (!table || !action) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 禁止操作的敏感表
    const protectedTables = ['users', 'admins', 'sessions', 'nextauth_tables'];
    if (protectedTables.includes(table)) {
      return NextResponse.json({ error: '禁止直接操作此表' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 添加数据
    if (action === 'insert') {
      // 移除 id 字段，让数据库自动生成
      const insertData = { ...data };
      delete insertData.id;
      
      const { error } = await supabase.from(table).insert(insertData);
      if (error) {
        return NextResponse.json({ error: `添加失败: ${error.message}` }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: '添加成功' });
    }

    // 更新数据
    if (action === 'update') {
      if (!id) {
        return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });
      }
      
      const { error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id);
      
      if (error) {
        return NextResponse.json({ error: `更新失败: ${error.message}` }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: '更新成功' });
    }

    // 删除数据
    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });
      }
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) {
        return NextResponse.json({ error: `删除失败: ${error.message}` }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: '删除成功' });
    }

    // 批量删除
    if (action === 'batch_delete') {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: '缺少记录ID列表' }, { status: 400 });
      }
      
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids);
      
      if (error) {
        return NextResponse.json({ error: `删除失败: ${error.message}` }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `成功删除 ${ids.length} 条记录` });
    }

    // 执行自定义 SQL（仅用于高级操作）
    if (action === 'execute_sql') {
      const { sql } = data;
      if (!sql || typeof sql !== 'string') {
        return NextResponse.json({ error: '缺少SQL语句' }, { status: 400 });
      }
      
      // 安全检查：只允许 SELECT, INSERT, UPDATE, DELETE
      const upperSql = sql.trim().toUpperCase();
      if (!upperSql.match(/^(SELECT|INSERT|UPDATE|DELETE|WITH)/)) {
        return NextResponse.json({ error: '只允许执行 SELECT/INSERT/UPDATE/DELETE 语句' }, { status: 403 });
      }
      
      try {
        const result = await execSql(sql);
        return NextResponse.json({ success: true, data: result });
      } catch (error: any) {
        return NextResponse.json({ error: `SQL执行失败: ${error.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Database operation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '操作失败'
    }, { status: 500 });
  }
}
