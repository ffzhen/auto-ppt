import { getTemplate006Prompt } from './template006'

// 模板提示词基础接口
interface TemplatePrompt {
  isStream: boolean
}

// 生成文档模板的提示词
function getDocTemplatePrompt({ isStream }: TemplatePrompt): string {
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成虚拟资料卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片：

1. 首先输出封面页：标题采用专业的资料文档风格
{
  "type": "cover",
  "data": {
    "title": "主标题（简洁专业，7-14字）",
    "text": "副标题（描述文档内容，7-14字）"
  }
}

2. 内容页格式，items中至少4个要点，注重专业性和实用性
{
  "type": "content",
  "data": {
    "title": "页面标题（专业术语）",
    "header": "引言（60-80字，专业背景介绍）",
    "items": [
      {
        "title": "要点标题1（专业术语，4-6字）",
        "text": "要点内容1（专业解释，50-70字）"
      },
      {
        "title": "要点标题2（专业术语，4-6字）",
        "text": "要点内容2（专业解释，50-70字）"
      },
      {
        "title": "要点标题3（专业术语，4-6字）",
        "text": "要点内容3（专业解释，50-70字）"
      },
      {
        "title": "要点标题4（专业术语，4-6字）",
        "text": "要点内容4（专业解释，50-70字）"
      }
    ]
  }
}

3. 最后输出结束页：
{
  "type": "end",
  "data": {
    "content": "结论和建议（专业总结，70-90字）",
    "title": "总结"
  }
}

重要说明：
- ${streamPlaceholder}
- 内容对象至少包含4个专业要点，内容要符合资料文档风格
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}
- 使用专业的词汇和术语，保持资料的权威性和准确性
- 避免过于口语化的表达，保持正式文档风格`
}

// 生成蓝色模板的提示词
function getBlueTemplatePrompt({ isStream }: TemplatePrompt): string {
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成商务风格卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片：

1. 首先输出封面页：标题符合商务专业风格
{
  "type": "cover",
  "data": {
    "title": "主标题（专业简洁，5-10字）",
    "text": "副标题（阐明内容，10-15字）"
  }
}

2. 内容页格式，items中至少3个要点
{
  "type": "content",
  "data": {
    "title": "页面标题（专业简洁，4-8字）",
    "header": "引言（40-60字，简明扼要）",
    "items": [
      {
        "title": "要点标题1（4-6字）",
        "text": "要点内容1（30-50字，清晰准确）"
      },
      {
        "title": "要点标题2（4-6字）",
        "text": "要点内容2（30-50字，清晰准确）"
      },
      {
        "title": "要点标题3（4-6字）",
        "text": "要点内容3（30-50字，清晰准确）"
      }
    ]
  }
}

3. 最后输出结束页：
{
  "type": "end",
  "data": {
    "content": "总结与展望（50-70字，简洁有力）",
    "title": "总结与展望"
  }
}

重要说明：
- ${streamPlaceholder}
- 内容要保持专业、简洁、商务风格
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}
- 使用专业的商务词汇，避免过于口语化的表达`
}

// 生成样式模板的提示词
function getYsTemplatePrompt({ isStream }: TemplatePrompt): string {
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成养生风格卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片：

1. 封面页格式
{
  "type": "cover",
  "data": {
    "title": "主标题（建议7-14字，养生健康主题）",
    "text": "副标题（补充说明，7-14字）"
  }
}

2. 内容页格式
{
  "type": "content",
  "data": {
    "title": "页面标题（4-8字）",
    "subtitle": "副标题（8-12字）",
    "items": [
      {
        "title": "要点标题1",
        "text": "要点内容1（20-40字）"
      },
      {
        "title": "要点补充标题1",
        "text": "要点补充内容1（20-40字）"
      }
    ]
  }
}

3. 结束页：
{
  "type": "end",
  "data": {
    "content": "总结内容（50-70字）",
    "title": "健康小贴士"
  }
}

重要说明：
- ${streamPlaceholder}
- 标题要体现养生健康的理念，可以使用"调理""平衡""修养""滋补"等关键词
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}
- 确保生成的内容符合现代养生理念，既要有传统智慧又要符合科学常识`
}

// 生成template004模板的提示词
function getTemplate004Prompt({ isStream }: TemplatePrompt): string {
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成精美卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片：

1. 封面页格式
{
  "type": "cover",
  "data": {
    "title": "主标题（7-12字）",
    "text": "副标题（10-15字）"
  }
}

2. 内容页格式
{
  "type": "content",
  "data": {
    "title": "页面标题（4-8字）",
    "header": "引言（40-60字）",
    "items": [
      {
        "title": "要点标题1（4-6字）",
        "text": "要点内容1（30-50字）"
      },
      {
        "title": "要点标题2（4-6字）",
        "text": "要点内容2（30-50字）"
      },
      {
        "title": "要点标题3（4-6字）",
        "text": "要点内容3（30-50字）"
      }
    ],
    "footer": "页脚内容（20-30字）"
  }
}

3. 结束页：
{
  "type": "end",
  "data": {
    "content": "结束语（50-70字）",
    "title": "总结"
  }
}

重要说明：
- ${streamPlaceholder}
- 内容要保持简洁明了，重点突出
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}`
}

// 生成template005模板的提示词
function getTemplate005Prompt({ isStream }: TemplatePrompt): string {
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片：

1. 封面页格式
{
  "type": "cover",
  "data": {
    "title": "主标题（精简有力，7-12字）",
    "text": "副标题（补充说明，10-15字）"
  }
}

2. 内容页格式，使用富文本
{
  "type": "content",
  "data": {
    "html": "页面内容的富文本HTML（包含适当格式化和强调）"
  }
}

3. 结束页：
{
  "type": "end",
  "data": {
    "content": "结束语（简洁有力，50-70字）",
    "title": "感谢观看"
  }
}

重要说明：
- ${streamPlaceholder}
- HTML内容要保持适当的格式化，使用段落、列表等元素增强可读性
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}`
}

// 导出获取模板提示词的函数
export function getTemplatePrompt(templateId: string, isStream: boolean = false): string {
  switch (templateId) {
    case 'template001':
      return getDocTemplatePrompt({ isStream })
    case 'template002':
      return getBlueTemplatePrompt({ isStream })
    case 'template003':
      return getYsTemplatePrompt({ isStream })
    case 'template004':
      return getTemplate004Prompt({ isStream })
    case 'template005':
      return getTemplate005Prompt({ isStream })
    case 'template006':
      return getTemplate006Prompt({ isStream })
    default:
      return getDocTemplatePrompt({ isStream }) // 默认使用文档模板
  }
}
