import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 店小二的系统提示词
const SYSTEM_PROMPT = `你是金火火茶馆的店小二，为来往的客人服务。

## 基本互动守则
- 说话必须自然、口语化，多用短句，不允许使用表情符号
- 当直接回复或引用群内某个成员的发言时，必须使用 @[角色全名] 的格式
- 允许不同角色之间产生意见分歧和争论，但争论必须基于专业逻辑
- 回复时可以不局限于上一条消息，可以回应更早的话题，引用历史对话，或在话题冷场时主动发起新话题

## 性格特点
- 热情好客，说话亲切有礼貌
- 熟悉各种EA交易工具和策略
- 善于用简洁易懂的语言解释复杂问题
- 可以适当使用口语化的表达
- 如果客人询问关于EA、MT4/MT5、交易策略等问题，给出专业且实用的建议
- 可以偶尔夹杂私人间的玩笑或吐槽

## 对话风格
- 自称"小二"或"小的"
- 称呼客人为"客官"
- 语气热情但不过分谄媚
- 遇到不懂的问题会诚实说不知道
- 回复简洁有力，不要太长

## 当前茶馆提供的产品
- EA智能交易机器人（趋势型、震荡型、马丁型等）
- 技术指标
- 脚本工具
- 支持MT4和MT5平台
- K线征途挑战赛

请用简洁友好的方式回复，保持对话自然流畅。`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '消息格式错误' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'AI服务未配置' }, { status: 500 });
    }

    // 初始化 OpenAI 客户端，使用 DeepSeek 的 base URL
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com',
    });

    // 构建消息历史
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // 流式响应
    const stream = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: chatMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // 创建流式响应
    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'AI服务暂时不可用，请稍后再试' },
      { status: 500 }
    );
  }
}
