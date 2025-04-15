import { ref } from 'vue'
import { nanoid } from 'nanoid'
import type { ImageClipDataRange, PPTElement, PPTImageElement, PPTShapeElement, PPTTextElement, Slide, TextType } from '@/types/slides'
import type { AIPPTSlide } from '@/types/AIPPT'
import { useSlidesStore } from '@/store'
import useAddSlidesOrElements from './useAddSlidesOrElements'
import useSlideHandler from './useSlideHandler'

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
  }: {
    el: PPTTextElement | PPTShapeElement
    text: string
    maxLine: number
    longestText?: string
    digitPadding?: boolean
  }): PPTTextElement | PPTShapeElement => {
    const padding = 10
    const width = el.width - padding * 2 - 10
    
    let content = el.type === 'text' ? el.content : el.text!.content
    
    // 检查text是否包含HTML标签
    const containsHtmlTags = /<[^>]*>/g.test(text);
    
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
    
    if (containsHtmlTags) {
      // 如果text包含HTML标签，解析text并与模板样式合并
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
      
      // 查找模板中的样式
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
        
        // 查找内部元素的字体大小，优先使用它
        let fontSize = size
        const elementsWithFontSize = templateBodyElement.querySelectorAll('[style*="font-size"]')
        if (elementsWithFontSize.length > 0) {
          // 从第一个带有font-size的元素中提取字体大小
          const style = elementsWithFontSize[0].getAttribute('style') || ''
          const fontSizeMatch = style.match(/font-size:\s*([^;]+)/)
          if (fontSizeMatch && fontSizeMatch[1]) {
            // 提取字体大小数值
            const extractedSize = fontSizeMatch[1].trim()
            // 确保外层p元素也应用相同的字体大小
            let pStyle = templateBodyElement.getAttribute('style') || ''
            if (!pStyle.includes('font-size')) {
              pStyle += `; font-size: ${extractedSize}`
              templateBodyElement.setAttribute('style', pStyle.replace(/^;\s*/, ''))
            }
          }
        } else {
          // 如果内部元素没有设置字体大小，使用计算出的size
          let pStyle = templateBodyElement.getAttribute('style') || ''
          if (!pStyle.includes('font-size')) {
            pStyle += `; font-size: ${size}px`
            templateBodyElement.setAttribute('style', pStyle.replace(/^;\s*/, ''))
          }
        }
      } else {
        // 如果无法解析，退回到简单替换
        const firstTextNode = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT).nextNode()
        if (firstTextNode) {
          firstTextNode.textContent = text
        }
      }
    } else {
      // 如果text是纯文本，使用原来的逻辑
      const treeWalker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
      
      const firstTextNode = treeWalker.nextNode()
      if (firstTextNode) {
        if (digitPadding && firstTextNode.textContent && firstTextNode.textContent.length === 2 && text.length === 1) {
          firstTextNode.textContent = '0' + text
        }
        else firstTextNode.textContent = text
      }
    }
    
    if (doc.body.innerHTML.indexOf('font-size') === -1) {
      const p = doc.querySelector('p')
      if (p) p.style.fontSize = '16px'
    }
    
    content = doc.body.innerHTML.replace(/font-size:(.+?)px/g, `font-size: ${size}px`)
    
    return el.type === 'text' ? { ...el, content, lineHeight: size < 15 ? 1.2 : el.lineHeight } : { ...el, text: { ...el.text!, content } }
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
  
  const getNewImgElement = (el: PPTImageElement): PPTImageElement => {
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

  const AIPPT = (templateSlides: Slide[], _AISlides: AIPPTSlide[], imgs?: ImgPoolItem[]) => {
    slidesStore.updateSlideIndex(slidesStore.slides.length - 1)

    if (imgs) imgPool.value = imgs

    const AISlides: AIPPTSlide[] = []
    console.log(_AISlides)
    for (const template of _AISlides) {
      if (template.type === 'content') {
        const items = template.data.items
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
      else if (template.type === 'contents') {
        const items = template.data.items
        if (items.length === 7) {
          const items1 = items.slice(0, 5)
          const items2 = items.slice(5)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 5 })
        }
        else if (items.length > 7 && items.length <= 12) {
          const items1 = items.slice(0, 6)
          const items2 = items.slice(6)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 6 })
        }
        else if (items.length === 13) {
          const items1 = items.slice(0, 6)
          const items2 = items.slice(6, 11)
          const items3 = items.slice(11)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 6 })
          AISlides.push({ ...template, data: { ...template.data, items: items3 }, offset: 11 })
        }
        else if (items.length > 13) {
          const items1 = items.slice(0, 6)
          const items2 = items.slice(6, 12)
          const items3 = items.slice(12)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 6 })
          AISlides.push({ ...template, data: { ...template.data, items: items3 }, offset: 12 })
        }
        else {
          AISlides.push(template)
        }
      }
      else AISlides.push(template)
    }

    const coverTemplates = templateSlides.filter(slide => slide.type === 'cover')
    const contentTemplates = templateSlides.filter(slide => slide.type === 'content')
    const contentsTemplates = templateSlides.filter(slide => slide.type === 'contents')
    const endTemplates = templateSlides.filter(slide => slide.type === 'end')

    const slides = []
    
    for (const item of AISlides) {
      if (item.type === 'cover') {
        const coverTemplate = coverTemplates[Math.floor(Math.random() * coverTemplates.length)]
        const elements = coverTemplate.elements.map(el => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el)
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (checkTextType(el, 'title') && item.data.title) {
            return getNewTextElement({ el, text: item.data.title, maxLine: 1 })
          }
          if (checkTextType(el, 'subtitle') && item.data.text) {
            return getNewTextElement({ el, text: item.data.text, maxLine: 3 })
          }
          return el
        })
        slides.push({
          ...coverTemplate,
          id: nanoid(10),
          elements,
        })
      }
      else if (item.type === 'content') {
        const _contentTemplates = getUseableTemplates(contentTemplates, item.data.items.length, 'item', item.data)
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

        for (const _item of item.data.items) {
          if (_item.title) itemTitles.push(_item.title)
          if (_item.text) itemTexts.push(_item.text)
        }
        const longestTitle = itemTitles.reduce((longest, current) => current.length > longest.length ? current : longest, '')
        const longestText = itemTexts.reduce((longest, current) => current.length > longest.length ? current : longest, '')

        const elements = contentTemplate.elements.map(el => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el)
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (item.data.items.length === 1) {
            const contentItem = item.data.items[0]
            if (checkTextType(el, 'content') && contentItem.text) {
              return getNewTextElement({ el, text: contentItem.text, maxLine: 6 })
            }
          }
          else {
            if (checkTextType(el, 'itemTitle')) {
              const index = sortedTitleItemIds.findIndex(id => id === el.id)
              const contentItem = item.data.items[index]
              if (contentItem && contentItem.title) {
                return getNewTextElement({ el, text: contentItem.title, longestText: longestTitle, maxLine: 1 })
              }
            }
            if (checkTextType(el, 'item')) {
              const index = sortedTextItemIds.findIndex(id => id === el.id)
              const contentItem = item.data.items[index]
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
          if (checkTextType(el, 'title') && item.data.title) {
            return getNewTextElement({ el, text: item.data.title, maxLine: 1 })
          }
          if (checkTextType(el, 'header') && item.data.header) {
            return getNewTextElement({ el, text: item.data.header, maxLine: 4 })
          }
          if (checkTextType(el, 'footer') && item.data.footer) {
            return getNewTextElement({ el, text: item.data.footer, maxLine: 2 })
          }
          return el
        })
        slides.push({
          ...contentTemplate,
          id: nanoid(10),
          elements,
        })
      }
      else if (item.type === 'end') {
        const endTemplate = endTemplates[Math.floor(Math.random() * endTemplates.length)]
        const elements = endTemplate.elements.map(el => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el)
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
        })
        slides.push({
          ...endTemplate,
          id: nanoid(10),
          elements,
        })
      }
    }
    if (isEmptySlide.value) slidesStore.setSlides(slides)
    else addSlidesFromData(slides)
  }

  return {
    AIPPT,
    getMdContent,
    getJSONContent,
  }
}