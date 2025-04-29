/**
 * API配置
 */

// 火山引擎配置
export const volcengineConfig = {
  // 火山引擎接口密钥 - 应该从环境变量中读取
  accessKey: process.env.VOLC_ACCESSKEY || '',
  secretKey: process.env.VOLC_SECRETKEY || '',
  
  // 服务ID和域名
  serviceId: process.env.VOLC_SERVICE_ID || '',
  domain: process.env.VOLC_DOMAIN || '',
  
  // 文生图相关配置
  textToImage: {
    // API版本
    modelVersion: '2022-08-31',
    
    // 文生图模型配置
    modelAction: 'CVProcess',
    
    // 通用生图模型
    generalModel: 'high_aes_general_v21_L',
    
    // 写实照片模型
    photoModel: 'high_aes_photo_v20_L',
    
    // 动漫模型
    animeModel: 'high_aes_anime_v10_L',
    
    // 3D渲染模型
    render3dModel: 'high_aes_3d_v10_L',
    
    // 调度配置
    scheduleConf: 'general_v20_9B_pe',
    
    // 默认参数
    defaultParams: {
      ddim_steps: 25,
      llm_seed: -1,
      use_pre_llm: true,
      use_sr: true,
      return_url: true,
    }
  }
}

// Coze API配置
export const cozeConfig = {
  // API 基础URL
  baseUrl: 'https://api.coze.cn',
  
  // API 令牌 - 从环境变量读取
  apiToken: process.env.COZE_API_TOKEN || '',
  
  // 工作流ID - 从环境变量读取
  workflowId: process.env.COZE_WORKFLOW_ID || '',
  
  // 文生图工作流
  textToImage: {
    // 参数映射 - 将我们的参数转换为Coze工作流期望的格式
    // 这是一个示例，具体的参数需要根据您的Coze工作流进行调整
    paramMapping: {
      promptParam: 'prompt',
      negativePromptParam: 'negative_prompt',
      styleParam: 'style',
      seedParam: 'seed',
      widthParam: 'width',
      heightParam: 'height'
    }
  }
} 