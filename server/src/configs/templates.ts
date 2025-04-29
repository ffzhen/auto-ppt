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

  return `你是一个生成卡片内容的专家。擅长写出直击人心、深入浅出、有人味，像和朋友分享的语气的文案和用html排版，请输出以下格式的完整JSON对象，每个对象代表一页卡片,生成的标题、文案可以是html格式的富文本片段，自动添加eomji和html高亮元素，

1. 首先输出封面页：
{
  "type": "cover",
  "data": {
    "html": "主标题（7-14字）标题包含富文本格式重点高亮内容，字号为132px，行高为1，文字颜色为白色，高亮内容自动添加下划线且字号为188px，例如：<p style="line-height:1;" ><span style="font-size: 188.1px;"><span style="font-family: 三极刻本雅宋简体;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">40岁</span></span></span></span><span style="font-size: 131.7px;"><span style="font-family: 三极刻本雅宋简体;"><span style="color: rgb(255, 255, 255);">以下</span></span></span></p><p style=""><span style="font-size: 131.7px;"><span style="font-family: 三极刻本雅宋简体;"><span style="color: rgb(255, 255, 255);">高净值人群画像</span></span></span></p>",
    "text": "副标题（7-14字）"
  }
}

2. 内容页主要是html片段
内容:{
  "type": "content",
  "data": {
    "html": "页面正文富文本html片段，内容富文本片段，文字为白色，正文字号66px，行高1.2,重点内容加下划线，不要全是要点，加一些有人味的叙述,例如我曾经xxxx，然后xxxx等，添加一些故事性的叙述，先生成文案，再用html排版，用2个p标签来实现段落间距，可以加上ul p table等标签和内联css样式来实现排版，正文内容分布在一个1656x2208的矩形框内，尽量使内容分布均匀，使得内容至少有三个段落块，内容饱满展示在卡片中，可以使用图表、svg、图片等元素来丰富内容，不要使用<br>标签，用p标签来实现段落间距, 例如：<p style=""><span style="font-size: 94.1px;"><span style="font-family: 三极刻本雅宋简体;"><span style="color: rgb(255, 255, 255);">财富增长速度</span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">增长速度慢于上年</span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">原因：</span></span></span><span style="font-size: 65.8px;"><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">金字塔顶端部分财富缩水</span></span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">全球十亿美金企业家人数：</span></span></span><span style="font-size: 56.4px;"><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">3112位</span></span></span></span><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">（减少269位）</span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">中国十亿美金企业家减少：</span></span></span><span style="font-size: 56.4px;"><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">164位</span></span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">财富缩水量：</span></span></span><span style="font-size: 56.4px;"><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">约5万亿人民币</span></span></span></span></p><p style=""><span style="font-size: 84.7px;"><span style="font-family: Calibri;">&nbsp;</span></span></p><p style=""><span style="font-size: 56.4px;"><span style="font-family: 三极刻本雅宋简体;"><span style="color: rgb(255, 255, 255);">地域分布</span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">广东</span></span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">净资产：</span></span><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">1000万人民币</span></span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">高净值家庭数量：</span></span><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">30.7万户</span></span></span></span></p><p style=""><span style="font-size: 84.7px;"><span style="font-family: Calibri;">&nbsp;</span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">北京</span></span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">高净值家庭数量：</span></span><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">30.6万户</span></span></span></span></p><p style=""><span style="font-size: 84.7px;"><span style="font-family: Calibri;">&nbsp;</span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">上海</span></span></span></span></p><p style=""><span style="font-size: 49.4px;"><span style="font-family: PingFang SC Thin;"><span style="color: rgb(255, 255, 255);">高净值家庭数量：</span></span><span style="font-family: 苹方 中等;"><span style="color: rgb(255, 255, 255);"><span style="text-decoration: underline;">27.1万户</span></span></span></span></p>",
  }
}

重要说明：
- ${streamPlaceholder}
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- 所有 带富文本格式的html 元素带 style 标签，不要遗漏，文字为白色，重点内容加下划线，添加故事性的叙述，用2个p标签来实现段落间距，不要用<br>,正文内容分布在一个1656x2208的矩形框内，尽量使内容分布均匀饱满，可以使用图表、svg、图片等元素来丰富内容，不要使用<br>标签，用<p style=""><span style="font-size: 84.7px;"><span style="font-family: Calibri;">&nbsp;</span></span></p>来实现段落间距"
- ${formatPlaceholder}`
}

