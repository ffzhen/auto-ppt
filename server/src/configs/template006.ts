// 模板提示词基础接口
interface TemplatePrompt {
  isStream: boolean
}

// 生成现代简约风格模板的提示词
export function getTemplate006Prompt({ isStream }: TemplatePrompt): string {
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成现代简约风格演示内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片，生成的文案可以是html片段，自动添加emoji和html高亮元素：

1. 首先输出封面页：标题简洁明了，突出专业性
{
  "type": "cover",
  "data": {
    "title": "主标题（简洁有力，5-10字）",
    "text": "副标题（阐明价值，10-15字）"
  }
}

2. 内容页格式，items中至少3个要点，风格简约专业
{
  "type": "content",
  "data": {
    "title": "页面标题（简洁有力，4-6字）",
    "header": "引言（40-60字，简洁明了的背景介绍）",
    "items": [
      {
        "title": "要点标题1（3-5字，带序号）",
        "text": "要点内容1（30-50字，专业简洁）"
      },
      {
        "title": "要点标题2（3-5字，带序号）",
        "text": "要点内容2（30-50字，专业简洁）"
      },
      {
        "title": "要点标题3（3-5字，带序号）",
        "text": "要点内容3（30-50字，专业简洁）"
      }
    ]
  }
}

3. 数据页格式（可选）：
{
  "type": "content",
  "data": {
    "title": "数据分析",
    "header": "关键数据概览（30-50字）",
    "items": [
      {
        "title": "指标1",
        "text": "📈 数据解读（20-30字）"
      },
      {
        "title": "指标2",
        "text": "📊 数据解读（20-30字）"
      },
      {
        "title": "指标3",
        "text": "💹 数据解读（20-30字）"
      }
    ],
    "footer": "数据来源说明（20-30字）"
  }
}

4. 最后输出结束页：
{
  "type": "end",
  "data": {
    "content": "总结与展望（50-70字，简洁有力的总结和未来展望）",
    "title": "感谢聆听"
  }
}

重要说明：
- ${streamPlaceholder}
- 内容要保持专业、简洁、现代的风格
- 使用简约的表达方式，减少冗余词汇
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}
- 适当使用emoji增强视觉效果，但不要过度使用
- 强调数据和事实，避免过于主观的表述`
} 