// 模板缓存配置
export const TEMPLATE_CACHE_CONFIG = {
  // 缓存过期时间（毫秒）
  CACHE_EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24小时
  
  // 模板加载超时时间（毫秒）
  LOAD_TIMEOUT: 3000, // 3秒
  
  // 预加载的热门模板ID列表
  POPULAR_TEMPLATES: [
    'template001', // 虚拟资料卡片
    'template002', // 经典模板
    'template005', // 轻量级模板
    'template006', // 现代简约风格
  ],
  
  // 预加载并发限制
  PRELOAD_CONCURRENT_LIMIT: 2,
  
  // 预加载批次间延迟（毫秒）
  PRELOAD_BATCH_DELAY: 500,
  
  // 重试配置
  RETRY_COUNT: 2,
  RETRY_DELAY: 1000, // 1秒
  
  // 缓存数据库相关
  CACHE_DB_NAME: 'pptist-template-cache',
  CACHE_DB_VERSION: 1,
  
  // 内存缓存限制（模板数量）
  MEMORY_CACHE_LIMIT: 10,
}

// 模板大小分类配置
export const TEMPLATE_SIZE_CONFIG = {
  // 小型模板阈值（字节）
  SMALL_TEMPLATE_SIZE: 100 * 1024, // 100KB
  
  // 中型模板阈值（字节）
  MEDIUM_TEMPLATE_SIZE: 1024 * 1024, // 1MB
  
  // 大型模板阈值（字节）
  LARGE_TEMPLATE_SIZE: 5 * 1024 * 1024, // 5MB
}

// 根据模板大小获取加载策略
export function getLoadingStrategy(templateSize: number) {
  if (templateSize <= TEMPLATE_SIZE_CONFIG.SMALL_TEMPLATE_SIZE) {
    return {
      priority: 'high',
      timeout: 2000,
      shouldPreload: true
    }
  }
  
  if (templateSize <= TEMPLATE_SIZE_CONFIG.MEDIUM_TEMPLATE_SIZE) {
    return {
      priority: 'medium',
      timeout: 5000,
      shouldPreload: false
    }
  }
  
  return {
    priority: 'low',
    timeout: 10000,
    shouldPreload: false
  }
}

// 获取缓存存储配额信息
export async function getCacheStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0)
      }
    } catch (error) {
      console.warn('Failed to get storage estimate:', error)
    }
  }
  
  return {
    quota: 0,
    usage: 0,
    available: 0
  }
}

// 检查是否有足够的存储空间
export async function hasEnoughStorage(requiredSize: number): Promise<boolean> {
  const quota = await getCacheStorageQuota()
  return quota.available >= requiredSize
} 