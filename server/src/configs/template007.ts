// 模板提示词基础接口
interface TemplatePrompt {
  isStream: boolean
}

export function getTemplate007Prompt({ isStream }: TemplatePrompt): string {
    console.log('getTemplate007Prompt')
    const streamPlaceholder = isStream 
      ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
      : '所有对象应该组成一个有效的JSON数组'
    
    const formatPlaceholder = isStream
      ? '输出时请每个对象独立成行，不要将多个对象连在一起'
      : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'
  
    return `你是一个生成卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片,生成的文案可以是html片段，自动添加eomji和html高亮元素：
  
  1. 首先输出封面页：标题将会作为大字报的形式展示，标题为10-30字
  {
    "type": "cover",
    "data": {
      "title": "主标题（10-30字），自动添加eomji和重点内容，自动高亮重点，高亮样式为添加#ffff3a的背景色，有人味，像和朋友分享的语气，吸引人点进去，例如：“想找一个<span style='background-color: #ffff3a;'>炒股厉害的男生</span>带我回本”",
    }
  }
  
  2. 内容页有2种格式随机生成，items中至少3个要点,很重要！text生成的文案可以是html片段，自动添加eomji和html高亮元素，正文为黑色，可加粗、画线或者加自动添加重点内容高亮样式，高亮样式（文字颜色为#4874CB）
  内容1:{
    "type": "content",
    "data": {
      "title": "页面标题(5-10字)",
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
      "title": "页面标题(5-10字)",  
      "subtitle": "副标题（5-10字）",
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
  
  3. 最后输出结束页，content生成的文案可以是html片段，自动添加eomji和html高亮元素
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