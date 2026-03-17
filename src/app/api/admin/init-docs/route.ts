import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, documents } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 预置文档数据
const DEFAULT_DOCS = [
  {
    title: '平台介绍',
    slug: 'platform-introduction',
    category: 'getting-started',
    sortOrder: 1,
    content: `## 欢迎来到喵了个喵

喵了个喵是一个基于交易信号跟单的社区化平台，旨在帮助交易者更好地分享和跟随优质的交易信号。

### 平台特色

- **星球系统**: 创建或加入星球，与志同道合的交易者一起交流
- **信号跟单**: 自动跟随专业交易者的信号，实现智能跟单
- **收益透明**: 所有信号源的收益数据公开透明，方便选择
- **风险管理**: 提供多种风险控制工具，保护您的资金安全

### 核心功能

1. **信号发布**: 作为信号源发布您的交易信号
2. **自动跟单**: 设置跟单参数，自动跟随信号交易
3. **星球管理**: 创建星球，邀请成员，共同成长
4. **数据分析**: 查看详细的交易数据和收益分析

---

> 开始您的跟单之旅，与优秀的交易者同行！
`,
  },
  {
    title: '如何注册账号',
    slug: 'how-to-register',
    category: 'getting-started',
    sortOrder: 2,
    content: `## 注册账号指南

### 注册步骤

1. 点击页面右上角的"注册"按钮
2. 填写您的邮箱地址和密码
3. 确认邮箱验证码
4. 完成注册

### 注意事项

- 请使用有效的邮箱地址，以便接收重要通知
- 密码长度至少8位，建议包含字母和数字
- 注册后请及时完善个人信息

### 常见问题

**Q: 注册后无法登录怎么办？**

A: 请检查邮箱是否已验证，如果未收到验证邮件，可以尝试重新发送。

**Q: 可以修改用户名吗？**

A: 可以，登录后在个人中心修改您的显示名称。
`,
  },
  {
    title: '如何绑定MT账号',
    slug: 'how-to-bind-mt',
    category: 'getting-started',
    sortOrder: 3,
    content: `## 绑定MT账号

绑定MT账号是使用跟单功能的前提条件。

### 前置准备

1. 确保您已安装MT4/MT5客户端
2. 准备好您的MT账号和密码
3. 确认MT服务器地址

### 绑定步骤

1. 登录喵了个喵平台
2. 进入"个人中心"
3. 点击"绑定MT账号"
4. 选择MT版本（MT4或MT5）
5. 填写账号信息：
   - MT账号
   - MT密码
   - 服务器地址
6. 点击"验证并绑定"

### 验证说明

系统会尝试连接您的MT账号进行验证，验证成功后即可使用跟单功能。

### 安全提示

- 您的MT密码会被加密存储
- 建议使用只读密码以增强安全性
- 定期更换MT密码

---

> 绑定MT账号后，您就可以开始跟单了！
`,
  },
  {
    title: '如何加入星球',
    slug: 'how-to-join-planet',
    category: 'getting-started',
    sortOrder: 4,
    content: `## 加入星球指南

星球是喵了个喵的核心概念，加入星球可以获取优质的交易信号。

### 查找星球

1. 访问"星球列表"页面
2. 浏览星球信息，包括：
   - 星球名称和描述
   - 信号源数量
   - 历史收益率
   - 成员数量

### 申请加入

1. 点击感兴趣的星球
2. 查看星球详情和信号源
3. 点击"申请加入"
4. 等待星球管理员审核

### 加入条件

不同星球可能有不同的加入条件：

- **免费星球**: 无门槛，申请即可加入
- **付费星球**: 需要购买门票
- **审核星球**: 需要管理员审核通过

### 加入后的权益

- 查看星球内的所有信号源
- 设置跟单参数进行跟单
- 参与星球内讨论
- 查看历史交易数据

---

> 选择合适的星球，开启您的跟单之旅！
`,
  },
  {
    title: '如何进行跟单',
    slug: 'how-to-follow',
    category: 'trading',
    sortOrder: 5,
    content: `## 跟单操作指南

### 前置条件

- 已注册并登录平台
- 已绑定MT账号
- 已加入至少一个星球

### 开始跟单

1. 进入您加入的星球
2. 选择要跟随的信号源
3. 点击"跟随交易"
4. 设置跟单参数：
   - **跟单金额**: 每笔交易的金额
   - **跟单比例**: 与信号源的比例关系
   - **最大持仓**: 同时持仓的最大数量
   - **止损设置**: 是否跟随止损

### 跟单参数说明

#### 固定金额模式

每次交易使用固定金额，例如每次$100。

#### 比例跟单模式

按照信号源的手数比例进行跟单，例如信号源开1手，您设置0.1倍，则开0.1手。

#### 反向跟单

与信号源反向操作，适用于某些特殊策略。

### 暂停和停止

- **暂停跟单**: 临时停止跟单，保留设置
- **停止跟单**: 完全停止并清除设置

### 风险提示

跟单有风险，请合理控制仓位，设置止损。

---

> 理性跟单，稳健盈利！
`,
  },
  {
    title: '信号类型说明',
    slug: 'signal-types',
    category: 'trading',
    sortOrder: 6,
    content: `## 信号类型

喵了个喵支持多种交易信号的接收和跟单。

### 外汇信号

- **货币对**: EURUSD, GBPUSD, USDJPY等主要货币对
- **交易时间**: 24小时交易
- **特点**: 流动性高，点差低

### 贵金属信号

- **品种**: 黄金(XAUUSD)、白银(XAGUSD)
- **特点**: 避险属性，波动较大

### 指数信号

- **品种**: US30, US500, NAS100等
- **特点**: 代表股市整体走势

### 加密货币信号

- **品种**: BTCUSD, ETHUSD等
- **特点**: 高波动，24小时交易

### 商品信号

- **品种**: 原油、天然气等
- **特点**: 受供需影响大

### 信号属性

每个信号包含：

- **品种**: 交易品种代码
- **方向**: BUY（买入）或SELL（卖出）
- **开仓价**: 建议的开仓价格
- **止损价**: 风险控制价格
- **止盈价**: 目标盈利价格
- **手数**: 建议的交易手数

---

> 了解不同信号类型，选择适合您的交易策略！
`,
  },
  {
    title: '收益率计算说明',
    slug: 'yield-calculation',
    category: 'trading',
    sortOrder: 7,
    content: `## 收益率计算方法

喵了个喵采用透明的收益率计算方式。

### 计算公式

**累计收益率 = (当前余额 - 初始资金) / 初始资金 × 100%**

### 初始资金

初始资金取自信号源的第一笔交易记录时的账户余额。

### 收益率更新

- **实时更新**: 每接收一次新信号，自动更新收益率
- **历史追溯**: 包含所有历史交易记录

### 收益率展示

#### 星球列表页

显示星球内所有信号源的加权平均收益率。

#### 信号源详情页

显示单个信号源的详细收益率，包括：

- 累计收益率
- 日均收益率
- 最大回撤
- 胜率
- 盈亏比

### 注意事项

- 收益率仅供参考，不构成投资建议
- 过往收益不代表未来表现
- 请关注最大回撤和风险指标

### 收益率统计周期

- **今日**: 今日开盘至今
- **本周**: 本周一至今
- **本月**: 本月1日至今
- **累计**: 第一笔交易至今

---

> 理解收益率计算，做出明智的跟单决策！
`,
  },
  {
    title: '常见问题FAQ',
    slug: 'faq',
    category: 'faq',
    sortOrder: 8,
    content: `## 常见问题

### 账号相关

**Q: 忘记密码怎么办？**

A: 点击登录页面的"忘记密码"，通过邮箱重置密码。

**Q: 可以注册多个账号吗？**

A: 一个邮箱只能注册一个账号。

### MT账号相关

**Q: 绑定MT账号失败怎么办？**

A: 请检查：
- MT账号和密码是否正确
- 服务器地址是否正确
- MT客户端是否开启了API接口

**Q: 可以绑定多个MT账号吗？**

A: 目前一个平台账号只能绑定一个MT账号。

### 跟单相关

**Q: 为什么没有跟单成功？**

A: 可能原因：
- MT账号未绑定
- MT客户端未运行
- 网络连接问题
- 账户余额不足

**Q: 可以修改跟单参数吗？**

A: 可以随时修改跟单参数，修改后立即生效。

### 星球相关

**Q: 如何创建自己的星球？**

A: 登录后访问"创建星球"页面，填写相关信息即可。

**Q: 如何成为信号源？**

A: 在星球管理页面申请成为发布者，审核通过后即可发布信号。

### 其他问题

**Q: 平台收取费用吗？**

A: 基础功能免费使用，部分高级功能可能需要付费。

**Q: 如何联系客服？**

A: 请发送邮件至 support@mlgm.com

---

> 更多问题，请联系客服！
`,
  },
  {
    title: '风险提示',
    slug: 'risk-warning',
    category: 'other',
    sortOrder: 9,
    content: `## 风险提示

### 投资有风险，入市需谨慎

喵了个喵提供的所有服务和信息仅供参考，不构成任何投资建议。

### 主要风险

#### 市场风险

金融市场波动剧烈，可能导致资金损失。外汇、贵金属、加密货币等交易具有高风险。

#### 跟单风险

跟随他人交易信号并不能保证盈利：
- 信号源的历史业绩不代表未来表现
- 市场条件变化可能导致策略失效
- 技术故障可能导致跟单失败

#### 技术风险

- 网络中断可能影响交易执行
- 系统故障可能导致数据延迟或错误
- 第三方服务可能不稳定

### 风险管理建议

1. **合理控制仓位**: 不要投入超过承受能力的资金
2. **设置止损**: 每笔交易都应设置止损
3. **分散投资**: 不要把所有资金投入单一信号源
4. **持续学习**: 了解市场和交易知识
5. **理性决策**: 不要盲目跟单，要有自己的判断

### 平台声明

- 喵了个喵仅提供技术平台，不参与交易决策
- 用户应对自己的交易决策负责
- 平台不对任何投资损失承担责任

### 免责声明

使用本平台即表示您已了解并接受相关风险。请根据自身情况谨慎投资。

---

> 保护您的资金安全，理性投资！
`,
  },
];

