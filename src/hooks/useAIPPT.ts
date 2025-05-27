import { ref } from 'vue'
import { nanoid } from 'nanoid'
import type { ImageClipDataRange, PPTElement, PPTImageElement, PPTShapeElement, PPTTextElement, Slide, TextType } from '@/types/slides'
import type { AIPPTSlide } from '@/types/AIPPT'
import { useSlidesStore } from '@/store'
import useAddSlidesOrElements from './useAddSlidesOrElements'
import useSlideHandler from './useSlideHandler'
import api from '@/services'

interface ImgPoolItem {
  id: string
  src: string
  width: number
  height: number
}

export default () => {
  const slidesStore = useSlidesStore()
  const { addSlidesFromData } = useAddSlidesOrElements()
  const { isEmptySlide } = useSlideHandler()

  const imgPool = ref<ImgPoolItem[]>([])
  // 存储异步生成的封面图片URL，用于后续同步
  const asyncGeneratedCoverImage = ref<string | null>(null)
  // 图片生成加载状态
  const isImageGenerating = ref(false)

  const checkTextType = (el: PPTElement, type: TextType) => {
    return (el.type === 'text' && el.textType === type) || (el.type === 'shape' && el.text && el.text.type === type)
  }

  const getUseableTemplates = (templates: Slide[], n: number, type: TextType, itemData?: any) => {
    // 如果item.data有header或footer，需要筛选出有对应插槽的模板
    if (itemData) {
      // 只有header
      if (itemData.header && !itemData.footer) {
        templates = templates.filter(slide => {
          // 需要有header插槽，且不要有footer插槽
          const hasHeaderSlot = slide.elements.some(el => checkTextType(el, 'header'))
          const hasFooterSlot = slide.elements.some(el => checkTextType(el, 'footer'))
          return hasHeaderSlot && !hasFooterSlot
        })
      }
      // 只有footer
      else if (!itemData.header && itemData.footer) {
        templates = templates.filter(slide => {
          // 需要有footer插槽，且不要有header插槽
          const hasHeaderSlot = slide.elements.some(el => checkTextType(el, 'header'))
          const hasFooterSlot = slide.elements.some(el => checkTextType(el, 'footer'))
          return !hasHeaderSlot && hasFooterSlot
        })
      }
      // 同时有header和footer
      else if (itemData.header && itemData.footer) {
        templates = templates.filter(slide => {
          // 同时有header和footer插槽
          const hasHeaderSlot = slide.elements.some(el => checkTextType(el, 'header'))
          const hasFooterSlot = slide.elements.some(el => checkTextType(el, 'footer'))
          return hasHeaderSlot && hasFooterSlot
        })
      }
      // 既没有header也没有footer
      else {
        templates = templates.filter(slide => {
          // 既没有header也没有footer插槽
          const hasHeaderSlot = slide.elements.some(el => checkTextType(el, 'header'))
          const hasFooterSlot = slide.elements.some(el => checkTextType(el, 'footer'))
          return !hasHeaderSlot && !hasFooterSlot
        })
      }

      // 如果筛选后没有合适的模板，使用原始内容模板
      if (templates.length === 0) {
        console.warn('没有找到合适的header/footer插槽模板，将使用标准模板')
        templates = templates.filter(slide => slide.type === 'content')
      }
    }

    if (n === 1) {
      const list = templates.filter(slide => {
        const items = slide.elements.filter(el => checkTextType(el, type))
        const titles = slide.elements.filter(el => checkTextType(el, 'title'))
        const texts = slide.elements.filter(el => checkTextType(el, 'content'))

        return !items.length && titles.length === 1 && texts.length === 1
      })

      if (list.length) return list
    }

    let target: Slide | null = null

    const list = templates.filter(slide => {
      const len = slide.elements.filter(el => checkTextType(el, type)).length
      return len >= n
    })
    if (list.length === 0) {
      const sorted = templates.sort((a, b) => {
        const aLen = a.elements.filter(el => checkTextType(el, type)).length
        const bLen = b.elements.filter(el => checkTextType(el, type)).length
        return aLen - bLen
      })
      target = sorted[sorted.length - 1]
    }
    else {
      target = list.reduce((closest, current) => {
        const currentLen = current.elements.filter(el => checkTextType(el, type)).length
        const closestLen = closest.elements.filter(el => checkTextType(el, type)).length
        return (currentLen - n) <= (closestLen - n) ? current : closest
      })
    }

    return templates.filter(slide => {
      const len = slide.elements.filter(el => checkTextType(el, type)).length
      const targetLen = target!.elements.filter(el => checkTextType(el, type)).length
      return len === targetLen
    })
  }

  const getAdaptedFontsize = ({
    text,
    fontSize,
    fontFamily,
    width,
    maxLine,
    fixContainer,
    height,
    lineHeight = 1.2
  }: {
    text: string
    fontSize: number
    fontFamily: string
    width: number
    maxLine: number
    fixContainer?: boolean
    height?: number
    lineHeight?: number
  }) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const minFontSize = 10
    const maxFontSize = 350 // 设置最大字体大小上限
    console.log('fixContainer', fixContainer, height)
    
    // 创建一个用于准确测量文本高度的辅助函数
    const measureTextHeight = (text: string, fontSize: number, fontFamily: string, containerWidth: number, lineHeight: number) => {
      // 创建一个隐藏的div用于测量
      const measureEl = document.createElement('div')
      measureEl.style.position = 'absolute'
      measureEl.style.visibility = 'hidden'
      measureEl.style.left = '-9999px'
      measureEl.style.top = '-9999px'
      measureEl.style.width = `${containerWidth}px`
      measureEl.style.fontSize = `${fontSize}px`
      measureEl.style.fontFamily = fontFamily
      measureEl.style.lineHeight = lineHeight.toString()
      measureEl.style.margin = '0'
      measureEl.style.padding = '0'
      
      // 检查文本是否为HTML
      if (/<[a-z][\s\S]*>/i.test(text)) {
        measureEl.innerHTML = text
      }
      else {
        measureEl.textContent = text
      }
      
      // 将元素添加到DOM中进行测量
      document.body.appendChild(measureEl)
      const height = measureEl.offsetHeight
      document.body.removeChild(measureEl)
      
      return height
    }
    
    // 创建一个用于计算文本行数的辅助函数
    const calculateTextLines = (text: string, fontSize: number, fontFamily: string, containerWidth: number, lineHeight: number) => {
      const measureEl = document.createElement('div')
      measureEl.style.position = 'absolute'
      measureEl.style.visibility = 'hidden'
      measureEl.style.left = '-9999px'
      measureEl.style.top = '-9999px'
      measureEl.style.width = `${containerWidth}px`
      measureEl.style.fontSize = `${fontSize}px`
      measureEl.style.fontFamily = fontFamily
      measureEl.style.lineHeight = lineHeight.toString()
      measureEl.style.margin = '0'
      measureEl.style.padding = '0'
      
      if (/<[a-z][\s\S]*>/i.test(text)) {
        measureEl.innerHTML = text
      } 
      else {
        measureEl.textContent = text
      }
      
      document.body.appendChild(measureEl)
      
      // 获取元素的实际高度和计算行高
      const totalHeight = measureEl.offsetHeight
      const lineHeightPx = fontSize * lineHeight
      
      // 估算行数
      const lines = Math.round(totalHeight / lineHeightPx)
      
      document.body.removeChild(measureEl)
      return Math.max(1, lines) // 至少返回1行
    }
    
    if (fixContainer && height) {
      if (!text) return fontSize
      
      // 提取纯文本
      let plainText = text
      if (/<[a-z][\s\S]*>/i.test(text)) {
        const div = document.createElement('div')
        div.innerHTML = text
        plainText = div.textContent || div.innerText || ''
      }
      
      let testFontSize = fontSize
      let bestFitFontSize = fontSize
      let lastFits = false
      
      // 检查初始字号是否已经超出高度
      let totalTextHeight = measureTextHeight(text, testFontSize, fontFamily, width, lineHeight)
      
      console.log('totalTextHeight', totalTextHeight)
      if (totalTextHeight > height) {
        // 递减字号直到不超出高度
        while (testFontSize > minFontSize) {
          testFontSize -= 2
          totalTextHeight = measureTextHeight(text, testFontSize, fontFamily, width, lineHeight)
          if (totalTextHeight <= height) {
            return testFontSize
          }
        }
        return minFontSize
      }
      
      // 正常递增字号直到接近高度但不超出
      while (testFontSize <= maxFontSize) {
        totalTextHeight = measureTextHeight(text, testFontSize, fontFamily, width, lineHeight)
        if (totalTextHeight > height) {
          if (lastFits) return bestFitFontSize
          testFontSize -= 2
          if (testFontSize < minFontSize) return minFontSize
          continue
        }
        bestFitFontSize = testFontSize
        lastFits = true
        testFontSize += 2
      }
      return bestFitFontSize
    }
    
    // 原有逻辑修改：找到满足maxLine要求的最大字体大小，使用DOM方式计算行数
    let newFontSize = fontSize
    
    while (newFontSize >= minFontSize) {
      // 使用DOM方法计算行数
      const lines = calculateTextLines(text, newFontSize, fontFamily, width, lineHeight)
      
      if (lines <= maxLine) return newFontSize
      
      const step = newFontSize <= 22 ? 1 : 2
      newFontSize = newFontSize - step
    }
    
    return minFontSize
  }

  const getFontInfo = (htmlString: string) => {
    const fontSizeRegex = /font-size:\s*(\d+.?\d+)\s*px/i
    const fontFamilyRegex = /font-family:\s*['"]?([^'";]+)['"]?\s*(?=;|>|$)/i
    // 增强的颜色正则表达式，可以匹配RGB、RGBA、HEX和颜色名称
    const colorRegex = /color:\s*((?:rgb|rgba)\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)|#[0-9a-f]{3,8}|[a-z]+)/i

    const defaultInfo = {
      fontSize: 16,
      fontFamily: 'Microsoft Yahei',
      color: ''
    }

    const fontSizeMatch = htmlString.match(fontSizeRegex)
    const fontFamilyMatch = htmlString.match(fontFamilyRegex)
    const colorMatch = htmlString.match(colorRegex)

    return {
      fontSize: fontSizeMatch ? (+fontSizeMatch[1].trim()) : defaultInfo.fontSize,
      fontFamily: fontFamilyMatch ? fontFamilyMatch[1].trim() : defaultInfo.fontFamily,
      color: colorMatch ? colorMatch[1].trim() : defaultInfo.color
    }
  }

  const getNewTextElement = ({
    el,
    text,
    maxLine,
    longestText,
    digitPadding,
    type,
  }: {
    el: PPTTextElement | PPTShapeElement
    text: string
    maxLine: number
    longestText?: string
    digitPadding?: boolean
    type?: TextType
  }): PPTTextElement | PPTShapeElement => {
    const padding = 10
    const width = el.width - padding * 2 - 10
    const height = el.height - padding * 2 - 10

    let content = el.type === 'text' ? el.content : el.text!.content
    
    // 使用元素中配置的maxLine（如果存在），否则使用传入的maxLine
    const effectiveMaxLine = el.type === 'text' 
      ? (el.maxLine || maxLine)
      : (el.text?.maxLine || maxLine)

    // 检查text是否包含HTML标签
    const containsHtmlTags = /<[^>]*>/g.test(text)

    const fontInfo = getFontInfo(content)
    
    // 获取是否固定容器大小
    const fixContainer = el.type === 'text' 
      ? el.fixContainer 
      : el.text?.fixContainer
      
    // 获取元素的lineHeight值
    const lineHeight = el.type === 'text'
      ? (el.lineHeight || 1.2)
      : 1.2 // 对于shape元素，text没有lineHeight属性，使用默认值

    const size = getAdaptedFontsize({
      text: longestText || text,
      fontSize: fontInfo.fontSize,
      fontFamily: fontInfo.fontFamily,
      width,
      maxLine: effectiveMaxLine,
      fixContainer,
      height,
      lineHeight
    })

    // fixContainer属性将由getAdaptedFontsize函数处理字体大小适配

    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    if (type === 'html') {
      // 如果类型是html，直接替换内容
      doc.body.innerHTML = text
      content = doc.body.innerHTML
    }
    else {
      if (containsHtmlTags) {
        // 如果传入的text包含HTML标签
        const textDoc = parser.parseFromString(text, 'text/html')

        // 获取模板中的样式信息
        const templateStyles: {
          fontSize: number;
          fontFamily: string;
          color: string;
          fontWeight?: string;
          fontStyle?: string;
        } = {
          fontSize: size,
          fontFamily: fontInfo.fontFamily,
          color: fontInfo.color
        }

        // 从模板中提取样式
        const styleRegex: Record<string, RegExp> = {
          color: /color:\s*([^;]+)/,
          fontWeight: /font-weight:\s*([^;]+)/,
          fontStyle: /font-style:\s*([^;]+)/,
          fontFamily: /font-family:\s*([^;]+)/
        }

        const templateBodyElement = doc.body.firstElementChild
        if (templateBodyElement) {
          const styleAttr = templateBodyElement.getAttribute('style')
          if (styleAttr) {
            for (const [key, regex] of Object.entries(styleRegex)) {
              const match = styleAttr.match(regex)
              if (match && match[1]) {
                (templateStyles as any)[key] = match[1]
              }
            }
          }
          
          // 检查模板元素是否有粗体特性（例如是否是strong标签或者包含strong标签）
          if (templateBodyElement.tagName.toLowerCase() === 'strong' || 
              templateBodyElement.querySelector('strong')) {
            templateStyles.fontWeight = 'bold'
          }
        }

        // 将富文本内容与模板样式结合
        if (templateBodyElement && textDoc.body.innerHTML) {
          // 将富文本内容插入到模板元素中
          templateBodyElement.innerHTML = textDoc.body.innerHTML

          // 处理样式
          const elementsToStyle = templateBodyElement.querySelectorAll('*')
          
          // 首先处理模板元素本身的样式
          let templateStyle = templateBodyElement.getAttribute('style') || ''
          
          // 确保模板元素拥有基本样式
          if (!templateStyle.includes('color:') && templateStyles.color) {
            // 只使用模板颜色，不使用富文本中提取的颜色
            templateStyle += `; color: ${templateStyles.color}`
          }
          
          if (templateStyles.fontFamily && !templateStyle.includes('font-family:')) {
            templateStyle += `; font-family: ${templateStyles.fontFamily}`
          }
          
          if (!templateStyle.includes('font-size:')) {
            templateStyle += `; font-size: ${size}px`
          }
          
          // 保留粗体样式
          if (templateStyles.fontWeight && !templateStyle.includes('font-weight:')) {
            templateStyle += `; font-weight: ${templateStyles.fontWeight}`
          }
          
          // 保留斜体样式
          if (templateStyles.fontStyle && !templateStyle.includes('font-style:')) {
            templateStyle += `; font-style: ${templateStyles.fontStyle}`
          }
          
          // 应用清理后的样式
          templateBodyElement.setAttribute('style', templateStyle.replace(/^;\s*/, ''))
          
          // 处理所有子元素
          elementsToStyle.forEach(element => {
            if (element === templateBodyElement) return
            
            const elementStyle = element.getAttribute('style') || ''
            let newStyle = elementStyle
            
            // 只为没有对应样式的元素添加模板样式
            // 不应用从富文本中提取的颜色，保留原始样式或使用模板颜色
            if (!elementStyle.includes('color:') && templateStyles.color) {
              newStyle += `; color: ${templateStyles.color}`
            }
            
            if (templateStyles.fontFamily && !elementStyle.includes('font-family:')) {
              newStyle += `; font-family: ${templateStyles.fontFamily}`
            }
            
            if (!elementStyle.includes('font-size:')) {
              // 如果元素没有字体大小，使用计算的自适应大小
              newStyle += `; font-size: ${size}px`
            }
            
            // 保留粗体样式
            // 检查元素是否为strong或b标签，如果是或者模板有粗体样式，则添加粗体
            const shouldBeBold = element.tagName.toLowerCase() === 'strong' || 
                                 element.tagName.toLowerCase() === 'b' || 
                                 (templateStyles.fontWeight === 'bold')
                                 
            if (shouldBeBold && !elementStyle.includes('font-weight:')) {
              newStyle += `; font-weight: bold`
            } 
            else if (templateStyles.fontWeight && !elementStyle.includes('font-weight:')) {
              newStyle += `; font-weight: ${templateStyles.fontWeight}`
            }
            
            // 保留斜体样式
            const shouldBeItalic = element.tagName.toLowerCase() === 'em' || 
                                 element.tagName.toLowerCase() === 'i'
                                  
            if (shouldBeItalic && !elementStyle.includes('font-style:')) {
              newStyle += `; font-style: italic`
            } 
            else if (templateStyles.fontStyle && !elementStyle.includes('font-style:')) {
              newStyle += `; font-style: ${templateStyles.fontStyle}`
            }
            
            // 应用清理后的样式
            element.setAttribute('style', newStyle.replace(/^;\s*/, ''))
          })
          
          // 特殊处理：保留strong标签的粗体效果
          const strongElements = templateBodyElement.querySelectorAll('strong, b')
          strongElements.forEach(element => {
            let elementStyle = element.getAttribute('style') || ''
            if (!elementStyle.includes('font-weight:')) {
              elementStyle += '; font-weight: bold'
              element.setAttribute('style', elementStyle.replace(/^;\s*/, ''))
            }
          })
        }
        else {
          // 如果无法解析，退回到简单替换
          // 替换所有文本节点，而不仅仅是第一个
          const treeWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
          let node = treeWalker.nextNode()
          let isFirstNode = true
          
          while (node) {
            if (isFirstNode) {
              // 第一个节点替换为完整文本
              node.textContent = text
              isFirstNode = false
            } 
            else {
              // 其他节点清空
              node.textContent = ''
            }
            node = treeWalker.nextNode()
          }
        }
        content = textDoc.body.innerHTML.replace(/font-size:\s*(\d+.?\d+)(px)?/g, `font-size: ${size}px`)
      } 
      else {
        // 如果text是纯文本，使用原来的逻辑
        const treeWalker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
        
        // 替换所有文本节点，而不仅仅是第一个
        let node = treeWalker.nextNode()
        let isFirstNode = true
        
        while (node) {
          if (isFirstNode) {
            // 第一个节点替换为完整文本
            if (digitPadding && node.textContent && node.textContent.length === 2 && text.length === 1) {
              node.textContent = '0' + text
            } 
            else {
              node.textContent = text
            }
            isFirstNode = false
          } 
          else {
            // 其他节点清空
            node.textContent = ''
          }
          node = treeWalker.nextNode()
        }
      }
      if (doc.body.innerHTML.indexOf('font-size') === -1) {
        const p = doc.querySelector('p')
        if (p) p.style.fontSize = `${size}px`
      }

      // 保留原始样式结构，仅更新字体大小值
      content = doc.body.innerHTML.replace(/font-size:\s*(\d+.?\d+)(px)?/g, `font-size: ${size}px`)
    }
    console.log('返回元素', el.type === 'text' ?
      { ...el, content } :
      { ...el, text: { ...el.text!, content } })
    return el.type === 'text' ?
      { ...el, content } :
      { ...el, text: { ...el.text!, content } }
  }

  const createSlideTextElement = (
    el: PPTTextElement | PPTShapeElement, 
    data: any,
  ): PPTTextElement | PPTShapeElement => {
    // Get text type
    const textType = el.type === 'text' ? el.textType : el.text?.type
    
    // 先获取元素自身的maxLine
    const elementMaxLine = el.type === 'text' ? el.maxLine : el.text?.maxLine
    
    // 如果元素没有maxLine，则使用默认值
    const maxLine = elementMaxLine !== undefined ? elementMaxLine : getDefaultMaxLineValue(textType)
    
    if (data.content) {
      return getNewTextElement({ 
        el, 
        text: data.content || '', 
        maxLine
      })
    }
    if (data.title) {
      return getNewTextElement({ 
        el, 
        text: data.title, 
        maxLine
      })
    }
    if (data.header) {
      return getNewTextElement({ 
        el, 
        text: data.header, 
        maxLine
      })
    }
    if (data.footer) {
      return getNewTextElement({ 
        el, 
        text: data.footer, 
        maxLine
      })
    }
    if (data.subtitle) {
      return getNewTextElement({ 
        el, 
        text: data.subtitle, 
        maxLine
      })
    }
    if (data.html) {
      return getNewTextElement({ 
        el, 
        text: typeof data.html === 'string' ? data.html : '', 
        maxLine,
        type: 'html' 
      })
    }
    
    return el
  }

  // 将默认值逻辑抽取为单独的函数以便复用
  const getDefaultMaxLineValue = (textType?: TextType): number => {
    if (!textType) return 1
    
    switch (textType) {
      case 'title': return 1
      case 'subtitle': return 1
      case 'content': return 20
      case 'item': return 4
      case 'itemTitle': return 1
      case 'header': return 4
      case 'footer': return 2
      case 'html': return 2
      case 'partNumber': return 1
      case 'itemNumber': return 1
      case 'notes': return 10
      default: return 1
    }
  }

  const getUseableImage = (el: PPTImageElement): ImgPoolItem | null => {
    let img: ImgPoolItem | null = null

    let imgs = []

    if (el.width === el.height) imgs = imgPool.value.filter(img => img.width === img.height)
    else if (el.width > el.height) imgs = imgPool.value.filter(img => img.width > img.height)
    else imgs = imgPool.value.filter(img => img.width <= img.height)
    if (!imgs.length) imgs = imgPool.value

    img = imgs[Math.floor(Math.random() * imgs.length)]
    imgPool.value = imgPool.value.filter(item => item.id !== img!.id)

    return img
  }

  const getNewImgElement = (el: PPTImageElement, data?: any): PPTImageElement => {
    // 原有本地图片处理逻辑
    const getLocalImageElement = () => {
      const img = getUseableImage(el)
      if (!img) return el

      let scale = 1
      let w = el.width
      let h = el.height
      let range: ImageClipDataRange = [[0, 0], [0, 0]]
      const radio = el.width / el.height
      if (img.width / img.height >= radio) {
        scale = img.height / el.height
        w = img.width / scale
        const diff = (w - el.width) / 2 / w * 100
        range = [[diff, 0], [100 - diff, 100]]
      }
      else {
        scale = img.width / el.width
        h = img.height / scale
        const diff = (h - el.height) / 2 / h * 100
        range = [[0, diff], [100, 100 - diff]]
      }
      const clipShape = (el.clip && el.clip.shape) ? el.clip.shape : 'rect'
      const clip = { range, shape: clipShape }
      const src = img.src

      return { ...el, src, clip }
    }
    
    // 如果有传入data且包含图像生成配置，则进行AI图像生成
    if (data && el.imageType && data[el.imageType as string] && data[el.imageType as string].imageRenderType === 'doubao') {
      // 设置全局加载状态
      isImageGenerating.value = true
      
      // 创建一个临时的加载中元素
      const loadingImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBkPSJNMTIgMkM2LjUgMiAyIDYuNSAyIDEyQzIgMTcuNSA2LjUgMjIgMTIgMjJDMTcuNSAyMiAyMiAxNy41IDIyIDEyQzIyIDYuNSAxNy41IDIgMTIgMk0xMiA0QzE2LjQgNCAyMCA3LjYgMjAgMTJDMjAgMTYuNCAxNi40IDIwIDEyIDIwQzcuNiAyMCA0IDE2LjQgNCAxMkM0IDcuNiA3LjYgNCAxMiA0TTEyIDEwLjVDMTEuMiAxMC41IDEwLjUgMTEuMiAxMC41IDEyQzEwLjUgMTIuOCAxMS4yIDEzLjUgMTIgMTMuNUMxMi44IDEzLjUgMTMuNSAxMi44IDEzLjUgMTJDMTMuNSAxMS4yIDEyLjggMTAuNSAxMiAxMC41TTcuNSA5QzYuNyA5IDYgOS43IDYgMTAuNUM2IDExLjMgNi43IDEyIDcuNSAxMkM4LjMgMTIgOSAxMS4zIDkgMTAuNUM5IDkuNyA4LjMgOSA3LjUgOU0xNi41IDlDMTUuNyA5IDE1IDkuNyAxNSAxMC41QzE1IDExLjMgMTUuNyAxMiAxNi41IDEyQzE3LjMgMTIgMTggMTEuMyAxOCAxMC41QzE4IDkuNyAxNy4zIDkgMTYuNSA5WiIgZmlsbD0iI2NjY2NjYyIvPjwvc3ZnPg=='
      
      // 先返回占位元素
      const placeholderElement = {
        ...el,
        src: loadingImage,
        isPlaceholder: true, // 添加标记，表示这是一个占位元素
        originalImageType: el.imageType, // 保存原始imageType以便后续更新
        originalData: data // 保存原始data以便后续更新
      }
      
      // 异步生成图片
      setTimeout(async () => {
        try {
          console.log('开始AI图像生成请求...', data[el.imageType as string].params)
          
          // 构建生成提示词
          const generatePrompt = data.title + data.text
          const workflow_id = data[el.imageType as string].workflow_id
          
          // 发起AI图像生成请求
          const res = await api.generateVolcengineImage({
            prompt: generatePrompt,
            workflow_id: workflow_id,
            api_token: 'pat_TJMUrXzSSsr2YwFVENZBIe2eAAqxH8d87Jugf4sikAntAOtOYKKNJ6AFWUOvDLAk'
          })
          
          console.log('AI图像生成完成:', res)
          
          // 更新幻灯片中的图片元素
          updateSlideImage(placeholderElement.id, res.image_url, undefined, generatePrompt, workflow_id)
        }
        catch (error) {
          console.error('AI图像生成失败:', error)
          // 如果AI生成失败，回退到本地图片
          const localElement = getLocalImageElement()
          updateSlideImage(placeholderElement.id, localElement.src, localElement.clip)
        }
        finally {
          // 无论成功失败都关闭加载状态
          isImageGenerating.value = false
        }
      }, 0)
      
      return placeholderElement
    }

    // 默认返回本地图片元素
    return getLocalImageElement()
  }

  // 更新幻灯片中的图片元素
  const updateSlideImage = (elementId: string, src: string, clip?: any, generatePrompt?: string, workflow_id?: string) => {
    // 查找包含该元素的幻灯片
    const slideIndex = slidesStore.slides.findIndex(slide => 
      slide.elements.some(el => el.id === elementId)
    )
    
    if (slideIndex !== -1) {
      // 找到幻灯片
      const slide = slidesStore.slides[slideIndex]
      
      // 更新元素
      const updatedElements = slide.elements.map(el => {
        if (el.id === elementId && el.type === 'image') {
          // 如果是封面图片，保存生成的URL供后续同步使用
          if (slide.type === 'cover') {
            asyncGeneratedCoverImage.value = src
          }
          return {
            ...el,
            src,
            isPlaceholder: false, // 移除占位标记
            clip: clip || (el as PPTImageElement).clip,
            generatePrompt: generatePrompt || (el as PPTImageElement).generatePrompt, // 保存生成提示词
            workflow_id: workflow_id || (el as PPTImageElement).workflow_id // 保存workflow_id
          }
        }
        return el
      })
      
      // 更新幻灯片
      const updatedSlide = {
        ...slide,
        elements: updatedElements
      }
      
      // 更新store中的幻灯片
      slidesStore.setSlides(slidesStore.slides.map((s, index) => 
        index === slideIndex ? updatedSlide : s
      ))

      // 如果是封面图片生成完成，且需要同步更新其他页面的背景图片
      if (slide.type === 'cover' && asyncGeneratedCoverImage.value) {
        synchronizeBackgroundImages()
      }
    }
  }

  // 同步背景图片到其他幻灯片
  const synchronizeBackgroundImages = () => {
    if (!asyncGeneratedCoverImage.value) return

    // 更新其他幻灯片中的背景图片
    const updatedSlides = slidesStore.slides.map(slide => {
      // 跳过封面幻灯片
      if (slide.type === 'cover') return slide
      
      // 查找具有background属性的图片元素
      const updatedElements = slide.elements.map(el => {
        if (el.type === 'image' && (el as any).imageType === 'background') {
          return {
            ...el,
            src: asyncGeneratedCoverImage.value as string, // 添加类型断言
            isPlaceholder: false,
            generatePrompt: (el as PPTImageElement).generatePrompt, // 保持原有的生成提示词
            workflow_id: (el as PPTImageElement).workflow_id // 保持原有的workflow_id
          }
        }
        return el
      })
      
      return {
        ...slide,
        elements: updatedElements
      }
    })
    
    // 更新store中的所有幻灯片
    slidesStore.setSlides(updatedSlides)
  }

  // 修改处理图片元素的逻辑，支持异步生成图片
  const processImageElement = async (el: PPTImageElement, data?: any): Promise<PPTImageElement> => {
    if (el.type === 'image' && el.imageType) {
      const result = getNewImgElement(el, data)
      return result
    }
    return el
  }

  // 处理元素，支持异步处理图片
  const processElement = async (el: PPTElement, data?: any): Promise<PPTElement> => {
    if (el.type === 'image') {
      const result = await processImageElement(el as PPTImageElement, data)
      return result
    }
    
    // 其他元素类型处理逻辑
    // ...
    
    return el
  }

  // 处理幻灯片中的所有元素，包括异步图片生成
  const processSlideElements = async (elements: PPTElement[], data?: any): Promise<PPTElement[]> => {
    const processedElements: PPTElement[] = []
    for (const element of elements) {
      const processedElement = await processElement(element, data)
      processedElements.push(processedElement)
    }
    return processedElements
  }

  const getMdContent = (content: string) => {
    const regex = /```markdown([^```]*)```/
    const match = content.match(regex)
    if (match) return match[1].trim()
    return content.replace('```markdown', '').replace('```', '')
  }

  const getJSONContent = (content: string) => {
    const regex = /```json([^```]*)```/
    const match = content.match(regex)
    if (match) return match[1].trim()
    return content.replace('```json', '').replace('```', '')
  }

  const AIPPT = async (templateSlides: Slide[], _AISlides: AIPPTSlide[], imgs?: ImgPoolItem[]) => {
    slidesStore.updateSlideIndex(slidesStore.slides.length - 1)

    if (imgs) imgPool.value = imgs

    const AISlides: AIPPTSlide[] = []
    for (const template of _AISlides) {
      if (template.type === 'content') {
        const items = template.data.items || []
        if (items.length === 5 || items.length === 6) {
          const items1 = items.slice(0, 3)
          const items2 = items.slice(3)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 3 })
        }
        else if (items.length === 7 || items.length === 8) {
          const items1 = items.slice(0, 4)
          const items2 = items.slice(4)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 4 })
        }
        else if (items.length === 9 || items.length === 10) {
          const items1 = items.slice(0, 3)
          const items2 = items.slice(3, 6)
          const items3 = items.slice(6)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 3 })
          AISlides.push({ ...template, data: { ...template.data, items: items3 }, offset: 6 })
        }
        else if (items.length > 10) {
          const items1 = items.slice(0, 4)
          const items2 = items.slice(4, 8)
          const items3 = items.slice(8)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 4 })
          AISlides.push({ ...template, data: { ...template.data, items: items3 }, offset: 8 })
        }
        else {
          AISlides.push(template)
        }
      }
      else AISlides.push(template)
    }

    const coverTemplates = templateSlides.filter(slide => slide.type === 'cover')
    const contentTemplates = templateSlides.filter(slide => slide.type === 'content')
    const endTemplates = templateSlides.filter(slide => slide.type === 'end')

    const slides: Slide[] = []
    
    // 检查是否需要同步背景图片
    const coverSlide = AISlides.find(slide => slide.type === 'cover')
    // 使用类型安全的方式检查属性存在
    const needsSyncBackgrounds = coverSlide && 
      typeof coverSlide.data === 'object' && 
      'background' in coverSlide.data && 
      typeof coverSlide.data.background === 'object' &&
      coverSlide.data.background !== null &&
      'contentImageAsync' in coverSlide.data.background && 
      coverSlide.data.background.contentImageAsync === true

    // 使用异步处理幻灯片元素
    for (const item of AISlides) {
      if (item.type === 'cover') {
        const coverTemplate = coverTemplates[Math.floor(Math.random() * coverTemplates.length)]
        // 创建元素的临时数组
        const tempElements: PPTElement[] = []
        
        // 处理每个元素
        for (const el of coverTemplate.elements) {
          if (el.type === 'image' && el.imageType) {
            const imageElement = await getNewImgElement(el, item.data)
            tempElements.push(imageElement)
          } 
          else if (el.type !== 'text' && el.type !== 'shape') {
            tempElements.push(el)
          }
          else if (checkTextType(el, 'title') && item.data.title) {
            tempElements.push(createSlideTextElement(el, { title: item.data.title }))
          }
          else if (checkTextType(el, 'subtitle') && item.data.text) {
            tempElements.push(createSlideTextElement(el, { content: item.data.text }))
          }
          else if (checkTextType(el, 'html') && item.data.html) {
            tempElements.push(createSlideTextElement(el, { html: item.data.html }))
          }
          else {
            tempElements.push(el)
          }
        }
        
        slides.push({
          ...coverTemplate,
          id: nanoid(10),
          elements: tempElements,
        })
      }
      else if (item.type === 'content') {
        const data = item.data

        // 如果存在 html 字段
        if (data.html) {
          const _contentTemplates = getUseableTemplates(contentTemplates, 1, 'html', data)
          const contentTemplate = _contentTemplates[Math.floor(Math.random() * _contentTemplates.length)]

          const elements = await Promise.all(contentTemplate.elements.map(async el => {
            if (el.type === 'image' && el.imageType && imgPool.value.length) {
              return getNewImgElement(el)
            }
            if (el.type !== 'text' && el.type !== 'shape') return el
            if (checkTextType(el, 'content')) {
              return createSlideTextElement(el, { content: data.content || '' })
            }
            if (checkTextType(el, 'title') && data.title) {
              return createSlideTextElement(el, { title: data.title })
            }
            if (checkTextType(el, 'header') && data.header) {
              return createSlideTextElement(el, { header: data.header })
            }
            if (checkTextType(el, 'footer') && data.footer) {
              return createSlideTextElement(el, { footer: data.footer })
            }
            if (checkTextType(el, 'html') && data.html) {
              return createSlideTextElement(el, { html: data.html })
            }
            return el
          }))
          slides.push({
            ...contentTemplate,
            id: nanoid(10),
            elements,
          })
        }
        // 否则使用原来的 items 逻辑
        else if (data.items?.length) {
          const items = data.items
          const _contentTemplates = getUseableTemplates(contentTemplates, items.length, 'item', data)
          const contentTemplate = _contentTemplates[Math.floor(Math.random() * _contentTemplates.length)]

          const sortedTitleItemIds = contentTemplate.elements.filter(el => checkTextType(el, 'itemTitle')).sort((a, b) => {
            const aIndex = a.left + a.top * 2
            const bIndex = b.left + b.top * 2
            return aIndex - bIndex
          }).map(el => el.id)
          const sortedTextItemIds = contentTemplate.elements.filter(el => checkTextType(el, 'item')).sort((a, b) => {
            const aIndex = a.left + a.top * 2
            const bIndex = b.left + b.top * 2
            return aIndex - bIndex
          }).map(el => el.id)

          const sortedNumberItemIds = contentTemplate.elements.filter(el => checkTextType(el, 'itemNumber')).sort((a, b) => {
            const aIndex = a.left + a.top * 2
            const bIndex = b.left + b.top * 2
            return aIndex - bIndex
          }).map(el => el.id)

          const itemTitles = []
          const itemTexts = []

          for (const _item of items) {
            if (_item.title) itemTitles.push(_item.title)
            if (_item.text) itemTexts.push(_item.text)
          }
          const longestTitle = itemTitles.reduce((longest, current) => current.length > longest.length ? current : longest, '')
          const longestText = itemTexts.reduce((longest, current) => current.length > longest.length ? current : longest, '')

          const elements = await Promise.all(contentTemplate.elements.map(async el => {
            if (el.type === 'image' && el.imageType && imgPool.value.length) {
              return getNewImgElement(el)
            }
            if (el.type !== 'text' && el.type !== 'shape') return el
            if (items.length === 1) {
              const contentItem = items[0]
              if (checkTextType(el, 'content') && contentItem.text) {
                return createSlideTextElement(el, { content: contentItem.text })
              }
            }
            else {
              if (checkTextType(el, 'itemTitle')) {
                const index = sortedTitleItemIds.findIndex(id => id === el.id)
                const contentItem = items[index]
                if (contentItem && contentItem.title) {
                  return createSlideTextElement(el, { title: contentItem.title, longestText: longestTitle })
                }
              }
              if (checkTextType(el, 'item')) {
                const index = sortedTextItemIds.findIndex(id => id === el.id)
                const contentItem = items[index]
                if (contentItem && contentItem.text) {
                  return createSlideTextElement(el, { content: contentItem.text, longestText })
                }
              }
              if (checkTextType(el, 'itemNumber')) {
                const index = sortedNumberItemIds.findIndex(id => id === el.id)
                const offset = item.offset || 0
                return createSlideTextElement(el, { content: index + offset + 1 + '', digitPadding: true })
              }
            }
            if (checkTextType(el, 'title') && data.title) {
              return createSlideTextElement(el, { title: data.title })
            }
            if (checkTextType(el, 'subtitle') && 'subtitle' in data && data.subtitle) {
              return createSlideTextElement(el, { subtitle: String(data.subtitle) })
            }
            if (checkTextType(el, 'header') && data.header) {
              return createSlideTextElement(el, { header: data.header })
            }
            if (checkTextType(el, 'footer') && data.footer) {
              return createSlideTextElement(el, { footer: data.footer })
            }
            return el
          }))
          slides.push({
            ...contentTemplate,
            id: nanoid(10),
            elements,
          })
        }
      }
      else if (item.type === 'end') {
        const endTemplate = endTemplates[Math.floor(Math.random() * endTemplates.length)]
        const elements = await Promise.all(endTemplate.elements.map(async el => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) {
            return getNewImgElement(el)
          }
          if (el.type !== 'text' && el.type !== 'shape') return el

          // 处理结束页的文本内容
          if (checkTextType(el, 'content') && item.data && item.data.content) {
            return createSlideTextElement(el, { content: item.data.content })
          }

          // 处理结束页的标题
          if (checkTextType(el, 'title') && item.data && item.data.title) {
            return createSlideTextElement(el, { title: item.data.title })
          }

          return el
        }))
        slides.push({
          ...endTemplate,
          id: nanoid(10),
          elements,
        })
      }
    }
    if (isEmptySlide.value) slidesStore.setSlides(slides)
    else addSlidesFromData(slides)
    
    // 等待所有幻灯片渲染完成后再同步背景图片
    // 使用setTimeout确保幻灯片已经渲染到store中
    setTimeout(() => {
      // 如果已经有封面图片，进行背景同步
      if (asyncGeneratedCoverImage.value) {
        console.log('所有幻灯片渲染完成，开始同步背景图片')
        synchronizeBackgroundImages()
      }
      else {
        // 设置监听器等待封面图片生成完成
        console.log('等待封面图片生成...')
        const syncInterval = setInterval(() => {
          if (asyncGeneratedCoverImage.value) {
            console.log('封面图片已生成，开始同步背景图片')
            synchronizeBackgroundImages()
            clearInterval(syncInterval)
          }
        }, 500)
        
        // 最多等待10秒
        setTimeout(() => {
          clearInterval(syncInterval)
          console.log('等待封面图片生成超时')
        }, 10000)
      }
    }, 300) // 给幻灯片渲染留出足够时间
  }

  return {
    AIPPT,
    getMdContent,
    getJSONContent,
    isImageGenerating, // 导出加载状态
  }
}