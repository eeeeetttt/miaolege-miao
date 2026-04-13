# K线征途挑战赛项目规范

## 项目概览

这是一个基于 Next.js 的 Web 应用，包含"喵了个喵"星球跟单平台和 K 线征途挑战赛功能。

## 技术栈

- **前端**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS
- **后端**: Next.js API Routes, NextAuth.js
- **数据库**: MySQL, Drizzle ORM
- **样式**: CSS Modules, shadcn/ui

## 核心功能

### K线征途挑战赛

#### 流程
1. 用户在挑战页面点击"立即报名"
2. 扣除报名费（默认1000星球币）
3. 申请进入待审核状态
4. 管理员在后台审核，填写服务器、账号、密码
5. 审核通过后发送邮件通知
6. 管理员激活挑战
7. 用户开始挑战，显示账户净值
8. 挑战成功/失败后可重新报名

#### 相关页面
- `/challenge` - 挑战赛主页面（左右布局）
- `/challenge/play` - 挑战进行中页面
- `/admin/challenge` - 后台管理（审核申请、配置参数）

#### 相关API
- `GET/POST /api/challenge/register` - 获取/提交挑战申请
- `GET /api/challenge/balance` - 获取当前账户净值
- `GET/POST /api/challenge/hall-of-fame` - 名人堂
- `GET/POST /api/admin/challenge` - 后台管理接口
- `GET /api/challenge/leaderboard` - 获取排行榜（支持虚拟用户填充）
- `POST /api/challenge/leaderboard` - 更新排行榜缓存（定时任务调用）
- `GET/POST/PUT/DELETE /api/admin/virtual-participant` - 虚拟用户管理

#### 数据库表
- `challenge_registrations` - 挑战赛报名表
- `challenge_config` - 挑战赛配置表
- `challenge_level_config` - 关卡配置表
- `challenge_hall_of_fame` - 名人堂表
- `challenge_level_records` - 关卡记录表
- `mt_accounts` - MT交易账户表

#### 排行榜功能
- **虚拟用户填充**：排行榜支持虚拟用户填充，真实用户优先展示
- **排序规则**：真实用户 → 关卡降序 → 净值降序
- **定时更新**：排行榜每日晚上8点自动更新
- **虚拟用户标识**：虚拟用户显示蓝色机器人图标和"虚拟"标签

#### 虚拟用户管理（Supabase PostgreSQL）
- `virtual_participants` - 虚拟用户表
  - name: 用户名称
  - level: 所在关卡（1-4）
  - equity: 当前净值
  - progress: 进度百分比
  - is_active: 是否启用

#### 状态说明
- `pending` - 待审核
- `approved` - 已通过（待激活）
- `active` - 挑战进行中
- `completed` - 已通关
- `failed` - 挑战失败
- `rejected` - 申请被拒绝

### 星球跟单功能

#### 特性
- 星球创建和管理
- 发布者信号绑定（无数量限制）
- 用户账户绑定（无数量限制）
- 交易信号展示

#### 相关限制
- 报名费: 1000星球币
- 初始净值: 1000
- 通关目标净值: 2000
- 失败底线净值: 100

### 用户社交功能

#### 私信功能
- 用户间一对一私信通信
- 会话列表展示最新对话
- 未读消息标记

#### 星球币转账
- 用户间互相转账星球币
- 转账记录查询
- 余额检查

#### 用户搜索与关注
- 按昵称/ID搜索用户
- 关注/取消关注用户
- 关注列表管理

#### 相关页面
- `/user` - 用户中心（包含社交tab）

#### 相关API
- `POST /api/message/send` - 发送私信
- `GET /api/message/send?userId=xxx` - 获取与某用户的聊天记录
- `GET /api/message/conversations` - 获取私信会话列表
- `POST /api/coin/transfer` - 转账
- `GET /api/coin/transfer` - 获取转账记录
- `GET /api/user/search` - 搜索用户
- `POST /api/user/follow` - 关注/取消关注
- `GET /api/user/follow` - 获取关注状态
- `GET /api/user/follow/list` - 获取关注/粉丝列表

#### 数据库表（Supabase）
- `private_messages` - 私信表
- `coin_transfers` - 星球币转账表
- `user_follows` - 用户关注表

## 开发规范

### API 路由
- 使用 Next.js App Router 的 API Routes
- 使用 `getServerSession` 获取用户会话
- 使用 Drizzle ORM 进行数据库操作
- 统一错误处理和响应格式

### 前端组件
- 使用 CSS Modules 进行样式管理
- 使用 shadcn/ui 组件库
- 使用 `useSession` 进行认证状态管理

## 环境变量

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=trade
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```
