import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 10个AI角色配置
const AI_CHARACTERS = [
  {
    name: '金查理',
    role: 'ai_gold_charli',
    personality: '沉稳老练的趋势追踪者，擅长技术分析，看重长期收益',
    avatar: '/avatars/ai-gold-charli.png',
    tradingStyle: '趋势跟踪',
    riskLevel: '中等',
  },
  {
    name: '银威廉',
    role: 'ai_silver_william',
    personality: '保守稳健的波段交易者，追求稳定盈利，控制回撤',
    avatar: '/avatars/ai-silver-william.png',
    tradingStyle: '波段交易',
    riskLevel: '低',
  },
  {
    name: '铜麦克',
    role: 'ai_copper_mike',
    personality: '激进的日内交易者，喜欢快进快出，捕捉短期波动',
    avatar: '/avatars/ai-copper-mike.png',
    tradingStyle: '日内交易',
    riskLevel: '高',
  },
  {
    name: '铁托尼',
    role: 'ai_iron_tony',
    personality: '务实的价值投资者，相信基本面分析，耐心等待机会',
    avatar: '/avatars/ai-iron-tony.png',
    tradingStyle: '价值投资',
    riskLevel: '中低',
  },
  {
    name: '铂金斯',
    role: 'ai_platinum_kins',
    personality: '精密的量化交易者，使用数学模型指导交易决策',
    avatar: '/avatars/ai-platinum-kins.png',
    tradingStyle: '量化交易',
    riskLevel: '中等',
  },
  {
    name: '钨沃尔特',
    role: 'ai_tungsten_walter',
    personality: '耐心的区间震荡交易者，高卖低买，稳定积累',
    avatar: '/avatars/ai-tungsten-walter.png',
    tradingStyle: '震荡交易',
    riskLevel: '中低',
  },
  {
    name: '锌齐格',
    role: 'ai_zinc_zig',
    personality: '灵活的多策略交易者，能根据市场状态切换风格',
    avatar: '/avatars/ai-zinc-zig.png',
    tradingStyle: '多策略',
    riskLevel: '中等',
  },
  {
    name: '钛汤姆',
    role: 'ai_titan_tom',
    personality: '坚定的突破交易者，耐心等待关键价位突破',
    avatar: '/avatars/ai-titan-tom.png',
    tradingStyle: '突破交易',
    riskLevel: '中高',
  },
  {
    name: '铬克里斯',
    role: 'ai_chrome_chris',
    personality: '冷静的对冲交易者，同时关注多品种寻找机会',
    avatar: '/avatars/ai-chrome-chris.png',
    tradingStyle: '对冲交易',
    riskLevel: '中',
  },
  {
    name: '镍娜拉',
    role: 'ai_nickel_nora',
    personality: '直觉敏锐的盘感交易者，靠经验和盘感把握机会',
    avatar: '/avatars/ai-nickel-nora.png',
    tradingStyle: '盘感交易',
    riskLevel: '中高',
  },
];

const INITIAL_COINS = 100000; // 10万金币

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return NextResponse.json({ error: '数据库连接不可用' }, { status: 500 });
  }
  
  try {
    const { action } = await request.json();

    if (action === 'init') {
      // 初始化AI用户
      const results = [];
      
      for (let i = 0; i < AI_CHARACTERS.length; i++) {
        const character = AI_CHARACTERS[i];
        const email = `${character.role}@jinhuohuo.ai`;
        
        try {
          // 检查用户是否已存在
          const { data: existingUsers } = await supabase
            .from('users')
            .select('user_id, coin_balance')
            .eq('email', email)
            .limit(1);

          if (existingUsers && existingUsers.length > 0) {
            // 更新金币
            const { error: updateError } = await supabase
              .from('users')
              .update({ coin_balance: INITIAL_COINS })
              .eq('user_id', existingUsers[0].user_id);
            
            if (updateError) {
              throw new Error(updateError.message);
            }
            
            results.push({
              name: character.name,
              status: 'updated',
              userId: existingUsers[0].user_id,
            });
          } else {
            // 创建新用户
            const { data, error: insertError } = await supabase
              .from('users')
              .insert({
                user_id: character.role,
                email: email,
                password: `ai_${character.role}_password_2024`,
                name: character.name,
                avatar: character.avatar,
                coin_balance: INITIAL_COINS,
                role: 'ai',
              })
              .select('user_id')
              .single();
            
            if (insertError) {
              throw new Error(insertError.message);
            }
            
            results.push({
              name: character.name,
              status: 'created',
              userId: data?.user_id || character.role,
            });
          }

          // 检查/创建AI角色
          const { data: existingRoles } = await supabase
            .from('chat_hall_ai_roles')
            .select('name')
            .eq('name', character.name)
            .limit(1);

          if (!existingRoles || existingRoles.length === 0) {
            const { error: roleError } = await supabase
              .from('chat_hall_ai_roles')
              .insert({
                name: character.name,
                enabled: true,
                reply_probability: 30 + Math.floor(Math.random() * 40), // 30-70%
                max_response_length: 200,
                system_prompt: `你是${character.name}，${character.personality}。你是金火火交易平台的AI交易员，参与K线征途挑战赛是你的目标。你的交易风格是${character.tradingStyle}，风险偏好为${character.riskLevel}。你说话直接专业，喜欢用数据说话。`,
                trigger_keyword: character.name,
                avatar_url: character.avatar,
                sort_order: i,
              });
            
            if (roleError) {
              console.error(`创建AI角色 ${character.name} 失败:`, roleError);
            }
          }
        } catch (error: any) {
          results.push({
            name: character.name,
            status: 'error',
            error: error.message,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'AI用户初始化完成',
        results,
        summary: {
          total: AI_CHARACTERS.length,
          coinsEach: INITIAL_COINS,
        },
      });
    }

    if (action === 'status') {
      // 查看AI用户状态
      const { data: aiUsers, error: usersError } = await supabase
        .from('users')
        .select('user_id, name, email, coin_balance, role')
        .eq('role', 'ai')
        .order('name');

      const { data: aiRoles, error: rolesError } = await supabase
        .from('chat_hall_ai_roles')
        .select('name, enabled, reply_probability')
        .order('sort_order');

      if (usersError || rolesError) {
        return NextResponse.json({ 
          error: '获取状态失败',
          details: usersError?.message || rolesError?.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        aiUsers: aiUsers || [],
        aiRoles: aiRoles || [],
      });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error: any) {
    console.error('AI用户管理错误:', error);
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
