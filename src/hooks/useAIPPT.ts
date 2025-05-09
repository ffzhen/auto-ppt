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
  }: {
    text: string
    fontSize: number
    fontFamily: string
    width: number
    maxLine: number
  }) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    let newFontSize = fontSize
    const minFontSize = 10

    while (newFontSize >= minFontSize) {
      context.font = `${newFontSize}px ${fontFamily}`
      const textWidth = context.measureText(text).width
      const line = Math.ceil(textWidth / width)

      if (line <= maxLine) return newFontSize

      const step = newFontSize <= 22 ? 1 : 2
      newFontSize = newFontSize - step
    }

    return minFontSize
  }

  const getFontInfo = (htmlString: string) => {
    const fontSizeRegex = /font-size:\s*(\d+.?\d+)\s*px/i
    const fontFamilyRegex = /font-family:\s*['"]?([^'";]+)['"]?\s*(?=;|>|$)/i

    const defaultInfo = {
      fontSize: 16,
      fontFamily: 'Microsoft Yahei',
    }

    const fontSizeMatch = htmlString.match(fontSizeRegex)
    const fontFamilyMatch = htmlString.match(fontFamilyRegex)

    return {
      fontSize: fontSizeMatch ? (+fontSizeMatch[1].trim()) : defaultInfo.fontSize,
      fontFamily: fontFamilyMatch ? fontFamilyMatch[1].trim() : defaultInfo.fontFamily,
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

    let content = el.type === 'text' ? el.content : el.text!.content

    // 检查text是否包含HTML标签
    const containsHtmlTags = /<[^>]*>/g.test(text)

    const fontInfo = getFontInfo(content)
    const size = getAdaptedFontsize({
      text: longestText || text,
      fontSize: fontInfo.fontSize,
      fontFamily: fontInfo.fontFamily,
      width,
      maxLine,
    })

    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    if (type === 'html') {
      // 如果类型是html，直接替换内容
      doc.body.innerHTML = text
      content = doc.body.innerHTML
    } else {
      if (containsHtmlTags) {
        // 如果传入的text包含HTML标签
        const textDoc = parser.parseFromString(text, 'text/html')

        // 获取模板中的样式信息
        const templateStyles: {
          fontSize: number;
          fontFamily: string;
          color: string;
          textAlign: string;
          fontWeight: string;
          fontStyle: string;
        } = {
          fontSize: fontInfo.fontSize,
          fontFamily: fontInfo.fontFamily,
          color: '',
          textAlign: '',
          fontWeight: '',
          fontStyle: '',
        }

        // 从模板中提取样式
        const styleRegex: Record<string, RegExp> = {
          color: /color:\s*([^;]+)/,
          textAlign: /text-align:\s*([^;]+)/,
          fontWeight: /font-weight:\s*([^;]+)/,
          fontStyle: /font-style:\s*([^;]+)/,
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
        }

        // 将富文本内容与模板样式结合
        if (templateBodyElement && textDoc.body.innerHTML) {
          // 将富文本内容插入到模板元素中
          templateBodyElement.innerHTML = textDoc.body.innerHTML

          // 处理字体大小
          const elementsWithFontSize = templateBodyElement.querySelectorAll('[style*="font-size"]')
          if (elementsWithFontSize.length > 0) {
            const style = elementsWithFontSize[0].getAttribute('style') || ''
            const fontSizeMatch = style.match(/font-size:\s*([^;]+)/)
            if (fontSizeMatch && fontSizeMatch[1]) {
              const extractedSize = fontSizeMatch[1].trim()
              let pStyle = templateBodyElement.getAttribute('style') || ''
              if (!pStyle.includes('font-size')) {
                pStyle += `; font-size: ${extractedSize}`
                templateBodyElement.setAttribute('style', pStyle.replace(/^;\s*/, ''))
              }
            }
          } else {
            let pStyle = templateBodyElement.getAttribute('style') || ''
            if (!pStyle.includes('font-size')) {
              pStyle += `; font-size: ${size}px`
              templateBodyElement.setAttribute('style', pStyle.replace(/^;\s*/, ''))
            }
          }
        } else {
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

    return el.type === 'text' ?
      { ...el, content, lineHeight: size < 15 ? 1.2 : el.lineHeight } :
      { ...el, text: { ...el.text!, content } }
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
          
          // 发起AI图像生成请求
          const res = await api.generateVolcengineImage({
            prompt: data[el.imageType as string].params.text_prompt,
            workflow_id: '7497907182836858915',
            api_token: 'pat_TJMUrXzSSsr2YwFVENZBIe2eAAqxH8d87Jugf4sikAntAOtOYKKNJ6AFWUOvDLAk'
          })
          
          console.log('AI图像生成完成:', res)
          
          // 更新幻灯片中的图片元素
          updateSlideImage(placeholderElement.id, res.image_url)
        } catch (error) {
          console.error('AI图像生成失败:', error)
          // 如果AI生成失败，回退到本地图片
          const localElement = getLocalImageElement()
          updateSlideImage(placeholderElement.id, localElement.src, localElement.clip)
        }
      }, 0)
      
      return placeholderElement
    }

    // 默认返回本地图片元素
    return getLocalImageElement()
  }

  // 更新幻灯片中的图片元素
  const updateSlideImage = (elementId: string, src: string, clip?: any) => {
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
            clip: clip || (el as PPTImageElement).clip
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
            isPlaceholder: false
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
    debugger
    slidesStore.updateSlideIndex(slidesStore.slides.length - 1)

    if (imgs) imgPool.value = imgs

    const AISlides: AIPPTSlide[] = []
    console.log(_AISlides)
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
    console.log('needsSyncBackgrounds', needsSyncBackgrounds)

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
            tempElements.push(getNewTextElement({ el, text: item.data.title, maxLine: 1 }))
          }
          else if (checkTextType(el, 'subtitle') && item.data.text) {
            tempElements.push(getNewTextElement({ el, text: item.data.text, maxLine: 3 }))
          }
          else if (checkTextType(el, 'html') && item.data.html) {
            tempElements.push(getNewTextElement({ el, text: item.data.html, maxLine: 3, type: 'html' }))
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
              return getNewTextElement({ el, text: data.content || '', maxLine: 20 })
            }
            if (checkTextType(el, 'title') && data.title) {
              return getNewTextElement({ el, text: data.title, maxLine: 1 })
            }
            if (checkTextType(el, 'header') && data.header) {
              return getNewTextElement({ el, text: data.header, maxLine: 4 })
            }
            if (checkTextType(el, 'footer') && data.footer) {
              return getNewTextElement({ el, text: data.footer, maxLine: 2 })
            }
            if (checkTextType(el, 'html') && data.html) {
              return getNewTextElement({ el, text: typeof data.html === 'string' ? data.html : '', maxLine: 2, type: 'html' })
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
                return getNewTextElement({ el, text: contentItem.text, maxLine: 6 })
              }
            }
            else {
              if (checkTextType(el, 'itemTitle')) {
                const index = sortedTitleItemIds.findIndex(id => id === el.id)
                const contentItem = items[index]
                if (contentItem && contentItem.title) {
                  return getNewTextElement({ el, text: contentItem.title, longestText: longestTitle, maxLine: 1 })
                }
              }
              if (checkTextType(el, 'item')) {
                const index = sortedTextItemIds.findIndex(id => id === el.id)
                const contentItem = items[index]
                if (contentItem && contentItem.text) {
                  return getNewTextElement({ el, text: contentItem.text, longestText, maxLine: 4 })
                }
              }
              if (checkTextType(el, 'itemNumber')) {
                const index = sortedNumberItemIds.findIndex(id => id === el.id)
                const offset = item.offset || 0
                return getNewTextElement({ el, text: index + offset + 1 + '', maxLine: 1, digitPadding: true })
              }
            }
            if (checkTextType(el, 'title') && data.title) {
              return getNewTextElement({ el, text: data.title, maxLine: 1 })
            }
            if (checkTextType(el, 'subtitle') && 'subtitle' in data && data.subtitle) {
              return getNewTextElement({ el, text: String(data.subtitle), maxLine: 1 })
            }
            if (checkTextType(el, 'header') && data.header) {
              return getNewTextElement({ el, text: data.header, maxLine: 4 })
            }
            if (checkTextType(el, 'footer') && data.footer) {
              return getNewTextElement({ el, text: data.footer, maxLine: 2 })
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
            return getNewTextElement({ el, text: item.data.content, maxLine: 8 })
          }

          // 处理结束页的标题
          if (checkTextType(el, 'title') && item.data && item.data.title) {
            return getNewTextElement({ el, text: item.data.title, maxLine: 2 })
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
      } else {
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
  }
}