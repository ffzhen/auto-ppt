#!/bin/bash

# 前端部署脚本
echo "===== 开始前端部署 ====="

# 1. 打包
echo "1. 执行打包命令..."
npm run build-only

# 检查打包是否成功
if [ $? -ne 0 ]; then
  echo "打包失败，请检查错误信息"
  exit 1
fi

# 2. 压缩dist目录
echo "2. 压缩dist目录为dist.zip..."
zip -r dist.zip dist/

# 检查压缩是否成功
if [ $? -ne 0 ]; then
  echo "压缩失败，请检查错误信息"
  exit 1
fi

# 3. 上传到服务器
echo "3. 上传dist.zip到服务器..."
echo "请确保您已经配置好SSH密钥，并且有权限访问服务器"
echo "请输入服务器IP地址:"
read server_ip

echo "请输入服务器用户名:"
read server_user

echo "请输入服务器密码:"
read -s server_password
echo ""

# 使用scp上传文件
echo "正在上传dist.zip到服务器..."
sshpass -p "$server_password" scp -o StrictHostKeyChecking=no dist.zip $server_user@$server_ip:/data/autoPpt/

# 检查上传是否成功
if [ $? -ne 0 ]; then
  echo "上传失败，请检查网络连接和服务器信息"
  exit 1
fi

# 4. 在服务器上执行部署命令
echo "4. 在服务器上执行部署命令..."
sshpass -p "$server_password" ssh -o StrictHostKeyChecking=no $server_user@$server_ip << EOF
  cd /data/autoPpt/
  rm -f dist.zip
  rm -rf dist
  unzip dist.zip
  /www/server/nginx/sbin/nginx -s reload
EOF

# 检查远程命令执行是否成功
if [ $? -ne 0 ]; then
  echo "服务器端部署失败，请检查错误信息"
  exit 1
fi

echo "===== 前端部署完成 =====" 