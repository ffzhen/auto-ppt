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
  ? 'http://localhost:4001/api' 
  : 'https://server.pptist.cn'

  // export const SERVER_URL = 'https://server.pptist.cn'

// 添加开发环境下的直接API地址
export const DEV_API_URL = 'http://localhost:4001/api'

// 资源URL - 使用本地服务器
export const ASSET_URL = (import.meta.env.MODE === 'development') 
  ? 'http://localhost:4001/assets' 
  : 'https://asset.pptist.cn'

// 允许通过环境变量覆盖资源URL
export const LOCAL_ASSET_URL = import.meta.env.VITE_LOCAL_ASSET_URL || ASSET_URL

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
  getFileData(filename: string): Promise<any> {
    return axios.get(`${ASSET_URL}/data/${filename}.json`)
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