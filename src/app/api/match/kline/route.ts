import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { RowDataPacket, FieldPacket, ResultSetHeader } from 'mysql2/promise';

// 获取K线征途配置
async function getKlineConfig() {
  const [configs] = await pool.execute(
    `SELECT config_key, config_value FROM match_configs WHERE match_type = 'kline'`
  ) as [RowDataPacket[], FieldPacket[]];
  
  const configMap: Record<string, string> = {};
  configs.forEach(c => {
    configMap[c.config_key] = c.config_value || '';
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
    
    // 获取用户当前活跃的K线征途账户 - 使用原始SQL
    const [activeAccounts] = await pool.execute(
      `SELECT * FROM match_accounts WHERE user_id = ? AND match_type = 'kline' AND status = 'active' LIMIT 1`,
      [session.user.id]
    ) as [RowDataPacket[], FieldPacket[]];
    
    const currentAccount = activeAccounts[0];
    
    // 获取历史最佳记录
    const [bestRecords] = await pool.execute(
      `SELECT * FROM match_records WHERE user_id = ? AND match_type = 'kline' ORDER BY profit DESC LIMIT 1`,
      [session.user.id]
    ) as [RowDataPacket[], FieldPacket[]];
    
    // 检查用户是否有K线宗师称号
    const [titles] = await pool.execute(
      `SELECT * FROM user_titles WHERE user_id = ? AND title_id = 'kline_master' LIMIT 1`,
      [session.user.id]
    ) as [RowDataPacket[], FieldPacket[]];
    
    const levelTargets = config.levelTargets;
    const currentLevelNum = currentAccount ? Number(currentAccount.current_level) : 0;
    
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
    const activeAccountsFormatted = currentAccount ? [{
      accountId: currentAccount.id,
      matchType: 'kline',
      matchName: 'K线征途',
      balance: Number(currentAccount.current_balance),
      initialValue: Number(currentAccount.initial_capital),
      returnRate: parseFloat(((Number(currentAccount.current_balance) / Number(currentAccount.initial_capital) - 1) * 100).toFixed(2)),
      currentLevel: currentLevelNum,
      profit: Number(currentAccount.current_balance) - Number(currentAccount.initial_capital),
      status: currentAccount.status,
      position: currentPosition,
    }] : [];
    
    return NextResponse.json({
      config,
      status: {
        isActive: !!currentAccount,
        currentLevel: currentLevelNum,
        currentBalance: currentAccount ? Number(currentAccount.current_balance) : 0,
        targetBalance: currentAccount && currentLevelNum <= 10 
          ? levelTargets[currentLevelNum - 1] 
          : 0,
        maxLevel: 10,
        hasCompleted: titles.length > 0,
        bestLevel: bestRecords[0] ? Number(bestRecords[0].rank) : 0,
        position: currentPosition,
      },
      activeAccounts: activeAccountsFormatted,
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
    
    // 获取用户信息 - 使用 user_id 查询
    const userId = session.user.id;
    console.log('[K线征途] 用户ID:', userId);
    
    const [users] = await pool.execute(
      `SELECT * FROM user_accounts WHERE user_id = ?`,
      [userId]
    ) as [RowDataPacket[], FieldPacket[]];
    
    if (users.length === 0) {
      console.log('[K线征途] 用户不存在，ID:', userId);
      return NextResponse.json({ error: '用户账户不存在，请刷新页面重试' }, { status: 404 });
    }
    
    const user = users[0];
    
    // 检查是否有活跃账户
    const [activeAccounts] = await pool.execute(
      `SELECT * FROM match_accounts WHERE user_id = ? AND match_type = 'kline' AND status = 'active' LIMIT 1`,
      [userId]
    ) as [RowDataPacket[], FieldPacket[]];
    
    if (action === 'continue' || action === 'register') {
      // 继续/重新报名
      if (activeAccounts.length > 0) {
        return NextResponse.json({ 
          error: '已有进行中的挑战',
          account: {
            currentLevel: Number(activeAccounts[0].current_level),
            currentBalance: Number(activeAccounts[0].current_balance),
          }
        }, { status: 400 });
      }
      
      // 检查负债
      const userDebt = Number(user.total_debt || 0);
      if (userDebt > 0) {
        return NextResponse.json({ error: '负债必须为0才能报名K线征途' }, { status: 400 });
      }
      
      // 检查金币
      const userGold = user.gold_balance || 0;
      if (userGold < config.entryFeeGold) {
        return NextResponse.json({ error: `金币不足，需要${config.entryFeeGold}金币` }, { status: 400 });
      }
      
      // 检查银两
      const userCoin = Number(user.coin_balance || 0);
      if (userCoin < config.initialCapitalSilver) {
        return NextResponse.json({ error: `银两不足，需要${config.initialCapitalSilver}银两` }, { status: 400 });
      }
      
      // 扣除费用
      const matchId = `kline_${userId}_${Date.now()}`;
      
      // 事务操作
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        // 扣除金币和银两
        await connection.execute(
          `UPDATE user_accounts SET gold_balance = gold_balance - ?, coin_balance = coin_balance - ? WHERE user_id = ?`,
          [config.entryFeeGold, config.initialCapitalSilver, userId]
        );
        
        // 创建赛事账户
        await connection.execute(
          `INSERT INTO match_accounts (user_id, match_id, match_type, initial_capital, current_balance, current_level, status)
           VALUES (?, ?, 'kline', ?, ?, 1, 'active')`,
          [userId, matchId, config.initialCapitalSilver, config.initialCapitalSilver]
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
    
    if (action === 'continue_active') {
      // 继续挑战
      if (activeAccounts.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战' }, { status: 400 });
      }
      
      const account = activeAccounts[0];
      const currentLevel = Number(account.current_level);
      const levelTargets = config.levelTargets;
      const targetBalance = currentLevel <= 10 ? levelTargets[currentLevel - 1] : 0;
      
      return NextResponse.json({
        success: true,
        account: {
          currentLevel,
          currentBalance: Number(account.current_balance),
          targetBalance,
          initialCapital: Number(account.initial_capital),
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
        [userId]
      ) as [RowDataPacket[], FieldPacket[]];
      
      if (activeAccounts.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战账户' }, { status: 400 });
      }
      
      const account = activeAccounts[0];
      
      // 计算最大手数（杠杆500，保证金比例10%）
      const maxLots = Number(account.current_balance) / 100;
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
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        if (existingPositions.length > 0) {
          // 有未平仓位，判断是否可以加仓
          const existingPos = existingPositions[0];
          const currentTotalLots = Number(existingPos.lots) + actualLots;
          
          if (currentTotalLots > 10) {
            await connection.rollback();
            return NextResponse.json({ 
              error: `超过最大手数限制。当前${existingPos.lots}手，加上${actualLots}手共${currentTotalLots}手，最大10手` 
            }, { status: 400 });
          }
          
          if (existingPos.direction === direction) {
            // 同方向：加仓
            const newAvgPrice = (Number(existingPos.entry_price) * Number(existingPos.lots) + entryPrice * actualLots) / currentTotalLots;
            
            await connection.execute(
              `UPDATE match_positions SET lots = ?, entry_price = ? WHERE id = ?`,
              [currentTotalLots, newAvgPrice, existingPos.id]
            );
            
            // 冻结加仓保证金
            const addMargin = actualLots * 100 * leverage / 100;
            const newBalance = Number(account.current_balance) - addMargin;
            await connection.execute(
              `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
              [Math.max(0, newBalance), account.id]
            );
            
            // 记录加仓交易
            await connection.execute(
              `INSERT INTO match_trade_records (user_id, match_type, match_id, action, direction, lots, profit, balance_after)
               VALUES (?, 'kline', ?, 'add', ?, ?, 0, ?)`,
              [userId, account.match_id, direction, actualLots, Math.max(0, newBalance)]
            );
            
            await connection.commit();
            
            return NextResponse.json({ 
              success: true, 
              message: `加仓成功！当前持仓：${currentTotalLots}手，均价${newAvgPrice.toFixed(2)}`,
              position: { lots: currentTotalLots, avgPrice: newAvgPrice, direction }
            });
          } else {
            // 反方向：先平仓再反向开仓
            const closeLots = Number(existingPos.lots);
            const closePrice = entryPrice;
            const profit = direction === 'short' 
              ? (Number(existingPos.entry_price) - closePrice) * closeLots * 100
              : (closePrice - Number(existingPos.entry_price)) * closeLots * 100;
            const newBalance = Number(account.current_balance) + profit + (closeLots * 100 * leverage / 100);
            
            // 平仓
            await connection.execute(
              `UPDATE match_positions SET status = 'closed', exit_price = ?, closed_at = NOW() WHERE id = ?`,
              [closePrice, existingPos.id]
            );
            
            // 记录平仓交易
            await connection.execute(
              `INSERT INTO match_trade_records (user_id, match_type, match_id, action, direction, lots, profit, balance_after)
               VALUES (?, 'kline', ?, 'close', ?, ?, ?, ?)`,
              [userId, account.match_id, existingPos.direction, closeLots, profit, newBalance]
            );
            
            // 重新开仓
            const newMargin = actualLots * 100 * leverage / 100;
            const finalBalance = newBalance - newMargin;
            
            await connection.execute(
              `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
              [Math.max(0, finalBalance), account.id]
            );
            
            await connection.execute(
              `INSERT INTO match_positions (user_id, match_type, match_id, direction, lots, leverage, entry_price)
               VALUES (?, 'kline', ?, ?, ?, ?, ?)`,
              [userId, account.match_id, direction, actualLots, leverage, entryPrice]
            );
            
            await connection.execute(
              `INSERT INTO match_trade_records (user_id, match_type, match_id, action, direction, lots, profit, balance_after)
               VALUES (?, 'kline', ?, 'open', ?, ?, 0, ?)`,
              [userId, account.match_id, direction, actualLots, Math.max(0, finalBalance)]
            );
            
            await connection.commit();
            
            return NextResponse.json({ 
              success: true, 
              message: `平仓盈利${profit.toFixed(2)}，反向开仓成功！`,
              position: { lots: actualLots, avgPrice: entryPrice, direction }
            });
          }
        }
        
        // 无未平仓位，正常开仓
        // 冻结保证金（约10%）
        const margin = actualLots * 100 * leverage / 100;
        const newBalance = Number(account.current_balance) - margin;
        
        // 更新账户余额（扣除保证金）
        await connection.execute(
          `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
          [Math.max(0, newBalance), account.id]
        );
        
        // 保存持仓记录
        await connection.execute(
          `INSERT INTO match_positions (user_id, match_type, match_id, direction, lots, leverage, entry_price)
           VALUES (?, 'kline', ?, ?, ?, ?, ?)`,
          [userId, account.match_id, direction, actualLots, leverage, entryPrice]
        );
        
        // 记录交易
        await connection.execute(
          `INSERT INTO match_trade_records (user_id, match_type, match_id, action, direction, lots, profit, balance_after)
           VALUES (?, 'kline', ?, 'open', ?, ?, 0, ?)`,
          [userId, account.match_id, direction, actualLots, Math.max(0, newBalance)]
        );
        
        await connection.commit();
        
        // 查询最新的持仓信息
        const [newPositions] = await pool.execute(
          `SELECT * FROM match_positions WHERE user_id = ? AND match_type = 'kline' AND status = 'open' ORDER BY id DESC LIMIT 1`,
          [userId]
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
        [userId]
      ) as [RowDataPacket[], FieldPacket[]];
      
      if (positions.length === 0) {
        return NextResponse.json({ error: '没有未平仓位' }, { status: 400 });
      }
      
      const position = positions[0];
      
      if (activeAccounts.length === 0) {
        return NextResponse.json({ error: '没有进行中的挑战账户' }, { status: 400 });
      }
      
      const account = activeAccounts[0];
      
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
      const newBalance = Number(account.current_balance) + margin + profitAmount;
      
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
          [userId, account.match_id, position.direction, position.lots, profitAmount, Math.max(0, newBalance)]
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
    const userId = session.user.id;
    
    // 获取活跃账户
    const [activeAccounts] = await pool.execute(
      `SELECT * FROM match_accounts WHERE user_id = ? AND match_type = 'kline' AND status = 'active' LIMIT 1`,
      [userId]
    ) as [RowDataPacket[], FieldPacket[]];
    
    if (activeAccounts.length === 0) {
      return NextResponse.json({ error: '没有进行中的挑战' }, { status: 400 });
    }
    
    const account = activeAccounts[0];
    const currentLevel = Number(account.current_level);
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
          [rewardGold, userId]
        );
        
        // 添加称号
        try {
          await connection.execute(
            `INSERT IGNORE INTO user_titles (user_id, title_id, is_active) VALUES (?, 'kline_master', TRUE)`,
            [userId]
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
          [newBalance, userId]
        );
        
        // 记录
        await connection.execute(
          `INSERT INTO match_records (user_id, match_type, match_id, initial_capital, final_balance, profit, profit_rate, \`rank\`, reward_gold) VALUES (?, 'kline', ?, ?, ?, ?, ?, 10, ?)`,
          [userId, account.match_id, Number(account.initial_capital), newBalance, newBalance - Number(account.initial_capital), (newBalance / Number(account.initial_capital) - 1) * 100, rewardGold]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          message: `恭喜通关！获得${rewardGold}金币和"${rewardTitle}"称号！`,
          level: 10,
          completed: true,
          rewardGold,
          rewardTitle,
        });
      } else if (failed) {
        // 失败
        await connection.execute(
          `UPDATE match_accounts SET status = 'failed', current_balance = ?, ended_at = NOW() WHERE id = ?`,
          [newBalance, account.id]
        );
        
        // 记录
        await connection.execute(
          `INSERT INTO match_records (user_id, match_type, match_id, initial_capital, final_balance, profit, profit_rate, \`rank\`) VALUES (?, 'kline', ?, ?, ?, ?, ?, ?)`,
          [userId, account.match_id, Number(account.initial_capital), newBalance, newBalance - Number(account.initial_capital), (newBalance / Number(account.initial_capital) - 1) * 100, currentLevel]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          message: '挑战失败，余额低于最低要求',
          level: currentLevel,
          failed: true,
        });
      } else if (newLevel !== currentLevel) {
        // 升级
        await connection.execute(
          `UPDATE match_accounts SET current_balance = ?, current_level = ? WHERE id = ?`,
          [newBalance, newLevel, account.id]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          message: `恭喜进入第${newLevel}关！`,
          level: newLevel,
          targetBalance: levelTargets[newLevel - 1],
        });
      } else {
        // 正常更新
        await connection.execute(
          `UPDATE match_accounts SET current_balance = ? WHERE id = ?`,
          [newBalance, account.id]
        );
        
        await connection.commit();
        
        return NextResponse.json({
          success: true,
          level: currentLevel,
          balance: newBalance,
          targetBalance,
        });
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[K线] Update balance error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: '更新失败: ' + message }, { status: 500 });
  }
}
