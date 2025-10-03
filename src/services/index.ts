import axios from './config'
import presentationService from './presentation'
interface VolcengineImageParams {
  text_prompt: string
  negative_prompt?: string
  style_id?: string
  resolution?: string
  n?: number
  seed?: number
  image_type: 'doubao' | 'volcengine'
  output_format: 'webp' | 'jpeg'
  scale_ratio?: number
}

// API服务器URL - 修改为总是使用本地服务器
export const SERVER_URL = (import.meta.env.MODE === 'development') 
  ? 'http://localhost:3002/api' 
  : '/api'

// export const SERVER_URL = 'https://server.pptist.cn'

// 添加开发环境下的直接API地址
export const DEV_API_URL = 'http://localhost:3002/api'

// 资源URL - 使用本地服务器
export const ASSET_URL = (import.meta.env.MODE === 'development') 
  ? 'http://localhost:3002/assets' 
  : '/assets'

// 允许通过环境变量覆盖资源URL
export const LOCAL_ASSET_URL = import.meta.env.VITE_LOCAL_ASSET_URL || ASSET_URL

type TemplateCacheEntry = {
  data: any
  etag?: string
  lastModified?: string
  timestamp: number
}

const TEMPLATE_CACHE_PREFIX = 'auto-ppt:template:'
const inMemoryTemplateCache = new Map<string, TemplateCacheEntry>()

const hasBrowserStorage = (() => {
  if (typeof window === 'undefined') return false
  try {
    const key = '__template_cache_check__'
    window.localStorage.setItem(key, key)
    window.localStorage.removeItem(key)
    return true
  } catch (_) {
    return false
  }
})()

function getTemplateCacheKey(filename: string): string {
  return `${TEMPLATE_CACHE_PREFIX}${filename}`
}

function readTemplateCache(filename: string): TemplateCacheEntry | undefined {
  if (inMemoryTemplateCache.has(filename)) {
    return inMemoryTemplateCache.get(filename)
  }

  if (!hasBrowserStorage) return undefined

  try {
    const raw = window.localStorage.getItem(getTemplateCacheKey(filename))
    if (!raw) return undefined
    const parsed: TemplateCacheEntry = JSON.parse(raw)
    inMemoryTemplateCache.set(filename, parsed)
    return parsed
  } catch (_) {
    return undefined
  }
}

function writeTemplateCache(filename: string, entry: TemplateCacheEntry): void {
  inMemoryTemplateCache.set(filename, entry)

  if (!hasBrowserStorage) return

  try {
    window.localStorage.setItem(getTemplateCacheKey(filename), JSON.stringify(entry))
  } catch (_) {
    // 忽略缓存写入失败（例如存储空间不足）
  }
}

async function fetchTemplateWithNegotiation(
  filename: string,
  cached?: TemplateCacheEntry,
): Promise<TemplateCacheEntry> {
  const url = `${ASSET_URL}/data/${filename}.json`

  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    // 非浏览器环境下退回到 axios
    const data = await axios.get(url)
    const entry: TemplateCacheEntry = {
      data,
      timestamp: Date.now(),
    }
    writeTemplateCache(filename, entry)
    return entry
  }

  const headers = new Headers()
  if (cached?.etag) {
    headers.set('If-None-Match', cached.etag)
  } else if (cached?.lastModified) {
    headers.set('If-Modified-Since', cached.lastModified)
  }

  try {
    const response = await fetch(url, {
      headers,
      cache: 'no-cache',
    })

    if (response.status === 304 && cached) {
      return cached
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch template ${filename}: ${response.status}`)
    }

    const data = await response.json()
    const entry: TemplateCacheEntry = {
      data,
      etag: response.headers.get('ETag') || undefined,
      lastModified: response.headers.get('Last-Modified') || undefined,
      timestamp: Date.now(),
    }
    writeTemplateCache(filename, entry)
    return entry
  } catch (error) {
    if (cached) {
      return cached
    }
    throw error
  }
}

// 导出统一的API服务
export default {
  /**
   * 获取模拟数据
   */
  getMockData(filename: string): Promise<any> {
    return axios.get(`${LOCAL_ASSET_URL}/data/${filename}.json`)
  },

  /**
   * 获取文件数据
   */
  async getFileData(filename: string): Promise<any> {
    const cached = readTemplateCache(filename)
    if (cached) {
      const revalidationPromise = fetchTemplateWithNegotiation(filename, cached)
      const guardedRevalidation = revalidationPromise.catch(() => cached)

      const entry = await Promise.race([
        guardedRevalidation,
        new Promise<TemplateCacheEntry>(resolve => {
          setTimeout(() => resolve(cached), 200)
        }),
      ])

      if (entry === cached) {
        void revalidationPromise
          .then(updated => {
            if (updated !== cached && typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('template-cache-updated', {
                  detail: { filename, data: updated.data },
                })
              )
            }
          })
          .catch(() => undefined)
      }

      return entry.data
    }

    const freshEntry = await fetchTemplateWithNegotiation(filename)
    return freshEntry.data
  },

  /**
   * 获取资源URL
   */
  getAssetUrl(path: string): string {
    // 如果路径已经是完整URL，则直接返回
    if (path.startsWith('http') || path.startsWith('//')) {
      return path
    }
    
    // 始终使用配置的资源URL
    return `${LOCAL_ASSET_URL}/${path}`
  },

  /**
   * AI PPT大纲生成
   */
  AIPPT_Outline(
    content: string,
    language: string,
    model: string,
  ): Promise<any> {
    return fetch(`${SERVER_URL}/tools/aippt_outline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        language,
        model,
        stream: true,
      }),
    })
  },

  /**
   * AI PPT生成
   */
  AIPPT(
    content: string,
    language: string,
    model: string,
    templateId: string = 'default'
  ): Promise<any> {
    return fetch(`${SERVER_URL}/tools/aippt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        language,
        model,
        templateId,
        stream: true,
      }),
    })
  },

  /**
   * 使用Coze工作流生成图片
   */
  async generateVolcengineImage(params: {
    prompt: string
    api_token?: string
    workflow_id?: string
  }): Promise<{
    image_url: string
    workflow_id?: string
    is_mock?: boolean
  }> {
    const workflow_id = params.workflow_id || '7497907182836858915' // 默认工作流ID
    
    const response = await fetch(`${SERVER_URL}/ai/volcengine/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: params.prompt,
        api_token: params.api_token,
        workflow_id
      })
    })

    if (!response.ok) {
      throw new Error(`生成图片失败: ${response.statusText}`)
    }

    return await response.json()
  },

  // 导出演示文稿服务方法
  ...presentationService,
}
