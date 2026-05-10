import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const prizes = await query(
      'SELECT * FROM challenge_prize_config ORDER BY id ASC LIMIT 1'
    );

    if (!prizes || prizes.length === 0) {
      return NextResponse.json({ 
        title: 'K线征途挑战赛',
        description: '挑战自我，赢取丰厚奖品！',
        image: '/prize-default.png',
        enabled: true 
      });
    }

    const prize = prizes[0];
    return NextResponse.json({
      id: prize.id,
      title: prize.title || 'K线征途挑战赛',
      description: prize.description || '挑战自我，赢取丰厚奖品！',
      image: prize.image || '/prize-default.png',
      enabled: prize.enabled !== false,
      prizes: prize.prizes ? JSON.parse(prize.prizes) : []
    });
  } catch (error) {
    console.error('获取奖金配置失败:', error);
    return NextResponse.json({ 
      title: 'K线征途挑战赛',
      description: '挑战自我，赢取丰厚奖品！',
      image: '/prize-default.png',
      enabled: true 
    });
  }
}
