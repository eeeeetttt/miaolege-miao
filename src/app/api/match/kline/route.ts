import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { matchAccounts, matchConfigs, matchRecords, userTitles, titles, userAccounts } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

// 获取K线征途配置
async function getKlineConfig() {
  const configs = await db
    .select()
    .from(matchConfigs)
    .where(eq(matchConfigs.matchType, 'kline'));
  
  const configMap: Record<string, string> = {};
  configs.forEach(c => {
    configMap[c.configKey] = c.configValue || '';
  });
  
  return {
    entryFeeGold: parseInt(configMap.entry_fee_gold || '200'),
    initialCapitalSilver: parseFloat(configMap.initial_capital_silver || '1000'),
    levelTargets: JSON.parse(configMap.level_targets || '[1100,1200,1300,1400,1500,1600,1700,1800,1900,2000]'),
    failThreshold: parseFloat(configMap.fail_threshold || '100'),
    completionRewardGold: parseInt(configMap.completion_reward_gold || '3000'),
    completionTitle: configMap.completion_title || 'K线宗师',
    enabled: configMap.enabled === 'true',
  };
}

// 获取用户K线征途状态
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  try {
    const config = await getKlineConfig();
    
    // 获取用户当前活跃的K线征途账户
    const activeAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'kline'),
        eq(matchAccounts.status, 'active')
      ))
      .limit(1);
    
    // 获取历史最佳记录
    const bestRecord = await db
      .select()
      .from(matchRecords)
      .where(and(
        eq(matchRecords.userId, session.user.id),
        eq(matchRecords.matchType, 'kline')
      ))
      .orderBy(desc(matchRecords.profit))
      .limit(1);
    
    // 检查用户是否有K线宗师称号
    const hasTitle = await db
      .select()
      .from(userTitles)
      .where(and(
        eq(userTitles.userId, session.user.id),
        eq(userTitles.titleId, 'kline_master')
      ))
      .limit(1);
    
    const currentAccount = activeAccount[0];
    const levelTargets = config.levelTargets;
    const currentLevelNum = currentAccount ? Number(currentAccount.currentLevel) : 0;
    
    return NextResponse.json({
      config,
      status: {
        isActive: !!currentAccount,
        currentLevel: currentLevelNum,
        currentBalance: currentAccount ? Number(currentAccount.currentBalance) : 0,
        targetBalance: currentAccount && currentLevelNum <= 10 
          ? levelTargets[currentLevelNum - 1] 
          : 0,
        maxLevel: 10,
        hasCompleted: hasTitle.length > 0,
        bestLevel: bestRecord[0] ? Number(bestRecord[0].rank) : 0,
      }
    });
  } catch (error) {
    console.error('Get K-line status error:', error);
    return NextResponse.json({ error: '获取状态失败' }, { status: 500 });
  }
}