/**
 * 初始化文档数据
 * 需要管理员权限
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查管理员权限
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 创建documents表（如果不存在）
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          content TEXT NOT NULL,
          category VARCHAR(100) DEFAULT 'general',
          sort_order INT DEFAULT 0,
          status ENUM('published', 'draft') DEFAULT 'published',
          view_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_document_slug (slug),
          INDEX idx_document_category (category)
        )
      `);
    } catch (error) {
      console.error('Create table error:', error);
      // 表可能已存在，继续执行
    }

    // 插入默认文档
    let insertedCount = 0;
    let skippedCount = 0;

    for (const doc of DEFAULT_DOCS) {
      try {
        // 检查是否已存在
        const [existing] = await db
          .select()
          .from(documents)
          .where(eq(documents.slug, doc.slug))
          .limit(1);

        if (existing) {
          skippedCount++;
          continue;
        }

        // 插入新文档
        await db.insert(documents).values({
          title: doc.title,
          slug: doc.slug,
          content: doc.content,
          category: doc.category,
          sortOrder: doc.sortOrder,
          status: 'published',
          viewCount: 0,
        });

        insertedCount++;
      } catch (error) {
        console.error(`Insert document error (${doc.slug}):`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `文档初始化完成，新增 ${insertedCount} 篇，跳过 ${skippedCount} 篇`,
      inserted: insertedCount,
      skipped: skippedCount
    });
  } catch (error) {
    console.error('Init docs error:', error);
    return NextResponse.json({ error: '初始化失败' }, { status: 500 });
  }
}
