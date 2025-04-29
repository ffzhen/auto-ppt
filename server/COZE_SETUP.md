# Coze 工作流设置指南

本文档提供了如何在 Coze 平台上设置文本到图像生成工作流的说明。

## 步骤 1: 创建 Coze 账户

1. 访问 [Coze.cn](https://coze.cn/) 并创建一个账户
2. 登录到您的 Coze 账户

## 步骤 2: 创建文生图工作流

1. 在 Coze 平台中，创建一个新的工作流
2. 添加一个文本输入节点，用于接收提示词
3. 添加一个图像生成节点，连接到文本输入节点
4. 配置图像生成节点参数，包括:
   - 模型选择 (如 Stable Diffusion, DALL-E 等)
   - 图像尺寸设置
   - 负面提示词
   - 其他可调参数

## 步骤 3: 配置工作流输入输出

工作流应接受以下输入参数:
- `prompt`: 主要提示词
- `negative_prompt`: 负面提示词（可选）
- `style`: 风格选择（可选）
- `seed`: 随机种子（可选）
- `width`: 图像宽度（可选）
- `height`: 图像高度（可选）

工作流应返回以下输出:
- 生成的图像 URL

## 步骤 4: 测试工作流

1. 在 Coze 平台上测试工作流，确保它能够生成图像并返回图像 URL
2. 记录任何特定的输入参数格式要求

## 步骤 5: 获取 API 令牌和工作流 ID

1. 在 Coze 平台上，找到并复制您的 API 令牌 (Personal Access Token)
2. 复制创建的工作流 ID

## 步骤 6: 配置环境变量

将以下变量添加到服务器的 `.env` 文件中:

```
COZE_API_TOKEN=your_personal_access_token
COZE_WORKFLOW_ID=your_workflow_id
```

## 步骤 7: 自定义参数映射

如果您的工作流使用不同的参数名称，请更新 `server/src/config/api.ts` 中的参数映射:

```typescript
paramMapping: {
  promptParam: 'your_prompt_param_name',
  negativePromptParam: 'your_negative_prompt_param_name',
  styleParam: 'your_style_param_name',
  // ... 其他参数
}
```

## 注意事项

- 确保 Coze 工作流是公开的或者您的 API 令牌有权限访问
- 图像生成可能需要几秒到几十秒的时间，确保您的请求超时设置足够长
- 定期检查 Coze API 的使用量和限制 