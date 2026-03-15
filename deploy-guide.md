# 喵了个喵网站部署指南

## 一、数据库连接配置

### 1. 检查数据库连接信息

你的 `.env.local` 文件已配置：
```env
MYSQL_HOST=sh-cynosdbmysql-grp-i4wexe28.sql.tencentcdb.com
MYSQL_PORT=26722
MYSQL_USER=followtrade
MYSQL_PASSWORD=Cui453649836.
MYSQL_DATABASE=trade-7g8d0t5da2e5aa81
```

### 2. 确保数据库可访问

登录腾讯云控制台，检查：

**方式一：外网访问（当前配置）**
- 进入 TDSQL-C 控制台
- 找到你的数据库实例
- 确保「外网地址」已开启
- 在「安全组」中添加规则：允许你的服务器 IP 访问 26722 端口

**方式二：内网访问（推荐，更快更稳定）**
如果你的服务器和数据库在同一个腾讯云地域：
```env
MYSQL_HOST=172.17.0.5
MYSQL_PORT=3306
```

### 3. 测试数据库连接

在你的服务器上执行：
```bash
mysql -h sh-cynosdbmysql-grp-i4wexe28.sql.tencentcdb.com \
      -P 26722 \
      -u followtrade \
      -p'Cui453649836.' \
      -e "SELECT 1"
```

---

## 二、域名绑定步骤

### 步骤 1：DNS 解析

登录 DNSPod 或域名服务商：

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| A | @ | 43.128.40.218 |
| A | www | 43.128.40.218 |

### 步骤 2：SSH 登录服务器

```bash
ssh root@43.128.40.218
# 密码: Cui453649836.
```

### 步骤 3：安装必要软件

```bash
# 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo yum install -y nginx
```

### 步骤 4：上传代码到服务器

**方式一：使用 Git（推荐）**
```bash
cd /root
git clone <你的仓库地址> my-fx-app
```

**方式二：使用 SCP 上传**
在本地执行：
```bash
scp -r /本地项目路径/* root@43.128.40.218:/root/my-fx-app/
```

### 步骤 5：安装依赖并构建

```bash
cd /root/my-fx-app
pnpm install
pnpm build
```

### 步骤 6：创建环境变量文件

```bash
cat > /root/my-fx-app/.env.local << 'EOF'
MYSQL_HOST=sh-cynosdbmysql-grp-i4wexe28.sql.tencentcdb.com
MYSQL_PORT=26722
MYSQL_USER=followtrade
MYSQL_PASSWORD=Cui453649836.
MYSQL_DATABASE=trade-7g8d0t5da2e5aa81
NEXTAUTH_SECRET=oR8+fCSG0a8/yz65rgMTe+qHsKYdT8qCC9yQIR0KnvA=
NEXTAUTH_URL=https://miaolegemiao.cn
ADMIN_PASSWORD=admin123
EOF
```

### 步骤 7：使用 PM2 启动

```bash
pm2 start npm --name "mlgm-planet" -- run start
pm2 save
pm2 startup
```

### 步骤 8：配置 Nginx

```bash
# 创建配置文件
sudo vim /etc/nginx/conf.d/miaolegemiao.cn.conf
```

粘贴以下内容（临时 HTTP 配置）：
```nginx
server {
    listen 80;
    server_name miaolegemiao.cn www.miaolegemiao.cn;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 步骤 9：开放防火墙端口

在腾讯云轻量应用服务器控制台：
- 防火墙 → 添加规则
- 开放 80 端口（HTTP）
- 开放 443 端口（HTTPS）

### 步骤 10：初始化数据库

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"password":"admin123"}' \
  http://localhost:3000/api/admin/init-db
```

### 步骤 11：访问网站

打开浏览器访问：`http://miaolegemiao.cn`

---

## 三、配置 HTTPS（SSL 证书）

### 方式一：使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo yum install -y certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d miaolegemiao.cn -d www.miaolegemiao.cn

# 自动续期
sudo systemctl enable certbot-renew.timer
```

### 方式二：使用腾讯云 SSL 证书

1. 在腾讯云 SSL 证书控制台申请免费证书
2. 下载 Nginx 版本证书
3. 上传到服务器：

```bash
# 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 上传证书文件
sudo scp miaolegemiao.cn_bundle.crt root@43.128.40.218:/etc/nginx/ssl/
sudo scp miaolegemiao.cn.key root@43.128.40.218:/etc/nginx/ssl/
```

4. 更新 Nginx 配置使用 HTTPS

---

## 四、常用命令

```bash
# 查看 PM2 进程状态
pm2 status

# 查看日志
pm2 logs mlgm-planet

# 重启应用
pm2 restart mlgm-planet

# 查看 Nginx 状态
sudo systemctl status nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
```

---

## 五、故障排查

### 问题1：数据库连接失败
```bash
# 检查外网地址是否开启
# 检查安全组规则
# 检查密码是否正确
```

### 问题2：网站无法访问
```bash
# 检查 PM2 是否运行
pm2 status

# 检查 Nginx 是否运行
sudo systemctl status nginx

# 检查端口监听
ss -tuln | grep -E ':(80|3000)'
```

### 问题3：502 Bad Gateway
```bash
# 检查应用是否启动
pm2 logs mlgm-planet

# 检查端口是否正确
# Nginx 代理的端口应该是 3000
```