// K线征途报名或继续
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { action } = body;
    
    const config = await getKlineConfig();
    
    if (!config.enabled) {
      return NextResponse.json({ error: 'K线征途已关闭' }, { status: 400 });
    }
    
    // 获取用户信息
    const userId = session.user.id as string;
    console.log('[K线征途] 用户ID:', userId);
    
    let user: any;
    try {
      const users = await db
        .select()
        .from(userAccounts)
        .where(eq(userAccounts.userId, userId));
      user = users[0];
      console.log('[K线征途] 查询结果:', user ? '找到用户' : '未找到用户');
    } catch (err: any) {
      console.error('[K线征途] 查询用户失败:', err.message, err.stack);
      return NextResponse.json({ error: '查询用户失败: ' + err.message }, { status: 500 });
    }
    
    if (!user) {
      console.log('[K线征途] 用户不存在，userId:', userId);
      return NextResponse.json({ error: '用户账户不存在，请刷新页面重试' }, { status: 404 });
    }
    
    // 检查是否有活跃账户
    const activeAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'kline'),
        eq(matchAccounts.status, 'active')
      ))
      .limit(1);
    
    if (action === 'continue' || action === 'register') {
      // 继续/重新报名
      if (activeAccount.length > 0) {
        return NextResponse.json({ 
          error: '已有进行中的挑战',
          account: {
            currentLevel: Number(activeAccount[0].currentLevel),
            currentBalance: Number(activeAccount[0].currentBalance),
          }
        }, { status: 400 });
      }
      
      // 检查负债
      const userDebt = Number(user.totalDebt || 0);
      if (userDebt > 0) {
        return NextResponse.json({ error: '负债必须为0才能报名K线征途' }, { status: 400 });
      }
      
      // 检查金币
      const userGold = user.goldBalance || 0;
      if (userGold < config.entryFeeGold) {
        return NextResponse.json({ error: `金币不足，需要${config.entryFeeGold}金币` }, { status: 400 });
      }
      
      // 检查银两
      const userCoin = Number(user.coinBalance || 0);
      if (userCoin < config.initialCapitalSilver) {
        return NextResponse.json({ error: `银两不足，需要${config.initialCapitalSilver}银两` }, { status: 400 });
      }
      
      // 扣除费用
      const matchId = `kline_${session.user.id}_${Date.now()}`;
      
      // 事务操作
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        // 扣除金币和银两
        await connection.execute(
          `UPDATE user_accounts SET gold_balance = gold_balance - ?, coin_balance = coin_balance - ? WHERE user_id = ?`,
          [config.entryFeeGold, config.initialCapitalSilver, session.user.id]
        );
        
        // 创建赛事账户
        await connection.execute(
          `INSERT INTO match_accounts (user_id, match_id, match_type, initial_capital, current_balance, current_level, status)
           VALUES (?, ?, 'kline', ?, ?, 1, 'active')`,
          [session.user.id, matchId, config.initialCapitalSilver, config.initialCapitalSilver]
        );
        
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
      return NextResponse.json({
        success: true,
        message: '报名成功，开始第1关',
        account: {
          currentLevel: 1,
          currentBalance: config.initialCapitalSilver,
          targetBalance: config.levelTargets[0],
        }
      });
    }
    
    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('K-line action error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// 更新净值（模拟交易后调用）
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { newBalance } = body;
    
    if (typeof newBalance !== 'number' || newBalance < 0) {
      return NextResponse.json({ error: '无效的净值' }, { status: 400 });
    }
    
    const config = await getKlineConfig();
    
    // 获取活跃账户
    const activeAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, session.user.id),
        eq(matchAccounts.matchType, 'kline'),
        eq(matchAccounts.status, 'active')
      ))
      .limit(1);
    
    if (activeAccount.length === 0) {
      return NextResponse.json({ error: '没有进行中的挑战' }, { status: 400 });
    }
    
    const account = activeAccount[0];
    const currentLevel = Number(account.currentLevel);
    const levelTargets = config.levelTargets;
    const targetBalance = levelTargets[currentLevel - 1];
    
    // 检查是否通关当前关
    let newLevel = currentLevel;
    let completed = false;
    let failed = false;
    let rewardGold = 0;
    let rewardTitle = '';
    
    // 检查失败
    if (newBalance < config.failThreshold) {
      failed = true;
    }
    // 检查通关
    else if (newBalance >= targetBalance) {
      if (currentLevel >= 10) {
        // 全部通关
        completed = true;
        rewardGold = config.completionRewardGold;
        rewardTitle = config.completionTitle;
      } else {
        // 进入下一关
        newLevel = currentLevel + 1;
      }
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      if (completed) {
        // 通关奖励
        await connection.execute(
          `UPDATE user_accounts SET gold_balance = gold_balance + ? WHERE user_id = ?`,
          [rewardGold, session.user.id]
        );
        
        // 添加称号
        try {
          await connection.execute(
            `INSERT IGNORE INTO user_titles (user_id, title_id, is_active) VALUES (?, 'kline_master', TRUE)`,
            [session.user.id]
          );
        } catch {}
        
        // 更新账户状态
        await connection.execute(
          `UPDATE match_accounts SET status = 'completed', current_balance = ?, current_level = ?, ended_at = NOW() WHERE id = ?`,
          [newBalance, 10, account.id]
        );
        
        // 退还余额
        await connection.execute(
          `UPDATE user_accounts SET coin_balance = coin_balance + ? WHERE user_id = ?`,
          [newBalance, session.user.id]
        );
        
        // 记录
        await connection.execute(
          `INSERT INTO match_records (user_id, match_type, match_id, initial_capital, final_balance, profit, profit_rate, \`rank\`, reward_gold) VALUES (?, 'kline', ?, ?, ?, ?, ?, 10, ?)`,
          [session.user.id, account.matchId, Number(account.initialCapital), newBalance, newBalance - Number(account.initialCapital), (newBalance / Number(account.initialCapital) - 1) * 100, rewardGold]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          message: `恭喜通关！获得${rewardGold}金币和"${rewardTitle}"称号！`,
          result: {
            completed: true,
            finalBalance: newBalance,
            rewardGold,
            rewardTitle,
          }
        });
      }
      
      if (failed) {
        // 失败处理
        await connection.execute(
          `UPDATE match_accounts SET status = 'failed', current_balance = ?, ended_at = NOW() WHERE id = ?`,
          [newBalance, account.id]
        );
        
        // 退还余额（可能小于本金）
        await connection.execute(
          `UPDATE user_accounts SET coin_balance = coin_balance + ? WHERE user_id = ?`,
          [newBalance, session.user.id]
        );
        
        // 记录
        await connection.execute(
          `INSERT INTO match_records (user_id, match_type, match_id, initial_capital, final_balance, profit, profit_rate, \`rank\`) VALUES (?, 'kline', ?, ?, ?, ?, ?, ?)`,
          [session.user.id, account.matchId, Number(account.initialCapital), newBalance, newBalance - Number(account.initialCapital), (newBalance / Number(account.initialCapital) - 1) * 100, currentLevel]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          message: `挑战失败，净值${newBalance}已退还`,
          result: {
            failed: true,
            finalBalance: newBalance,
          }
        });
      }
      
      // 正常状态，更新净值
      await connection.execute(
        `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
        [newBalance, account.id]
      );
      
      await connection.commit();
      
      return NextResponse.json({
        success: true,
        result: {
          currentLevel: newLevel,
          currentBalance: newBalance,
          targetBalance: levelTargets[newLevel - 1],
          isCompleted: false,
          isFailed: false,
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update K-line balance error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
