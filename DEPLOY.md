# Auto-PPT 部署指南

本文档提供了 Auto-PPT 项目的部署指南，包括前端和后端的部署步骤。

## 部署脚本

我们提供了三个部署脚本：

1. `deploy.sh` - 综合部署脚本，可以选择部署前端、后端或两者都部署
2. `deploy-frontend.sh` - 仅部署前端的脚本
3. `deploy-backend.sh` - 仅部署后端的脚本

## 前置条件

在运行部署脚本之前，请确保：

1. 已安装 Node.js 和 npm
2. 已安装 zip 命令
3. 已安装 sshpass 命令（用于自动化 SSH 登录）
   - 在 Ubuntu/Debian 上可以使用: `sudo apt-get install sshpass`
   - 在 CentOS/RHEL 上可以使用: `sudo yum install sshpass`
4. 有服务器的 SSH 访问权限

## 使用方法

### 使用综合部署脚本

1. 给脚本添加执行权限：

```bash
chmod +x deploy.sh
```

2. 运行脚本：

```bash
./deploy.sh
```

3. 按照提示输入服务器信息和选择要部署的内容

### 仅部署前端

1. 给脚本添加执行权限：

```bash
chmod +x deploy-frontend.sh
```

2. 运行脚本：

```bash
./deploy-frontend.sh
```

### 仅部署后端

1. 给脚本添加执行权限：

```bash
chmod +x deploy-backend.sh
```

2. 运行脚本：

```bash
./deploy-backend.sh
```

## 部署流程

### 前端部署流程

1. 执行 `npm run build-only` 命令打包
2. 将 dist 目录压缩成 dist.zip 文件
3. 上传 dist.zip 到服务器的 /data/autoPpt/ 目录
4. 在服务器上解压 dist.zip 并重新加载 nginx

### 后端部署流程

1. 将 server 项目打包成 server.zip
2. 上传 server.zip 到服务器的 /data/autoPpt/server/ 目录
3. 在服务器上解压 server.zip
4. 安装依赖（npm install）
5. 停止现有的后端服务（如果有）
6. 启动后端服务（nohup npm start >> nohup.out &）
7. 重新加载 nginx

## 故障排除

如果部署过程中遇到问题，请检查：

1. 服务器连接信息是否正确
2. 服务器上的目录权限是否正确
3. 查看服务器上的日志文件：
   - 后端服务日志：/data/autoPpt/server/server/nohup.out
   - Nginx 日志：/www/server/nginx/logs/error.log

## 手动部署步骤

如果脚本无法正常工作，您可以按照以下步骤手动部署：

### 前端部署

1. 打包：`npm run build-only`
2. 压缩：`zip -r dist.zip dist/`
3. 上传到服务器：`scp dist.zip user@server:/data/autoPpt/`
4. 在服务器上执行：
   ```bash
   cd /data/autoPpt/
   rm -f dist.zip
   rm -rf dist
   unzip dist.zip
   /www/server/nginx/sbin/nginx -s reload
   ```

### 后端部署

1. 压缩：`zip -r server.zip server/`
2. 上传到服务器：`scp server.zip user@server:/data/autoPpt/server/`
3. 在服务器上执行：
   ```bash
   cd /data/autoPpt/server/
   rm -f server.zip
   rm -rf server
   unzip server.zip
   cd server
   npm install
   nohup npm start >> nohup.out &
   /www/server/nginx/sbin/nginx -s reload
   ``` 