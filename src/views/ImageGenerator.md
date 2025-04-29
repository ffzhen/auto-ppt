# Coze 文生图集成

本文档描述了如何使用Coze工作流来生成图片。

## 配置环境变量

在前端项目中，你可以设置以下环境变量，以简化Coze工作流的使用：

```env
# .env.local
VITE_COZE_WORKFLOW_ID=你的工作流ID
VITE_COZE_API_TOKEN=你的API令牌
```

如果没有设置这些环境变量，你需要在UI界面手动输入工作流ID。

## API用法

### 前端调用

```typescript
// 导入服务
import api from '@/services'

// 调用图片生成API
const result = await api.generateVolcengineImage({
  prompt: '一只可爱的猫咪',        // 必填：提示词
  workflow_id: 'your-workflow-id', // 必填：Coze工作流ID
  negative_prompt: '模糊，低质量', // 可选：负面提示词
  style: 'realistic',             // 可选：风格标识符
  seed: 12345,                    // 可选：随机种子
  width: 1024,                    // 可选：图片宽度
  height: 1536,                   // 可选：图片高度
  api_token: 'your-api-token'     // 可选：API令牌(如果在服务器未配置)
})

// 处理结果
if (result.is_mock) {
  console.log('使用了占位图片，原因:', result.error_message)
} else {
  console.log('生成的图片URL:', result.image_url)
}
```

### 响应结构

```typescript
{
  image_url: string      // 生成的图片URL
  seed: number           // 使用的随机种子
  style_id: string       // 使用的风格ID
  workflow_id?: string   // 使用的工作流ID
  is_mock?: boolean      // 是否为模拟图片(API失败时)
  error_message?: string // 错误信息(如果有)
}
```

## 后端API接口

```
POST /api/ai/volcengine/image
```

### 请求参数

```json
{
  "prompt": "一只可爱的猫咪",       // 必填：提示词
  "workflow_id": "workflow-id",    // 必填：Coze工作流ID
  "negative_prompt": "模糊",       // 可选：负面提示词
  "style": "realistic",           // 可选：风格标识符
  "seed": 12345,                  // 可选：随机种子
  "width": 1024,                  // 可选：宽度
  "height": 1536,                 // 可选：高度
  "api_token": "token"            // 可选：API令牌
}
```

## Coze工作流设置

1. 在[Coze平台](https://coze.cn)创建工作流
2. 添加文生图节点
3. 配置工作流输入参数（至少接受"prompt"参数）
4. 确保工作流返回包含图片URL的结果

详细指南请参考：[COZE_SETUP.md](../server/COZE_SETUP.md) 