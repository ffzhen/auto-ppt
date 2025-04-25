// 模板提示词基础接口
interface TemplatePrompt {
  isStream: boolean
}

// 生成文档模板的提示词
function getDocTemplatePrompt({ isStream }: TemplatePrompt): string {
  console.log('getDocTemplatePrompt')
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
    "header":"引言（60-80字，背景和引言）",
    "footer":"结语（非必选，footer出现时必须有header，20-40字，总结与呼吁）",
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
- 内容对象至少包含4个专业要点，内容要符合资料文档风格
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}
- 使用专业的词汇和术语，保持资料的权威性和准确性
- 避免过于口语化的表达，保持正式文档风格`
}


function getBlueTemplatePrompt({ isStream }: TemplatePrompt): string {
  console.log('getBlueTemplatePrompt')
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片,生成的标题、文案可以是html格式的富文本片段，自动添加eomji和html高亮元素：

1. 首先输出封面页：
{
  "type": "cover",
  "data": {
    "html": "主标题（7-14字）标题包含富文本格式重点高亮内容，字号为132px，行高为1，文字颜色为白色，高亮内容自动添加下划线且字号为188px，例如：<p style="line-height:1;" ><span style="font-size: 188.1px;"><span style="font-family: 三极刻本雅宋简体;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">40岁</span></span></span></span><span style="font-size: 131.7px;"><span style="font-family: 三极刻本雅宋简体;"><span style="color: rgb(255, 255, 255);">以下</span></span></span></p><p style=""><span style="font-size: 131.7px;"><span style="font-family: 三极刻本雅宋简体;"><span style="color: rgb(255, 255, 255);">高净值人群画像</span></span></span></p>",
    "text": "副标题（7-14字"
  }
}

2. 内容页主要是html片段
内容:{
  "type": "content",
  "data": {
    "html": "页面正文富文本html片段，内容富文本片段，文字为白色，正文字号66px，行高1.2,重点内容加下划线，有清晰的内容层次，用2个p标签来实现段落间距，可以加上ul p table等标签和内联css样式来实现排版，正文内容在2000字左右,内容分布在一个1656x2208的矩形框内，尽量使内容分布均匀饱满，可以使用图表、svg、图片等元素来丰富内容，不要使用<br>标签，用p标签来实现段落间距",
  }
}

重要说明：
- ${streamPlaceholder}
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- 所有 带富文本格式的html 元素带 style 标签，不要遗漏，文字为白色，重点内容加下划线，有清晰的内容层次，用2个p标签来实现段落间距，不要用<br>
- ${formatPlaceholder}`
}

// 导出获取模板提示词的函数
export function getTemplatePrompt(templateId: string, isStream: boolean = false): string {
  switch (templateId) {
    case 'doc_template':
      return getDocTemplatePrompt({ isStream })
    case 'blue_template':
      return getBlueTemplatePrompt({ isStream })
    default:
      return getDocTemplatePrompt({ isStream }) // 默认使用文档模板
  }
} 