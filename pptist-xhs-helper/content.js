console.log('[Content] Script starting...');

// 注入页面脚本
function injectPageScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('page-script.js');
    script.onload = function() {
      console.log('[Content] Page script injected successfully');
      this.remove(); // 注入后移除script标签
    };
    (document.head || document.documentElement).appendChild(script);
    console.log('[Content] Injecting page script:', script.src);
  } catch (error) {
    console.error('[Content] Failed to inject page script:', error);
  }
}

// 在页面加载时注入脚本
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectPageScript);
} else {
  injectPageScript();
}

// 端口管理
let port = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const pendingMessages = [];

// 建立连接
function connectToBackground() {
  if (isConnected || connectionAttempts >= MAX_RECONNECT_ATTEMPTS) return;
  
  connectionAttempts++;
  try {
    port = chrome.runtime.connect({ name: 'pptist-xhs-helper' });
    console.log('[Content] Connection to background established (attempt ' + connectionAttempts + ')');
    
    // 连接成功
    isConnected = true;
    
    // 设置断开连接处理程序
    port.onDisconnect.addListener(() => {
      console.log('[Content] Port disconnected');
      isConnected = false;
      port = null;
      
      // 如果是由于扩展重新加载导致的断开连接，尝试重新连接
      if (chrome.runtime.lastError) {
        console.log('[Content] Connection error:', chrome.runtime.lastError);
      }
      
      // 延迟重连
      setTimeout(connectToBackground, 1000);
    });
    
    // 设置消息处理程序
    port.onMessage.addListener((message) => {
      console.log('[Content] Received message from background:', message);
      handleBackgroundMessage(message);
    });
    
    // 发送所有挂起的消息
    while (pendingMessages.length > 0 && isConnected) {
      const pendingMessage = pendingMessages.shift();
      try {
        port.postMessage(pendingMessage);
        console.log('[Content] Sent pending message:', pendingMessage);
      } catch (error) {
        console.error('[Content] Error sending pending message:', error);
        pendingMessages.unshift(pendingMessage);
        break;
      }
    }
  } catch (error) {
    console.error('[Content] Failed to connect to background:', error);
    isConnected = false;
    port = null;
    
    // 延迟重连
    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(connectToBackground, 1000);
    }
  }
}

// 安全地发送消息
function sendMessageToBackground(message) {
  if (!isConnected) {
    console.log('[Content] Not connected, queuing message:', message);
    pendingMessages.push(message);
    connectToBackground();
    return false;
  }
  
  try {
    port.postMessage(message);
    return true;
  } catch (error) {
    console.error('[Content] Error sending message:', error);
    pendingMessages.push(message);
    isConnected = false;
    connectToBackground();
    return false;
  }
}

// 处理来自background的消息
function handleBackgroundMessage(message) {
  // 发布状态更新
  if (message.type === 'PUBLISH_STATUS') {
    const status = message.status;
    
    // 将响应转发回页面
    window.postMessage({
      type: 'XHS_PUBLISH_RESPONSE',
      requestId: message.requestId,
      status: message.status,
      error: message.error,
      message: message.message
    }, '*');
    
    // 处理发布成功的情况
    if (status === 'success') {
      console.log('[Content] Publish successful');
    }
    // 处理发布进行中的情况
    else if (status === 'processing') {
      console.log('[Content] Publish in progress:', message.message);
    }
    // 处理发布失败的情况
    else if (status === 'error') {
      console.error('[Content] Publish failed:', message.error);
    }
  }
}

// 初始连接
connectToBackground();

// // 监听网页发来的消息
// window.addEventListener('message', (event) => {
//   // 确保消息来自同源
//   if (event.source !== window) return;
  
//   // 处理发布请求
//   if (event.data.type === 'XHS_PUBLISH_REQUEST') {
//     console.log('[Content] Received publish request from page:', event.data);
//     console.log('[Content] Request data includes images count:', event.data.data?.images?.length || 'none');
    
//     // 转发请求到background
//     const sent = sendMessageToBackground({
//       type: 'PUBLISH_REQUEST',
//       requestId: event.data.requestId,
//       data: event.data.data
//     });
    
//     console.log('[Content] Request forwarded to background:', sent ? 'success' : 'queued');
//   } else {
//     console.log('[Content] Received other message type:', event.data.type);
//   }
// }); 