// 存储连接的端口
const ports = new Map();
// 存储待处理的图片数据
const pendingPublishData = new Map();

// 打印启动日志
console.log('[Background] Service worker starting...');

// 监听连接
chrome.runtime.onConnect.addListener((port) => {
  const tabId = port.sender?.tab?.id;
  console.log('[Background] New connection attempt:', { 
    name: port.name, 
    tabId,
    url: port.sender?.tab?.url 
  });

  if (!tabId) {
    console.error('[Background] Invalid connection - no tab ID');
    return;
  }

  ports.set(tabId, port);
  console.log('[Background] Connection established, total connections:', ports.size);

  port.onDisconnect.addListener(() => {
    console.log('[Background] Connection closed:', port.name);
    ports.delete(tabId);
    console.log('[Background] Remaining connections:', ports.size);
  });

  port.onMessage.addListener((message) => {
    console.log('[Background] Received message:', { tabId, message });
    
    if (message.type === 'PUBLISH_REQUEST') {
      handlePublishRequest(message.data, message.requestId, port, tabId);
    }
  });
});

async function handlePublishRequest(data, requestId, port, sourceTabId) {
  try {
    console.log('[Background] Processing publish request:', data);
    console.log('[Background] DEBUG: Attempting to open Xiaohongshu publish page...');
    
    // 存储图片数据，以便在新页面中使用
    pendingPublishData.set(requestId, {
      images: data.images,
      title: data.title,
      sourceTabId: sourceTabId,
      sourcePort: port
    });
    
    // 向源标签页发送状态更新 - 在打开标签页之前先通知
    try {
      port.postMessage({
        type: 'PUBLISH_STATUS',
        requestId: requestId,
        status: 'processing',
        message: '正在准备打开小红书发布页面...'
      });
    } catch (error) {
      console.error('[Background] Error sending processing status:', error);
    }
    
    // 打开小红书发布页面 - 使用更直接的方式
    try {
      // 使用chrome.tabs.create打开新标签页
      chrome.tabs.create(
        {
          url: 'https://creator.xiaohongshu.com/publish/publish?from=menu',
          active: true
        }, 
        function(newTab) {
          console.log('[Background] Created new tab:', newTab.id);
          
          // 创建一个监听器来等待页面加载完成
          function tabUpdatedListener(tabId, changeInfo, tab) {
            // 检查是否是我们打开的标签页，以及是否加载完成
            if (tabId === newTab.id && changeInfo.status === 'complete') {
              console.log('[Background] Tab content loaded completely:', tabId);
              
              // 移除监听器
              chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
              
              // 等待页面DOM加载，然后发送消息
              setTimeout(() => {
                try {
                  chrome.tabs.sendMessage(
                    newTab.id,
                    {
                      type: 'XHS_START_PUBLISH',
                      requestId: requestId,
                      data: data
                    },
                    (response) => {
                      if (chrome.runtime.lastError) {
                        console.error('[Background] Error sending message to tab:', chrome.runtime.lastError);
                      } else {
                        console.log('[Background] Message sent successfully, response:', response);
                      }
                    }
                  );
                } catch (err) {
                  console.error('[Background] Failed to send message to tab:', err);
                }
              }, 3000); // 增加延迟，给页面更多时间加载
            }
          }
          
          // 添加标签页更新监听器
          chrome.tabs.onUpdated.addListener(tabUpdatedListener);
        }
      );
      
      // 再次通知源标签页，确认标签页已创建
      port.postMessage({
        type: 'PUBLISH_STATUS',
        requestId: requestId,
        status: 'processing',
        message: '已打开小红书发布页面，正在处理...'
      });
      
    } catch (tabError) {
      console.error('[Background] Error creating tab:', tabError);
      throw new Error('无法打开小红书发布页面: ' + tabError.message);
    }
  } catch (error) {
    console.error('[Background] Error handling publish request:', error);
    try {
      port.postMessage({
        type: 'PUBLISH_STATUS',
        requestId: requestId,
        status: 'error',
        error: error.message || '发布失败'
      });
    } catch (sendError) {
      console.error('[Background] Error sending error response:', sendError);
    }
  }
}

// 监听来自小红书页面的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received runtime message:', message, 'from:', sender.tab?.id);
  
  if (message.type === 'XHS_PUBLISH_COMPLETE') {
    const requestId = message.requestId;
    const publishData = pendingPublishData.get(requestId);
    
    if (publishData && publishData.sourcePort) {
      try {
        // 发送成功响应给源标签页
        publishData.sourcePort.postMessage({
          type: 'PUBLISH_STATUS',
          requestId: requestId,
          status: 'success'
        });
        console.log('[Background] Sent success response for request:', requestId);
      } catch (error) {
        console.error('[Background] Error sending success response:', error);
      }
      
      // 清理存储的数据
      pendingPublishData.delete(requestId);
    }
  } else if (message.type === 'XHS_PUBLISH_ERROR') {
    const requestId = message.requestId;
    const publishData = pendingPublishData.get(requestId);
    
    if (publishData && publishData.sourcePort) {
      try {
        // 发送错误响应给源标签页
        publishData.sourcePort.postMessage({
          type: 'PUBLISH_STATUS',
          requestId: requestId,
          status: 'error',
          error: message.error || '发布失败'
        });
      } catch (error) {
        console.error('[Background] Error sending error response:', error);
      }
      
      // 清理存储的数据
      pendingPublishData.delete(requestId);
    }
  } else if (message.type === 'XHS_GET_PENDING_DATA') {
    // 检查是否有等待发布的数据
    console.log('[Background] XHS page is requesting pending data');
    console.log('[Background] Current pending data count:', pendingPublishData.size);
    
    // 查找与此标签页匹配的待处理数据
    for (const [requestId, data] of pendingPublishData.entries()) {
      console.log('[Background] Found pending data for request:', requestId);
      sendResponse({
        type: 'XHS_PENDING_DATA',
        requestId: requestId,
        data: {
          images: data.images,
          title: data.title
        }
      });
      return true; // 表示将异步发送响应
    }
    
    // 没有找到待处理的数据
    console.log('[Background] No pending publish data found');
    sendResponse({ type: 'NO_PENDING_DATA' });
  }
  
  return false;
});

// 监听扩展安装/更新事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
}); 