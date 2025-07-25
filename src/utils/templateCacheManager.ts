import { TEMPLATE_CACHE_CONFIG, hasEnoughStorage } from '@/configs/templateCache'

export interface CacheStats {
  totalTemplates: number
  cachedTemplates: number
  cacheSize: number
  hitRate: number
  lastUpdated: number
}

export class TemplateCacheManager {
  private cacheHits = 0
  private cacheMisses = 0
  private memoryCache = new Map<string, any>()
  
  constructor() {
    this.initMemoryCacheCleanup()
  }

  // 初始化内存缓存清理机制
  private initMemoryCacheCleanup() {
    // 定期清理内存缓存，防止内存泄露
    setInterval(() => {
      if (this.memoryCache.size > TEMPLATE_CACHE_CONFIG.MEMORY_CACHE_LIMIT) {
        console.log('[CacheManager] Memory cache size exceeded, cleaning up...')
        this.cleanupMemoryCache()
      }
    }, 60000) // 每分钟检查一次
  }

  // 清理内存缓存（LRU策略）
  private cleanupMemoryCache() {
    const entries = Array.from(this.memoryCache.entries())
    
    // 简单的LRU实现：保留最近使用的一半
    const keepCount = Math.floor(TEMPLATE_CACHE_CONFIG.MEMORY_CACHE_LIMIT / 2)
    const toKeep = entries.slice(-keepCount)
    
    this.memoryCache.clear()
    toKeep.forEach(([key, value]) => {
      this.memoryCache.set(key, value)
    })
    
    console.log(`[CacheManager] Memory cache cleaned up, kept ${keepCount} items`)
  }

  // 获取缓存数据库
  async getDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        TEMPLATE_CACHE_CONFIG.CACHE_DB_NAME, 
        TEMPLATE_CACHE_CONFIG.CACHE_DB_VERSION
      )
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('template-metas')) {
          const metaStore = db.createObjectStore('template-metas', { keyPath: 'id' })
          metaStore.createIndex('lastUpdated', 'lastUpdated')
          metaStore.createIndex('size', 'size')
        }
        
        if (!db.objectStoreNames.contains('template-content')) {
          const contentStore = db.createObjectStore('template-content', { keyPath: 'id' })
          contentStore.createIndex('lastUpdated', 'lastUpdated')
          contentStore.createIndex('version', 'version')
        }
      }
    })
  }

  // 获取缓存统计信息
  async getCacheStats(): Promise<CacheStats> {
    try {
      const db = await this.getDatabase()
      const transaction = db.transaction(['template-metas', 'template-content'], 'readonly')
      
      const metaStore = transaction.objectStore('template-metas')
      const contentStore = transaction.objectStore('template-content')
      
      const [metaCount, contentCount] = await Promise.all([
        this.getStoreCount(metaStore),
        this.getStoreCount(contentStore)
      ])
      
      const totalRequests = this.cacheHits + this.cacheMisses
      const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0
      
      return {
        totalTemplates: metaCount,
        cachedTemplates: contentCount,
        cacheSize: await this.calculateCacheSize(),
        hitRate,
        lastUpdated: Date.now()
      }
    } catch (error) {
      console.error('[CacheManager] Error getting cache stats:', error)
      return {
        totalTemplates: 0,
        cachedTemplates: 0,
        cacheSize: 0,
        hitRate: 0,
        lastUpdated: Date.now()
      }
    }
  }

  // 获取存储对象的记录数量
  private getStoreCount(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 计算缓存总大小
  private async calculateCacheSize(): Promise<number> {
    try {
      const db = await this.getDatabase()
      const transaction = db.transaction(['template-content'], 'readonly')
      const store = transaction.objectStore('template-content')
      
      return new Promise((resolve, reject) => {
        let totalSize = 0
        const request = store.openCursor()
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            const data = cursor.value
            totalSize += JSON.stringify(data.data).length
            cursor.continue()
          } else {
            resolve(totalSize)
          }
        }
        
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('[CacheManager] Error calculating cache size:', error)
      return 0
    }
  }

  // 记录缓存命中
  recordCacheHit() {
    this.cacheHits++
  }

  // 记录缓存未命中
  recordCacheMiss() {
    this.cacheMisses++
  }

  // 清理过期缓存
  async cleanupExpiredCache(): Promise<void> {
    try {
      const db = await this.getDatabase()
      const transaction = db.transaction(['template-metas', 'template-content'], 'readwrite')
      
      const now = Date.now()
      const expiredThreshold = now - TEMPLATE_CACHE_CONFIG.CACHE_EXPIRY_TIME
      
      const metaStore = transaction.objectStore('template-metas')
      const contentStore = transaction.objectStore('template-content')
      
      // 清理过期的模板元信息
      await this.cleanupExpiredFromStore(metaStore, expiredThreshold)
      
      // 清理过期的模板内容
      await this.cleanupExpiredFromStore(contentStore, expiredThreshold)
      
      console.log('[CacheManager] Expired cache cleaned up')
    } catch (error) {
      console.error('[CacheManager] Error cleaning up expired cache:', error)
    }
  }

  // 从指定存储中清理过期数据
  private cleanupExpiredFromStore(store: IDBObjectStore, expiredThreshold: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const index = store.index('lastUpdated')
      const range = IDBKeyRange.upperBound(expiredThreshold)
      const request = index.openCursor(range)
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  // 检查存储空间并清理
  async ensureStorageSpace(requiredSize: number): Promise<boolean> {
    const hasSpace = await hasEnoughStorage(requiredSize)
    
    if (!hasSpace) {
      console.warn('[CacheManager] Insufficient storage space, attempting cleanup...')
      await this.cleanupExpiredCache()
      
      // 再次检查
      return await hasEnoughStorage(requiredSize)
    }
    
    return true
  }

  // 获取内存缓存
  getFromMemoryCache(key: string): any | null {
    const value = this.memoryCache.get(key)
    if (value) {
      // 更新访问时间（简单的LRU）
      this.memoryCache.delete(key)
      this.memoryCache.set(key, value)
      this.recordCacheHit()
      return value
    }
    return null
  }

  // 设置内存缓存
  setMemoryCache(key: string, value: any): void {
    this.memoryCache.set(key, value)
    
    // 检查缓存大小限制
    if (this.memoryCache.size > TEMPLATE_CACHE_CONFIG.MEMORY_CACHE_LIMIT) {
      this.cleanupMemoryCache()
    }
  }

  // 获取缓存命中率
  getCacheHitRate(): number {
    const totalRequests = this.cacheHits + this.cacheMisses
    return totalRequests > 0 ? this.cacheHits / totalRequests : 0
  }
}

// 创建全局缓存管理器实例
export const templateCacheManager = new TemplateCacheManager() 