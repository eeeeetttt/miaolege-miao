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

#### 数据库表
- `challenge_registrations` - 挑战赛报名表
- `challenge_config` - 挑战赛配置表
- `challenge_level_config` - 关卡配置表
- `challenge_hall_of_fame` - 名人堂表
- `challenge_level_records` - 关卡记录表
- `mt_accounts` - MT交易账户表

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
- `chat_hall_messages` - 聊天大厅消息表
- `chat_hall_config` - 聊天大厅配置表
- `chat_hall_mutes` - 用户禁言表

### 聊天大厅功能

#### 特性
- 实时聊天大厅，用户可发言讨论
- 发言频率限制（默认每分钟1条）
- 用户禁言功能（管理员可禁言/解禁用户）
- 高级会员彩色字体区分（premium/vip/admin）
- 系统推送通知（通关/失败等重要事件）

#### 相关页面
- `/social` - 社交中心（包含聊天大厅Tab）

#### 相关API
- `GET /api/chat-hall` - 获取消息列表和配置
- `POST /api/chat-hall` - 发送消息
- `POST /api/chat-hall/system` - 发送系统通知
- `GET/POST /api/admin/chat-hall` - 后台管理（配置、禁言/解禁）

#### 数据库表（Supabase）
- `chat_hall_messages` - 聊天消息（user_id, user_name, content, is_system, is_premium）
- `chat_hall_config` - 聊天配置（enabled, cooldown_seconds, max_message_length）
- `chat_hall_mutes` - 禁言记录（user_id, reason, muted_by, expires_at）

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

## 自动化验证

项目已配置自动化验证脚本，支持快速检查和完整验证。

### 快速命令

```bash
# 快速检查（开发中使用）
pnpm quick-check

# 完整验证（包括 API 测试）
pnpm validate

# 只测试 API
pnpm validate --api-only

# 完整验证（包括构建）
pnpm validate --full
```

### Git Hooks

项目已配置 Git Hooks：

- **pre-commit**: 提交前自动检查 TypeScript 和 ESLint
- **pre-push**: 推送前运行完整验证

### 验证脚本

- `scripts/validate.sh` - 完整验证脚本
- `scripts/quick-check.sh` - 快速检查脚本

### 验证项目

1. **静态检查**: TypeScript 类型检查、ESLint 检查
2. **服务检测**: 验证开发服务器运行状态
3. **API 测试**: 测试关键 API 接口
4. **日志检查**: 检查应用日志健康状态
