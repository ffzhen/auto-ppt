import axios from 'axios'
import message from '@/utils/message'

const instance = axios.create({ timeout: 1000 * 300 })

// 添加请求拦截器，从 localStorage 获取凭证并添加到 headers
instance.interceptors.request.use(
  config => {
    const arkApiKey = localStorage.getItem('ARK_API_KEY')
    const endpointId = localStorage.getItem('ENDPOINT_ID')
    
    if (arkApiKey) {
      config.headers['arkApiKey'] = arkApiKey
    }
    if (endpointId) {
      config.headers['endpointId'] = endpointId
    }
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  response => {
    if (response.status >= 200 && response.status < 400) {
      return Promise.resolve(response.data)
    }

    message.error('未知的请求错误！')
    return Promise.reject(response)
  },
  error => {
    if (error && error.response) {
      if (error.response.status >= 400 && error.response.status < 500) {
        return Promise.reject(error.message)
      }
      else if (error.response.status >= 500) {
        return Promise.reject(error.message)
      }
      
      message.error('服务器遇到未知错误！')
      return Promise.reject(error.message)
    }

    message.error('连接到服务器失败 或 服务器响应超时！')
    return Promise.reject(error)
  }
)

export default instance