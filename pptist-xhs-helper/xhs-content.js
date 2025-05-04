console.log('[XHS Content] Script loaded in Xiaohongshu publish page');

// 数据URL转换为Blob
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

// 等待元素出现
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // 处理 :contains() 选择器
    if (selector.includes(':contains(')) {
      console.log('[XHS Content] Using text content matching for selector:', selector);
      const parts = selector.match(/(.*)(:contains\(["'])(.*)(["']\))(.*)/);
      if (parts) {
        const [, beforePart, , textContent, , afterPart] = parts;
        const baseSelector = (beforePart + afterPart).trim();
        
        // 查找匹配的元素
        const tryFindWithTextContent = () => {
          let elements = [];
          try {
            elements = Array.from(document.querySelectorAll(baseSelector || '*'));
          } catch (e) {
            console.error('[XHS Content] Invalid selector:', baseSelector, e);
            elements = Array.from(document.querySelectorAll('*'));
          }
          
          // 查找包含指定文本的元素
          const matches = elements.filter(el => 
            el.textContent && el.textContent.includes(textContent)
          );
          
          if (matches.length > 0) {
            console.log('[XHS Content] Found element with text content:', textContent);
            resolve(matches[0]);
            return true;
          }
          return false;
        };
        
        // 立即尝试查找
        if (tryFindWithTextContent()) return;
        
        // 监视DOM变化
        const observer = new MutationObserver(() => {
          if (tryFindWithTextContent()) {
            observer.disconnect();
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // 设置超时
        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`等待包含文本 "${textContent}" 的元素超时`));
        }, timeout);
        
        return;
      }
    }
    
    // 标准选择器处理
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }
    
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 设置超时
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`等待元素 ${selector} 超时`));
    }, timeout);
  });
}

// 模拟点击
function simulateClick(element) {
  if (!element) return false;
  
  // 创建并分发点击事件
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  
  element.dispatchEvent(clickEvent);
  return true;
}

// 模拟输入文本
function simulateInput(element, text) {
  if (!element) return false;
  
  // 聚焦元素
  element.focus();
  
  // 设置值
  element.value = text;
  
  // 创建输入事件
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true
  });
  
  // 创建变更事件
  const changeEvent = new Event('change', {
    bubbles: true,
    cancelable: true
  });
  
  // 分发事件
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(changeEvent);
  
  return true;
}

// 上传图片
async function uploadImages(images) {
  try {
    console.log('[XHS Content] Uploading images, count:', images.length);
    
    // 尝试多种可能的上传区域选择器
    const uploadSelectors = [
      '.image-uploader', 
      '.publish-upload', 
      '.upload-area', 
      'input[type="file"]', 
      '[data-v-16fdb080] input[type="file"]',
      '.ant-upload input'
    ];
    
    let uploadArea = null;
    
    // 逐个尝试不同的选择器
    for (const selector of uploadSelectors) {
      try {
        uploadArea = await waitForElement(selector, 3000); // 用较短的超时时间
        if (uploadArea) {
          console.log('[XHS Content] Found upload area using selector:', selector);
          break;
        }
      } catch (e) {
        console.log('[XHS Content] Selector not found:', selector);
      }
    }
    
    if (!uploadArea) {
      throw new Error('无法找到上传区域');
    }
    
    console.log('[XHS Content] Upload area found:', uploadArea);
    
    // 模拟文件上传
    for (const imageDataUrl of images) {
      // 将数据URL转换为Blob
      const blob = dataURLtoBlob(imageDataUrl);
      
      // 创建文件对象
      const file = new File([blob], `image_${Date.now()}.png`, { type: 'image/png' });
      
      // 创建一个新的DataTransfer对象
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // 找到隐藏的文件输入元素
      let fileInput = uploadArea;
      
      // 如果找到的不是input元素，则尝试在其中查找input
      if (uploadArea.tagName !== 'INPUT') {
        fileInput = uploadArea.querySelector('input[type="file"]');
      }
      
      if (!fileInput) {
        throw new Error('找不到文件上传输入框');
      }
      
      console.log('[XHS Content] Found file input element:', fileInput);
      
      // 模拟文件选择
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        writable: false
      });
      
      // 触发change事件
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
      
      // 等待上传完成
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('[XHS Content] All images uploaded successfully');
    return true;
  } catch (error) {
    console.error('[XHS Content] Error uploading images:', error);
    return false;
  }
}

