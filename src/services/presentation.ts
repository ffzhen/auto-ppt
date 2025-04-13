import axios from './config'
// 不再从index导入SERVER_URL和DEV_API_URL，避免循环引用
import type { Slide, SlideTheme } from '@/types/slides'

// 直接在这里定义API基础URL
const API_BASE = (import.meta.env.MODE === 'development') 
  ? 'http://localhost:8080/api'
  : '/api'

export interface PresentationData {
  id: string
  title: string
  slides: Slide[]
  theme: SlideTheme
  viewportRatio: number
  createdAt: string
  updatedAt: string
}

export interface CreatePresentationOptions {
  title?: string
  viewportRatio?: number  // Default aspect ratio (16:9 = 0.5625, 16:10 = 0.625)
  theme?: Partial<SlideTheme>
}

export interface ExportLinkResponse {
  message: string
  downloadLink: string
  filename: string
  expiresIn: string
}

export default {
  /**
   * Create a new presentation
   */
  createPresentation(options: CreatePresentationOptions = {}): Promise<PresentationData> {
    return axios.post(`${API_BASE}/presentations`, {
      title: options.title || '未命名演示文稿',
      viewportRatio: options.viewportRatio || 0.5625, // Default to 16:9
      theme: options.theme || {},
    })
  },

  /**
   * Get a presentation by ID
   */
  getPresentation(id: string): Promise<PresentationData> {
    return axios.get(`${API_BASE}/presentations/${id}`)
  },

  /**
   * Update a presentation
   */
  updatePresentation(id: string, data: Partial<PresentationData>): Promise<PresentationData> {
    return axios.put(`${API_BASE}/presentations/${id}`, data)
  },

  /**
   * Delete a presentation
   */
  deletePresentation(id: string): Promise<void> {
    return axios.delete(`${API_BASE}/presentations/${id}`)
  },

  /**
   * Get all presentations for the current user
   */
  getUserPresentations(): Promise<PresentationData[]> {
    return axios.get(`${API_BASE}/presentations`)
  },

  /**
   * Clone a presentation
   */
  clonePresentation(id: string, newTitle?: string): Promise<PresentationData> {
    return axios.post(`${API_BASE}/presentations/${id}/clone`, {
      title: newTitle,
    })
  },

  /**
   * Export presentation to different formats (直接下载)
   */
  exportPresentation(id: string, format: 'pdf' | 'pptx' | 'image'): Promise<any> {
    return axios.get(`${API_BASE}/presentations/${id}/export/${format}`, {
      responseType: 'blob',
    })
  },

  /**
   * Get a download link for the presentation (获取下载链接)
   */
  getExportLink(id: string, format: 'pdf' | 'pptx' | 'image'): Promise<ExportLinkResponse> {
    return axios.get(`${API_BASE}/presentations/${id}/export-link/${format}`)
  },

  /**
   * Download an exported file using its filename
   */
  downloadExportedFile(filename: string): Promise<Blob> {
    return axios.get(`${API_BASE}/presentations/download/${filename}`, {
      responseType: 'blob',
    })
  },

  /**
   * Helper function to trigger browser download from blob
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  /**
   * Complete helper function to export and download a presentation
   */
  async exportAndDownload(id: string, format: 'pdf' | 'pptx' | 'image', useDirectDownload = true): Promise<void> {
    try {
      if (useDirectDownload) {
        // 方法1：直接下载（单一请求）
        const response = await this.exportPresentation(id, format)
        const blob = response.data
        let filename = `presentation.${format === 'image' ? 'zip' : format}`
        
        // Try to get content-disposition header for filename
        if (response.headers && response.headers['content-disposition']) {
          const contentDisposition = response.headers['content-disposition']
          const filenameMatch = /filename="(.+)"/.exec(contentDisposition)
          if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1])
          }
        }
        
        this.downloadBlob(blob, filename)
      } else {
        // 方法2：获取链接然后下载（两步请求）
        const linkResponse = await this.getExportLink(id, format)
        
        // 提示用户下载已准备好
        console.log('下载链接已生成:', linkResponse.downloadLink)
        
        // 自动开始下载
        const response = await this.downloadExportedFile(linkResponse.filename)
        
        // 从filename提取原始文件名
        const originalFilename = linkResponse.filename.substring(
          linkResponse.filename.indexOf('-') + 1
        )
        
        this.downloadBlob(response, originalFilename)
      }
    } catch (error) {
      console.error('导出失败:', error)
      throw error
    }
  }
} 