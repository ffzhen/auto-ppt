#!/bin/bash

# 后端部署脚本
echo "===== 开始后端部署 ====="

# 1. 压缩server目录
echo "1. 压缩server目录为server.zip..."
zip -r server.zip server/

# 检查压缩是否成功
if [ $? -ne 0 ]; then
  echo "压缩失败，请检查错误信息"
  exit 1
fi

# 2. 上传到服务器
echo "2. 上传server.zip到服务器..."
echo "请确保您已经配置好SSH密钥，并且有权限访问服务器"
echo "请输入服务器IP地址:"
read server_ip

echo "请输入服务器用户名:"
read server_user

echo "请输入服务器密码:"
read -s server_password
echo ""

# 使用scp上传文件
echo "正在上传server.zip到服务器..."
sshpass -p "$server_password" scp -o StrictHostKeyChecking=no server.zip $server_user@$server_ip:/data/autoPpt/server/

# 检查上传是否成功
if [ $? -ne 0 ]; then
  echo "上传失败，请检查网络连接和服务器信息"
  exit 1
fi

# 3. 在服务器上执行部署命令
echo "3. 在服务器上执行部署命令..."
sshpass -p "$server_password" ssh -o StrictHostKeyChecking=no $server_user@$server_ip << EOF
  cd /data/autoPpt/server/
  rm -f server.zip
  rm -rf server
  unzip server.zip
  cd server
  npm install
  # 检查是否有正在运行的后端服务，如果有则停止
  if pgrep -f "node.*server" > /dev/null; then
    echo "停止现有的后端服务..."
    pkill -f "node.*server"
    sleep 2
  fi
  # 启动后端服务
  nohup npm start >> nohup.out &
  sleep 5
  # 检查服务是否成功启动
  if netstat -tulnp | grep 3002 > /dev/null; then
    echo "后端服务启动成功"
  else
    echo "后端服务启动失败，请检查日志"
    tail -n 20 nohup.out
  fi
  /www/server/nginx/sbin/nginx -s reload
EOF

# 检查远程命令执行是否成功
if [ $? -ne 0 ]; then
  echo "服务器端部署失败，请检查错误信息"
  exit 1
fi

echo "===== 后端部署完成 =====" 