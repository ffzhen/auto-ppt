import type { SlideTemplate } from '@/types/slides'

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

  return `你是一个生成虚拟资料卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片,生成的文案可以是html片段，自动添加eomji和html高亮元素：

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

// 生成小红书风格模板的提示词
function getRedBookTemplatePrompt({ isStream }: TemplatePrompt): string {
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片,生成的文案可以是html片段，自动添加eomji和html高亮元素：

1. 首先输出封面页：标题符合小红书爆款标题特性，主副标题由完整标题拆分得到，例如："一年级家长必看！幼小衔接全攻略"拆分得到"一年级家长必看"和"幼小衔接全攻略"
{
  "type": "cover",
  "data": {
    "title": "主标题（7-14字）",
    "text": "副标题（7-14字）"
  }
}

2. 内容页有2种格式随机生成，items中至少3个要点,很重要！
内容1:{
  "type": "content",
  "data": {
    "title": "页面标题",
    "header": "引言（60-80字，背景和引言）",
    "footer": "结语（非必选，footer出现时必须有header，20-40字，总结与呼吁）",
    "items": [
      {
        "title": "要点标题1",
        "text": "要点内容1（20-40字）"
      },
      {
        "title": "要点标题2",
        "text": "要点内容2（20-40字）"
      },
      {
        "title": "要点标题3",
        "text": "要点内容3（20-40字）"
      }
    ]
  }
}
内容2:没有header或footer时
{
  "type": "content",
  "data": {
    "title": "页面标题",
    "items": [
      {
        "title": "要点标题1（4-6字）",
        "text": "要点内容1（70-90字）"
      },
      {
        "title": "要点标题2（4-6字）",
        "text": "要点内容2（70-90字）"
      },
      {
        "title": "要点标题3（4-6字）",
        "text": "要点内容3（70-90字）"
      }
    ]
  }
}

3. 最后输出结束页：
{
  "type": "end",
  "data": {
    "content": "结束内容（70-90字）",
    "title": "谢谢观看"
  }
}

重要说明：
- ${streamPlaceholder}
- 内容对象至少包含3个要点，内容要符合主题风格
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}`
}

// 导出模板配置
export const templates: SlideTemplate[] = [
  {
    name: '虚拟资料卡片',
    id: 'doc_template',
    cover: 'img/虚拟.jpg',
  },
  {
    name: '小红书风格卡片',
    id: 'redbook_template',
    cover: 'img/redbook.jpg',
  }
]

// 导出获取模板提示词的函数
export function getTemplatePrompt(templateId: string, isStream: boolean = false): string {
  switch (templateId) {
    case 'doc_template':
      return getDocTemplatePrompt({ isStream })
    case 'redbook_template':
      return getRedBookTemplatePrompt({ isStream })
    default:
      return getDocTemplatePrompt({ isStream }) // 默认使用文档模板
  }
} 