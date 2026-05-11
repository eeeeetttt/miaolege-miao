# 部署指南

## 方式一：部署到 Vercel（推荐）

1. **创建 GitHub 仓库**
   - 访问 https://github.com
   - 点击 "New repository"
   - 仓库名：`miaolege-miao`

2. **推送代码到 GitHub**
   ```bash
   git remote add origin https://github.com/你的用户名/miaolege-miao.git
   git push -u origin main
   ```

3. **部署到 Vercel**
   - 访问 https://vercel.com
   - 用 GitHub 登录
   - 点击 "Import Project"
   - 选择刚创建的仓库
   - 点击 "Deploy"

## 方式二：部署到自己的服务器

1. **构建项目**
   ```bash
   pnpm install
   pnpm build
   ```

2. **启动生产服务**
   ```bash
   pnpm start
   ```

## 环境变量

部署时需要配置以下环境变量：

```
MYSQL_HOST=sh-cynosdbmysql-grp-i4wexe28.sql.tencentcdb.com
MYSQL_PORT=26722
MYSQL_USER=followtrade
MYSQL_PASSWORD=Cui453649836.
MYSQL_DATABASE=trade-7g8d0t5da2e5aa81
```

## 数据库

确保 MySQL 数据库表已创建：
- user_accounts
- match_accounts
- match_positions
- challenge_registrations
- chat_hall_messages
- 等...
