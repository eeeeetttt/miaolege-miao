import { NextResponse } from 'next/server';

// 伦敦金价格API
export async function GET() {
  try {
    // 方法1: 使用金十数据的免费接口（需要设置代理或者使用CORS代理）
    // 金十数据 API
    const goldAPIUrl = 'https://api.money.126.net/data/feed/1200200,1001861?callback=a';

    try {
      const response = await fetch(goldAPIUrl, {
        headers: {
          'Referer': 'https://finance.126.com',
        },
      });

      if (response.ok) {
        const text = await response.text();
        // 解析返回的数据格式: a({"1200200":{...}})
        const jsonMatch = text.match(/a\((.+)\)/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]);
          const londonGold = data['1200200'];
          
          if (londonGold && londonGold.price) {
            return NextResponse.json({
              success: true,
              data: {
                price: parseFloat(londonGold.price),
                change: parseFloat(londonGold.change) || 0,
                changePercent: parseFloat(londonGold.percent) || 0,
                name: '伦敦金',
                code: 'XAUUSD',
                time: londonGold.updateTime || new Date().toISOString(),
                unit: '美元/盎司',
                currency: 'USD'
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('金十数据获取失败:', e);
    }

    // 方法2: 备用 - 使用其他数据源
    // 如果金十数据失败，尝试网易贵金属
    const backupUrl = 'https://api.money.126.net/data/feed/1001861?callback=b';
    
    try {
      const response = await fetch(backupUrl, {
        headers: {
          'Referer': 'https://money.163.com',
        },
      });

      if (response.ok) {
        const text = await response.text();
        const jsonMatch = text.match(/b\((.+)\)/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]);
          const goldData = data['1001861'];
          
          if (goldData && goldData.price) {
            // 换算成美元/盎司（人民币汇率换算 + 单位换算）
            const cnyPrice = parseFloat(goldData.price);
            const usdCnyRate = 7.25; // 默认汇率
            
            // 黄金换算：1盎司=31.1035克，人民币/克换算成美元/盎司
            const usdPrice = (cnyPrice / usdCnyRate) * 31.1035;
            
            return NextResponse.json({
              success: true,
              data: {
                price: Math.round(usdPrice * 100) / 100,
                change: parseFloat(goldData.change) || 0,
                changePercent: parseFloat(goldData.percent) || 0,
                name: '伦敦金(换算)',
                code: 'XAUUSD',
                time: goldData.updateTime || new Date().toISOString(),
                unit: '美元/盎司',
                currency: 'USD',
                cnyPrice: cnyPrice
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('备用数据获取失败:', e);
    }

    // 方法3: 返回一个估算值（当所有API都失败时）
    // 这个值需要手动更新或者用其他方式获取
    return NextResponse.json({
      success: true,
      data: {
        price: 4320, // 默认值，实际应该从API获取
        change: 0,
        changePercent: 0,
        name: '伦敦金',
        code: 'XAUUSD',
        time: new Date().toISOString(),
        unit: '美元/盎司',
        currency: 'USD',
        estimated: true // 标记为估算值
      }
    });

  } catch (error) {
    console.error('获取伦敦金价格失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取价格失败'
    }, { status: 500 });
  }
}
