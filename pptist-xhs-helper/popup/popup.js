// 获取状态显示元素
const statusEl = document.getElementById('status');

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'PUBLISH_STATUS') {
    updateStatus(request.status, request.error);
  }
});

// 更新状态显示
function updateStatus(status, error = '') {
  statusEl.className = status;
  
  switch (status) {
    case 'success':
      statusEl.textContent = '发布成功！';
      break;
    case 'error':
      statusEl.textContent = `发布失败：${error}`;
      break;
    default:
      statusEl.textContent = '等待发布任务...';
  }
} 