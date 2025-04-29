#!/bin/bash

# 自动部署脚本
echo "===== Auto-PPT 部署脚本 ====="

# 加载配置文件
if [ -f "deploy.config" ]; then
  source deploy.config
  echo "已加载配置文件"
else
  echo "错误: 未找到配置文件 deploy.config"
  exit 1
fi

# 检查是否安装了必要的工具
check_dependencies() {
  echo "检查依赖..."
  
  # 检查zip命令
  if ! command -v zip &> /dev/null; then
    echo "错误: 未安装zip命令，请安装zip"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      echo "在macOS上可以使用: brew install zip"
    else
      echo "在Ubuntu/Debian上可以使用: sudo apt-get install zip"
      echo "在CentOS/RHEL上可以使用: sudo yum install zip"
    fi
    exit 1
  fi
  
  # 检查sshpass命令
  if ! command -v sshpass &> /dev/null; then
    echo "警告: 未安装sshpass命令，将使用交互式SSH登录"
    echo "如需自动登录，请安装sshpass:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      echo "在macOS上可以使用: brew install sshpass"
    else
      echo "在Ubuntu/Debian上可以使用: sudo apt-get install sshpass"
      echo "在CentOS/RHEL上可以使用: sudo yum install sshpass"
    fi
    USE_SSHPASS=false
  else
    USE_SSHPASS=true
  fi

  # 检查服务器上的必要工具
  echo "检查服务器上的必要工具..."
  if ! execute_ssh_command "command -v lsof &> /dev/null"; then
    echo "服务器上未安装lsof，正在安装..."
    execute_ssh_command "if command -v apt-get &> /dev/null; then sudo apt-get update && sudo apt-get install -y lsof; elif command -v yum &> /dev/null; then sudo yum install -y lsof; fi"
  fi

  if ! execute_ssh_command "command -v fuser &> /dev/null"; then
    echo "服务器上未安装fuser，正在安装..."
    execute_ssh_command "if command -v apt-get &> /dev/null; then sudo apt-get update && sudo apt-get install -y psmisc; elif command -v yum &> /dev/null; then sudo yum install -y psmisc; fi"
  fi
  
  echo "依赖检查完成"
}

# 执行SSH命令
execute_ssh_command() {
  local command="$1"
  
  if [ "$USE_SSHPASS" = true ]; then
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$command"
  else
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$command"
  fi
}

# 执行SCP命令
execute_scp_command() {
  local source="$1"
  local destination="$2"
  
  if [ "$USE_SSHPASS" = true ]; then
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no "$source" "$SERVER_USER@$SERVER_IP:$destination"
  else
    scp -o StrictHostKeyChecking=no "$source" "$SERVER_USER@$SERVER_IP:$destination"
  fi
}

# 检查远程文件是否存在
check_remote_file() {
  local file_path="$1"
  execute_ssh_command "[ -f $file_path ] && echo '文件存在' || echo '文件不存在'"
}

# 部署前端
deploy_frontend() {
  echo "===== 开始前端部署 ====="
  
  # 1. 打包
  echo "1. 执行打包命令..."
  npm run build-only
  
  # 检查打包是否成功
  if [ $? -ne 0 ]; then
    echo "打包失败，请检查错误信息"
    return 1
  fi
  
  # 2. 压缩dist目录
  echo "2. 压缩dist目录为dist.zip..."
  rm -f dist.zip  # 删除可能存在的旧文件
  zip -r dist.zip dist/
  
  # 检查压缩是否成功
  if [ $? -ne 0 ]; then
    echo "压缩失败，请检查错误信息"
    return 1
  fi
  
  # 3. 上传到服务器
  echo "3. 上传dist.zip到服务器..."
  echo "正在上传dist.zip到服务器..."
  execute_scp_command "dist.zip" "/data/autoPpt/dist.zip"
  
  # 检查上传是否成功
  if [ $? -ne 0 ]; then
    echo "上传失败，请检查网络连接和服务器信息"
    return 1
  fi
  
  # 验证文件是否成功上传
  echo "验证文件上传..."
  if ! execute_ssh_command "[ -f /data/autoPpt/dist.zip ]"; then
    echo "错误: 文件上传验证失败"
    return 1
  fi
  
  # 4. 在服务器上执行部署命令
  echo "4. 在服务器上执行部署命令..."
  execute_ssh_command "cd /data/autoPpt/ && rm -rf dist && unzip -o dist.zip && rm -f dist.zip && /www/server/nginx/sbin/nginx -s reload"
  
  # 检查远程命令执行是否成功
  if [ $? -ne 0 ]; then
    echo "服务器端部署失败，请检查错误信息"
    return 1
  fi
  
  # 清理本地文件
  rm -f dist.zip
  
  echo "===== 前端部署完成 ====="
  return 0
}

