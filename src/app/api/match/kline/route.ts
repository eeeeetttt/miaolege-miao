import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { matchAccounts, matchConfigs, matchRecords, userTitles, titles, userAccounts } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { RowDataPacket, FieldPacket } from 'mysql2/promise';

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
    
    // 获取用户当前持仓
    let currentPosition = null;
    if (currentAccount) {
      const [positions] = await pool.execute(
        `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'kline' AND status = 'open' ORDER BY id DESC LIMIT 1`,
        [session.user.id]
      ) as [RowDataPacket[], FieldPacket[]];
      if (positions.length > 0) {
        currentPosition = {
          direction: positions[0].direction,
          lots: Number(positions[0].lots),
          leverage: Number(positions[0].leverage),
          entryPrice: Number(positions[0].entry_price),
          margin: Number(positions[0].lots) * 100 * (Number(positions[0].leverage) || 500) / 100
        };
      }
    }
    
    // 格式化活跃账户列表（供统一交易面板使用）
    const activeAccounts = currentAccount ? [{
      accountId: currentAccount.id,
      matchType: 'kline',
      matchName: 'K线征途',
      balance: Number(currentAccount.currentBalance),
      initialValue: Number(currentAccount.initialCapital),
      returnRate: parseFloat(((Number(currentAccount.currentBalance) / Number(currentAccount.initialCapital) - 1) * 100).toFixed(2)),
      currentLevel: currentLevelNum,
      profit: Number(currentAccount.currentBalance) - Number(currentAccount.initialCapital),
      status: currentAccount.status,
      position: currentPosition,
    }] : [];
    
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
        position: currentPosition,
      },
      activeAccounts,
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
    
    // 获取用户信息 - 使用 email 查询
    const userEmail = session.user.email as string;
    console.log('[K线征途] 用户邮箱:', userEmail);
    
    let user: any;
    try {
      const users = await db
        .select()
        .from(userAccounts)
        .where(eq(userAccounts.email, userEmail));
      user = users[0];
      console.log('[K线征途] 查询结果:', user ? `找到用户 ${user.name}` : '未找到用户');
    } catch (err: any) {
      console.error('[K线征途] 查询用户失败:', err.message);
      return NextResponse.json({ error: '查询用户失败: ' + err.message }, { status: 500 });
    }
    
    if (!user) {
      console.log('[K线征途] 用户不存在，邮箱:', userEmail);
      return NextResponse.json({ error: '用户账户不存在，请刷新页面重试' }, { status: 404 });
    }
    
    // 检查是否有活跃账户
    const activeAccount = await db
      .select()
      .from(matchAccounts)
      .where(and(
        eq(matchAccounts.userId, user.userId),
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
    
    if (action === 'trade') {
      // 开仓交易
      const { direction, lots = 0.1, leverage = 500 } = body;
      
      if (!['long', 'short'].includes(direction)) {
        return NextResponse.json({ error: '无效的交易方向' }, { status: 400 });
      }
      
      // 检查是否有未平仓位
      const [existingPositions] = await pool.execute(
        `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'kline' AND status = 'open'`,
        [session.user.id]
      ) as [RowDataPacket[], FieldPacket[]];
      
      if (existingPositions.length > 0) {
        return NextResponse.json({ error: '已有未平仓位，请先平仓' }, { status: 400 });
      }
      
      if (!activeAccount || activeAccount.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战账户' }, { status: 400 });
      }
      
      const account = activeAccount[0];
      
      // 计算最大手数（杠杆500，保证金比例10%）
      const maxLots = Number(account.currentBalance) / 100;
      const actualLots = Math.min(lots, maxLots, 10); // 最大10手
      
      if (actualLots < 0.01) {
        return NextResponse.json({ error: '余额不足，无法开仓' }, { status: 400 });
      }
      
      // 获取当前金价
      let entryPrice = 0;
      try {
        const priceRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:5000'}/api/gold-price`);
        const priceData = await priceRes.json();
        if (priceData.success && priceData.data) {
          entryPrice = priceData.data.price;
        } else {
          entryPrice = 3300 + Math.random() * 100;
        }
      } catch {
        entryPrice = 3300 + Math.random() * 100;
      }
      
      // 冻结保证金（约10%）
      const margin = actualLots * 100 * leverage / 100;
      const newBalance = Number(account.currentBalance) - margin;
      
      // 更新数据库
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        // 更新账户余额（扣除保证金）
        await connection.execute(
          `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
          [Math.max(0, newBalance), account.id]
        );
        
        // 保存持仓记录
        await connection.execute(
          `INSERT INTO match_positions (user_id, match_type, match_id, direction, lots, leverage, entry_price)
           VALUES (?, 'kline', ?, ?, ?, ?, ?)`,
          [session.user.id, account.matchId, direction, actualLots, leverage, entryPrice]
        );
        
        // 记录交易
        await connection.execute(
          `INSERT INTO match_trade_records (user_id, match_type, match_id, action, direction, lots, profit, balance_after)
           VALUES (?, 'kline', ?, 'open', ?, ?, 0, ?)`,
          [session.user.id, account.matchId, direction, actualLots, Math.max(0, newBalance)]
        );
        
        await connection.commit();
        
        // 查询最新的持仓信息
        const [newPositions] = await pool.execute(
          `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'kline' AND status = 'open' ORDER BY id DESC LIMIT 1`,
          [session.user.id]
        ) as [RowDataPacket[], FieldPacket[]];
        
        return NextResponse.json({
          success: true,
          message: `${direction === 'long' ? '做多' : '做空'}成功，开仓价：${entryPrice.toFixed(2)}`,
          position: newPositions[0] || {
            direction,
            lots: actualLots,
            leverage,
            entryPrice,
            margin
          },
          balance: Math.max(0, newBalance)
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
    
    if (action === 'close') {
      // 平仓操作
      const [positions] = await pool.execute(
        `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'kline' AND status = 'open' ORDER BY id DESC LIMIT 1`,
        [session.user.id]
      ) as [RowDataPacket[], FieldPacket[]];
      
      if (positions.length === 0) {
        return NextResponse.json({ error: '没有未平仓位' }, { status: 400 });
      }
      
      const position = positions[0];
      
      if (!activeAccount || activeAccount.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战账户' }, { status: 400 });
      }
      
      const account = activeAccount[0];
      
      // 获取当前金价
      let currentPrice = 0;
      try {
        const priceRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:5000'}/api/gold-price`);
        const priceData = await priceRes.json();
        if (priceData.success && priceData.data) {
          currentPrice = priceData.data.price;
        } else {
          currentPrice = 3300 + Math.random() * 100;
        }
      } catch {
        currentPrice = 3300 + Math.random() * 100;
      }
      
      // 计算盈亏
      const priceChange = currentPrice - Number(position.entry_price);
      const profit = position.direction === 'long' ? priceChange : -priceChange;
      const profitAmount = profit * Number(position.lots) * 100; // 每手100盎司
      
      // 保证金返还 + 盈亏
      const margin = Number(position.lots) * 100 * (Number(position.leverage) || 500) / 100;
      const newBalance = Number(account.currentBalance) + margin + profitAmount;
      
      // 更新数据库
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        // 更新账户余额
        await connection.execute(
          `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
          [Math.max(0, newBalance), account.id]
        );
        
        // 关闭持仓
        await connection.execute(
          `UPDATE match_positions SET status = 'closed', closed_at = NOW() WHERE id = ?`,
          [position.id]
        );
        
        // 记录平仓交易
        await connection.execute(
          `INSERT INTO match_trade_records (user_id, match_type, match_id, action, direction, lots, profit, balance_after)
           VALUES (?, 'kline', ?, 'close', ?, ?, ?, ?)`,
          [session.user.id, account.matchId, position.direction, position.lots, profitAmount, Math.max(0, newBalance)]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          message: `平仓成功，盈亏：${profitAmount >= 0 ? '+' : ''}${profitAmount.toFixed(2)}`,
          trade: {
            direction: position.direction,
            lots: position.lots,
            entryPrice: position.entry_price,
            exitPrice: currentPrice,
            profit: profitAmount,
            newBalance: Math.max(0, newBalance)
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
    
    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('[K线] Action error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: '操作失败: ' + message }, { status: 500 });
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
