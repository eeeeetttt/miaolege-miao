import { NextResponse } from 'next/server';

// 伦敦金价格API - 使用Swissquote实时数据
export async function GET() {
  try {
    // Swissquote 实时报价API - 提供准确的XAU/USD价格
    const swissquoteUrl = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD';
    
    try {
      const response = await fetch(swissquoteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.length > 0) {
          // 获取第一个报价的价格
          const quote = data[0];
          const prices = quote.spreadProfilePrices;
          
          // 使用第一个可用价格配置（通常是premium）
          const premiumPrice = prices.find((p: any) => p.spreadProfile === 'premium') || prices[0];
          
          if (premiumPrice) {
            const bid = premiumPrice.bid;
            const ask = premiumPrice.ask;
            const midPrice = (bid + ask) / 2;
            const spread = ask - bid;
            const timestamp = new Date(quote.ts);
            
            return NextResponse.json({
              success: true,
              data: {
                price: Math.round(midPrice * 100) / 100,
                bid: Math.round(bid * 100) / 100,
                ask: Math.round(ask * 100) / 100,
                spread: Math.round(spread * 100) / 100,
                name: '伦敦金',
                code: 'XAUUSD',
                time: timestamp.toISOString(),
                unit: '美元/盎司',
                currency: 'USD',
                source: 'Swissquote'
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('Swissquote 获取失败:', e);
    }

    // 备用: Yahoo Finance
    const yahooUrl = 'https://query2.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=1d&range=1d';
    
    try {
      const response = await fetch(yahooUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const chartData = result?.chart?.result?.[0];
        
        if (chartData) {
          const meta = chartData.meta;
          const regularMarketPrice = meta.regularMarketPrice;
          const regularMarketPreviousClose = meta.chartPreviousClose || meta.previousClose;
          const change = regularMarketPrice - regularMarketPreviousClose;
          const changePercent = regularMarketPreviousClose ? (change / regularMarketPreviousClose) * 100 : 0;
          
          return NextResponse.json({
            success: true,
            data: {
              price: Math.round(regularMarketPrice * 100) / 100,
              change: Math.round(change * 100) / 100,
              changePercent: Math.round(changePercent * 100) / 100,
              name: '伦敦金',
              code: 'XAUUSD',
              time: new Date(meta.regularMarketTime * 1000).toISOString(),
              unit: '美元/盎司',
              currency: 'USD',
              source: 'Yahoo Finance'
            }
          });
        }
      }
    } catch (e) {
      console.error('Yahoo Finance 获取失败:', e);
    }

    // 最终备用: 返回null价格，让前端显示上次获取的价格
    console.error('所有数据源获取失败');
    
    return NextResponse.json({
      success: false,
      error: '无法获取实时价格',
      data: {
        price: null,
        name: '伦敦金',
        code: 'XAUUSD',
        unit: '美元/盎司',
        currency: 'USD'
      }
    });

  } catch (error) {
    console.error('gold-price API error:', error);
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      data: {
        price: null,
        name: '伦敦金',
        code: 'XAUUSD'
      }
    }, { status: 500 });
  }
}
