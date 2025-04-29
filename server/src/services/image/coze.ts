/**
 * Coze工作流图像生成服务
 */

/**
 * 使用Coze工作流生成图片
 * @param params 生成图片的参数
 * @returns 生成的图片URL和相关信息
 */
export async function generateImageWithCoze(params: {
  prompt: string
  workflow_id: string
  api_token?: string
}) {
  try {
    const { 
      prompt, 
      workflow_id, 
      api_token
    } = params
    
    // 构建请求参数
    const requestBody = {
      workflow_id,
      parameters: {
        // 传递核心参数
        input: prompt,
      }
    }
    
    console.log('Requesting Coze API with params:', {
      workflow_id: requestBody.workflow_id,
      parameters: {
        input: `${prompt.substring(0, 20)}...` // 日志中截断提示词
      }
    })
    
    // 调用Coze API
    const response = await fetch('https://api.coze.cn/v1/workflow/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    // 检查响应状态
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Coze API error (${response.status}): ${errorText}`)
    }
    
    // 解析响应数据
    const result = await response.json()
    
    // 尝试从工作流返回中提取图片URL
    let imageUrl = null
    
    // 检查是否有data字段且为字符串(需要解析)
    if (result.data && typeof result.data === 'string') {
      try {
        const parsedData = JSON.parse(result.data)
        // 从解析后的数据中获取图片URL数组
        if (parsedData.output ) {
          imageUrl = parsedData.output
        }
      } catch (parseError) {
        console.error('解析Coze API响应数据失败:', parseError)
      }
    }
    
    // 如果解析失败，尝试其他可能的路径
    if (!imageUrl) {
      imageUrl = 
        result.output?.image_url || 
        result.output?.url || 
        result.data?.image_url || 
        result.data?.url ||
        result.image_url || 
        result.url || 
        result.output
    }
    
    if (!imageUrl) {
      console.error('无法解析图片URL，完整响应:', result)
      throw new Error('无法从Coze工作流响应中获取图片URL')
    }
    
    // 返回标准化的结果
    return {
      image_url: imageUrl,
      workflow_id
    }
  } catch (error) {
    console.error('Coze工作流图像生成错误:', error)
    throw error
  }
} 