function getYsTemplatePrompt({ isStream }: TemplatePrompt): string {
  console.log('getYsTemplatePrompt')
  const streamPlaceholder = isStream 
    ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' 
    : '所有对象应该组成一个有效的JSON数组'
  
  const formatPlaceholder = isStream
    ? '输出时请每个对象独立成行，不要将多个对象连在一起'
    : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'

  return `你是一个生成养生风格卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片：

1. 封面页格式有2种，一种是主标题+副标题+背景图片，一种是html标题+背景图片，主副标题由完整标题拆分得到，例如："从春到夏减脂排毒黄金时间"拆分得到"从春到夏"和"减脂排毒黄金时间"例如：
{
  "type": "cover",
  "data": {
    "html": "主标题（建议7-14字，养生健康主题），可以再带换行和重点内容字号放大，颜色为白色，普通字号为120px，放大字号为166px，font-family: LXGWWenKai;，例如<p style="text-align: center;"><span style="font-size: 120px;"><span style="font-family: LXGWWenKai;"><span style="color: rgb(255, 255, 255);">中医建议：</span></span></span><span style="font-size: 166px;"><span style="font-family: LXGWWenKai;"><span style="color: rgb(255, 255, 255);">小暑养生</span></span></span></p>或者<p style="text-align: center;"><span style="font-size: 120px;"><span style="font-family: LXGWWenKai;"><span style="color: rgb(255, 255, 255);">顺应天时：</span></span></span></p><p style="text-align: center;"><span style="font-size: 120px;"><span style="font-family: LXGWWenKai;"><span style="color: rgb(255, 255, 255);">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; </span></span></span><span style="font-size: 166px;"><span style="font-family: LXGWWenKai;"><span style="color: rgb(255, 255, 255);">春季养生</span></span></span></p>",
    "title": "主标题（由完整标题拆分得到的前半部分）",
     "text": "副标题（由完整标题拆分得到的后半部分）",
    "background": {
      "imageRenderType": "doubao",
      "params": {
        "text_prompt": "根据标题{主标题}生成一张富有意境的养生主题图片，描述要点：
        - 场景选择：
          * 如果是饮食类主题：选择茶室、庭院餐桌、农家小院等场景，突出食材的新鲜与摆盘的精致
          * 如果是运动类主题：选择竹林步道、山间石阶、晨练园地等场景，强调自然与运动的和谐
          * 如果是修养类主题：选择禅室、古朴书房、园林凉亭等场景，体现静谧与沉思
          * 如果是四季养生主题：根据季节选择对应的景致（春园繁花、夏荫清凉、秋径落叶、冬阁暖阳）
        
        - 主要元素：
          * 应与标题主题直接相关的物件（如茶具、瑜伽垫、书籍、应季食材等）
          * 点缀装饰物（如花卉、绿植、流水、石景等）
          * 体现节气特色的自然元素
        
        - 构图要求：
          * 采用留白式构图，主体占画面1/3
          * 上方或中间预留深色区域用于放置白色文字
          * 画面疏朗有致，富有层次感
        
        - 氛围营造：
          * 晨昏天光，自然柔和
          * 意境悠远，富有诗意
          * 体现东方美学的意境
        
        - 色调控制：
          * 主色调：温和自然的绿色、原木色、米灰等
          * 点缀色：根据主题适当点缀（如茶色、花色、竹青等）
          * 确保背景适合叠加白色文字
        
        - 画面质量：
          * 超高清细节，注重质感
          * 自然光影效果
          * 体现物件肌理和光泽
        
        - 风格参考：
          * 类似日式摄影美学
          * 具有中国传统水墨画意境
          * 现代简约与传统美学的融合",
        "negative_prompt": "避免以下元素：人物、现代化建筑或设施、电子产品或现代器械、医疗场景或器材、商业化元素、塑料制品或工业制品、鲜艳对比的色彩、杂乱或拥挤的构图、过度处理的HDR效果、模糊或失真的画面、任何文字或标识、不自然的边框或装饰",
      }
    }
  }
}
  2. 内容页：每页一个主题，每页的主题标题保持一致，每页内容2个分论点说明，主副标题由完整标题拆分得到，例如："6个超简单的夏日中药香囊配方"拆分得到"6个超简单的"和"夏日中药香囊配方"
{例如
  {
  "type": "content",
  "data": {
    "title": "完整标题拆分得到的前半部分",
    "subtitle": "完整标题拆分得到的后半部分",
    "items": [
      {
        "title": "要点标题1，如：配方1:预防感冒",
        "text": "要点内容1（20-40字），如：生黄芪、炒苍术、防风、辛夷、白芷、蝉蜕、柴胡、桑叶、野菊花、鱼腥草、花椒、川芎、桂枝、炒麦芽砂仁、紫苏叶、桔梗..."
      },
      {
        "title": "要点补充标题1，如：效果: 🌟🌟🌟🌟",
        "text": "要点补充内容1（20-40字），如：桑叶:祛风清热凉血明目柴胡:解表退热,疏肝解元升举阳气，鱼腥草:清痈排脓,清热通淋年喜光"
      }
    ]
  }
}{
  "type": "content",
  "data": {
    "title": "完整标题拆分得到的前半部分",
    "subtitle": "完整标题拆分得到的后半部分",
    "items": [
      {
        "title": "要点标题2:xxxx",
        "text": "要点内容2（20-40字），如：生黄芪、炒苍术、防风、辛夷、白芷、蝉蜕、柴胡、桑叶、野菊花、鱼腥草、花椒、川芎、桂枝、炒麦芽砂仁、紫苏叶、桔梗..."
      },
      ...
    ]
  }
}
重要说明：
- ${streamPlaceholder}
- 标题要体现养生健康的理念，可以使用"调理""平衡""修养""滋补"等关键词
- 背景图片提示词要突出健康、自然、平和的氛围
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${formatPlaceholder}
- 确保生成的内容符合现代养生理念，既要有传统智慧又要符合科学常识`
}

// 导出获取模板提示词的函数
export function getTemplatePrompt(templateId: string, isStream: boolean = false): string {
  switch (templateId) {
    case 'doc_template':
      return getDocTemplatePrompt({ isStream })
    case 'blue_template':
      return getBlueTemplatePrompt({ isStream })
    case 'ys_template':
      return getYsTemplatePrompt({ isStream })
    default:
      return getDocTemplatePrompt({ isStream }) // 默认使用文档模板
  }
} 