// 填写标题
async function fillTitle(title) {
  try {
    console.log('[XHS Content] Filling title:', title);
    
    // 尝试多种可能的标题输入框选择器
    const titleSelectors = [
      '.title-input', 
      '.publish-input', 
      '.textarea', 
      '[placeholder*="标题"]',
      'textarea[placeholder*="标题"]',
      'input[placeholder*="标题"]',
      '[data-v-*] .textarea'
    ];
    
    let titleInput = null;
    
    // 逐个尝试不同的选择器
    for (const selector of titleSelectors) {
      try {
        titleInput = await waitForElement(selector, 3000); // 用较短的超时时间
        if (titleInput) {
          console.log('[XHS Content] Found title input using selector:', selector);
          break;
        }
      } catch (e) {
        console.log('[XHS Content] Title selector not found:', selector);
      }
    }
    
    if (!titleInput) {
      throw new Error('无法找到标题输入框');
    }
    
    console.log('[XHS Content] Title input found:', titleInput);
    
    // 模拟输入标题
    simulateInput(titleInput, title);
    
    console.log('[XHS Content] Title filled successfully');
    return true;
  } catch (error) {
    console.error('[XHS Content] Error filling title:', error);
    return false;
  }
}

// 点击发布按钮
async function clickPublishButton() {
  try {
    console.log('[XHS Content] Attempting to click publish button');
    
    // 尝试多种可能的发布按钮选择器
    const buttonSelectors = [
      '.publish-btn', 
      '.submit-btn', 
      'button:contains("发布")', 
      'button:contains("提交")',
      'button.ant-btn-primary',
      '[data-v-*] button.primary',
      '.ant-btn-primary',
      '.operation-btn'
    ];
    
    let publishButton = null;
    
    // 逐个尝试不同的选择器
    for (const selector of buttonSelectors) {
      try {
        publishButton = await waitForElement(selector, 3000); // 用较短的超时时间
        if (publishButton) {
          console.log('[XHS Content] Found publish button using selector:', selector);
          break;
        }
      } catch (e) {
        console.log('[XHS Content] Button selector not found:', selector);
      }
    }
    
    if (!publishButton) {
      throw new Error('无法找到发布按钮');
    }
    
    console.log('[XHS Content] Publish button found:', publishButton);
    
    // 模拟点击
    simulateClick(publishButton);
    
    console.log('[XHS Content] Publish button clicked');
    return true;
  } catch (error) {
    console.error('[XHS Content] Error clicking publish button:', error);
    return false;
  }
}

// 处理发布过程
async function handlePublish(requestId, data) {
  try {
    console.log('[XHS Content] Starting publish process:', data);
    
    // 首先检查并点击"上传图文"标签
    try {
      console.log('[XHS Content] Looking for upload tab...');
      
      // 等待上传图文标签出现 - 使用多种可能的选择器
      const uploadTab = await waitForElement('.creator-tab, [data-v-16fdb080][data-v-a964f0b4], .title:contains("上传图文")');
      console.log('[XHS Content] Found upload tab:', uploadTab);
      
      // 模拟点击上传图文标签
      simulateClick(uploadTab);
      console.log('[XHS Content] Clicked upload tab');
      
      // 等待点击后页面加载
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (tabError) {
      console.log('[XHS Content] No upload tab found or already on upload page:', tabError);
      // 继续执行，因为可能已经在上传页面
    }
    
    // 上传图片
    const imagesUploaded = await uploadImages(data.images);
    if (!imagesUploaded) {
      throw new Error('图片上传失败');
    }
    
    // 填写标题
    const titleFilled = await fillTitle(data.title);
    if (!titleFilled) {
      throw new Error('标题填写失败');
    }
    
    // 点击发布按钮
    const publishClicked = await clickPublishButton();
    if (!publishClicked) {
      throw new Error('点击发布按钮失败');
    }
    
    // 通知发布成功
    chrome.runtime.sendMessage({
      type: 'XHS_PUBLISH_COMPLETE',
      requestId: requestId
    });
    
    console.log('[XHS Content] Publish process completed successfully');
  } catch (error) {
    console.error('[XHS Content] Publish process failed:', error);
    
    // 通知发布失败
    chrome.runtime.sendMessage({
      type: 'XHS_PUBLISH_ERROR',
      requestId: requestId,
      error: error.message
    });
  }
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[XHS Content] Received message:', message);
  
  if (message.type === 'XHS_START_PUBLISH') {
    // 开始发布流程
    handlePublish(message.requestId, message.data);
  }
});

// 页面加载完成后，请求待处理的数据
window.addEventListener('load', () => {
  console.log('[XHS Content] Page loaded, requesting pending data');
  initializePublishing();
});

// 确保DOM完全加载后再初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('[XHS Content] DOM content loaded');
});

// 如果页面已经加载完成，则直接初始化
if (document.readyState === 'complete') {
  console.log('[XHS Content] Page already loaded, initializing immediately');
  initializePublishing();
}

// 初始化发布流程
function initializePublishing() {
  console.log('[XHS Content] Initializing publishing process on URL:', window.location.href);
  
  // 延迟一点时间，确保页面完全渲染
  setTimeout(() => {
    // 向background请求待处理的数据
    chrome.runtime.sendMessage({ type: 'XHS_GET_PENDING_DATA' }, (response) => {
      if (response && response.type === 'XHS_PENDING_DATA') {
        console.log('[XHS Content] Received pending data:', response);
        handlePublish(response.requestId, response.data);
      } else {
        console.log('[XHS Content] No pending data available or error occurred');
      }
    });
  }, 1000);
} 