# 部署后端
deploy_backend() {
  echo "===== 开始后端部署 ====="
  
  # 1. 压缩server目录
  echo "1. 压缩server目录为server.zip..."
  rm -f server.zip  # 删除可能存在的旧文件
  zip -r server.zip server/
  
  # 检查压缩是否成功
  if [ $? -ne 0 ]; then
    echo "压缩失败，请检查错误信息"
    return 1
  fi
  
  # 2. 上传到服务器
  echo "2. 上传server.zip到服务器..."
  echo "正在上传server.zip到服务器..."
  execute_scp_command "server.zip" "/data/autoPpt/server/server.zip"
  
  # 检查上传是否成功
  if [ $? -ne 0 ]; then
    echo "上传失败，请检查网络连接和服务器信息"
    return 1
  fi
  
  # 验证文件是否成功上传
  echo "验证文件上传..."
  if ! execute_ssh_command "[ -f /data/autoPpt/server/server.zip ]"; then
    echo "错误: 文件上传验证失败"
    return 1
  fi
  
  # 3. 在服务器上执行部署命令
  echo "3. 在服务器上执行部署命令..."
  
  # 3.1 解压文件
  echo "3.1 解压文件..."
  execute_ssh_command "cd /data/autoPpt/server/ && rm -rf server && unzip -o server.zip && rm -f server.zip"
  if [ $? -ne 0 ]; then
    echo "解压失败，请检查错误信息"
    return 1
  fi
  
  # 3.2 安装依赖
  echo "3.2 安装依赖..."
  execute_ssh_command "cd /data/autoPpt/server/server && npm install"
  if [ $? -ne 0 ]; then
    echo "依赖安装失败，请检查错误信息"
    return 1
  fi
  
  # 3.3 停止现有服务
  echo "3.3 检查并停止现有服务..."
  execute_ssh_command "if pgrep -f 'node.*server' > /dev/null; then echo '停止现有的后端服务...' && pkill -f 'node.*server' && sleep 2; fi"
  
  # 3.3.1 确保端口被释放
  echo "3.3.1 确保端口3002被释放..."
  execute_ssh_command "if lsof -i :3002 > /dev/null; then echo '强制释放端口3002...' && fuser -k 3002/tcp && sleep 2; fi"
  
  # 3.4 启动新服务
  echo "3.4 启动新服务..."
  execute_ssh_command "cd /data/autoPpt/server/server && nohup npm start > nohup.out 2>&1 & echo \$! > server.pid"
  
  # 3.5 等待服务启动并检查
  echo "3.5 等待服务启动并检查..."
  sleep 5
  
  # 检查服务是否成功启动
  echo "检查服务状态..."
  if execute_ssh_command "ps -p \$(cat /data/autoPpt/server/server/server.pid) > /dev/null 2>&1"; then
    echo "服务已成功启动"
  else
    echo "错误: 服务启动失败"
    return 1
  fi
  
  # 检查端口
  echo "检查服务端口..."
  execute_ssh_command "if netstat -tulnp | grep 3002 > /dev/null; then echo '后端服务端口检查成功'; else echo '后端服务端口检查失败'; fi"
  
  # 查看日志
  echo "查看服务日志..."
  execute_ssh_command "tail -n 20 /data/autoPpt/server/server/nohup.out"
  
  # 3.6 重载nginx
  echo "3.6 重载nginx配置..."
  execute_ssh_command "/www/server/nginx/sbin/nginx -s reload"
  
  # 清理本地文件
  rm -f server.zip
  
  echo "===== 后端部署完成 ====="
  return 0
}

# 主函数
main() {
  # 检查依赖
  check_dependencies
  
  # 选择部署内容
  echo "请选择要部署的内容:"
  echo "1. 仅部署前端"
  echo "2. 仅部署后端"
  echo "3. 同时部署前端和后端"
  read -p "请输入选项 (1/2/3): " deploy_option
  
  case $deploy_option in
    1)
      deploy_frontend
      ;;
    2)
      deploy_backend
      ;;
    3)
      deploy_frontend
      if [ $? -eq 0 ]; then
        deploy_backend
      fi
      ;;
    *)
      echo "无效的选项，请重新运行脚本"
      exit 1
      ;;
  esac
  
  echo "===== 部署完成 ====="
}

# 执行主函数
main 