// 页面脚本 - 将被直接注入到网页上下文中
(function() {
  // 存储未完成的请求
  const pendingRequests = new Map();
  
  // 创建全局辅助对象
  window.pptistXHSHelper = {
    isInstalled: true,
    version: '1.0.0',
    
    // 发布方法
    publish: function(data) {
      return new Promise((resolve, reject) => {
        try {
          console.log('[Page] Starting publish process, data:', {
            title: data.title,
            imagesCount: data.images ? data.images.length : 0
          });
          
          // 生成唯一请求ID
          const requestId = 'req_' + Date.now().toString();
          console.log('[Page] Generated request ID:', requestId);
          
          // 存储请求，以便后续响应处理
          pendingRequests.set(requestId, { resolve, reject });
          
          // 发送请求
          window.postMessage({
            type: 'XHS_PUBLISH_REQUEST',
            requestId: requestId,
            data: data
          }, '*');
          
          console.log('[Page] Sent publish request:', requestId);
          
          // 设置超时处理
          setTimeout(() => {
            if (pendingRequests.has(requestId)) {
              pendingRequests.delete(requestId);
              const timeoutError = new Error('发布请求超时');
              console.error('[Page] Request timed out:', requestId, timeoutError);
              reject(timeoutError);
            }
          }, 30000); // 30秒超时
        } catch (error) {
          console.error('[Page] Error sending publish request:', error);
          reject(error);
        }
      });
    }
  };
  
  // 监听响应
  window.addEventListener('message', function(event) {
    // 确保消息来自同源
    if (event.source !== window) return;
    
    if (event.data.type === 'XHS_PUBLISH_RESPONSE') {
      const requestId = event.data.requestId;
      console.log('[Page] Received response for request:', requestId, 'status:', event.data.status);
      
      // 查找对应的请求
      const pendingRequest = pendingRequests.get(requestId);
      if (!pendingRequest) {
        console.warn('[Page] No pending request found for:', requestId);
        return;
      }
      
      // 移除请求
      pendingRequests.delete(requestId);
      
      // 处理响应
      if (event.data.status === 'success') {
        console.log('[Page] Request successful:', requestId);
        pendingRequest.resolve(event.data);
      } else {
        const error = new Error(event.data.error || '发布失败');
        console.error('[Page] Request failed:', requestId, error);
        pendingRequest.reject(error);
      }
    }
  });
  
  // 通知页面插件已加载
  console.log('PPTist 小红书发布助手已加载');
  window.dispatchEvent(new CustomEvent('pptist-xhs-helper-loaded'));
})(); 