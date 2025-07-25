export interface MarkdownElement {
  type: 'heading' | 'ul' | 'ol' | 'paragraph' | 'code' | 'blockquote' | 'hr'
  content: string
  raw: string
  complexity: number
  level?: number
  items?: ListItem[]
  globalStartIndex?: number // 列表的全局开始索引
}

export interface ListItem {
  content: string
  raw: string
  globalIndex: number // 全局列表项索引
  complexity: number
}

// 全局列表计数器
let globalListCounter = 0

// 解析Markdown为结构化元素
export function parseMarkdownToElements(content: string): MarkdownElement[] {
  const lines = content.split('\n')
  const elements: MarkdownElement[] = []
  let currentElement: MarkdownElement | null = null
  
  // 重置全局计数器
  globalListCounter = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (!line) continue

    // 标题
    if (line.match(/^#{1,6}\s/)) {
      if (currentElement) elements.push(currentElement)
      currentElement = {
        type: 'heading',
        level: line.match(/^(#{1,6})/)?.[1].length || 1,
        content: String(line || ''),
        raw: String(line || ''),
        complexity: 15 // 标题复杂度
      }
    }
    // 无序列表
    else if (line.match(/^[-*+]\s/)) {
      if (currentElement?.type !== 'ul') {
        if (currentElement) elements.push(currentElement)
        currentElement = {
          type: 'ul',
          items: [],
          content: '',
          raw: '',
          complexity: 0,
          globalStartIndex: globalListCounter + 1
        }
      }
      globalListCounter++
      const item: ListItem = {
        content: String(line || ''),
        raw: String(line || ''),
        globalIndex: globalListCounter,
        complexity: 8 // 每个列表项复杂度
      }
      currentElement.items = currentElement.items || []
      currentElement.items.push(item)
      currentElement.raw += (currentElement.raw ? '\n' : '') + String(line || '')
      currentElement.complexity += 8
    }
    // 有序列表
    else if (line.match(/^\d+\.\s/)) {
      if (currentElement?.type !== 'ol') {
        if (currentElement) elements.push(currentElement)
        currentElement = {
          type: 'ol',
          items: [],
          content: '',
          raw: '',
          complexity: 0,
          globalStartIndex: globalListCounter + 1
        }
      }
      globalListCounter++
      const item: ListItem = {
        content: String(line || ''),
        raw: String(line || ''),
        globalIndex: globalListCounter,
        complexity: 8 // 每个列表项复杂度
      }
      currentElement.items = currentElement.items || []
      currentElement.items.push(item)
      currentElement.raw += (currentElement.raw ? '\n' : '') + String(line || '')
      currentElement.complexity += 8
    }
    // 代码块
    else if (line.match(/^```/)) {
      if (currentElement) elements.push(currentElement)
      let codeContent = line + '\n'
      i++
      while (i < lines.length && !lines[i].match(/^```/)) {
        codeContent += lines[i] + '\n'
        i++
      }
      if (i < lines.length) codeContent += lines[i] // 结束的```
      
      currentElement = {
        type: 'code',
        content: String(codeContent || ''),
        raw: String(codeContent || ''),
        complexity: 25 // 代码块复杂度较高
      }
    }
    // 引用
    else if (line.match(/^>/)) {
      if (currentElement?.type !== 'blockquote') {
        if (currentElement) elements.push(currentElement)
        currentElement = {
          type: 'blockquote',
          content: '',
          raw: '',
          complexity: 0
        }
      }
      currentElement.content += (currentElement.content ? '\n' : '') + String(line || '')
      currentElement.raw += (currentElement.raw ? '\n' : '') + String(line || '')
      currentElement.complexity += 12 // 引用复杂度
    }
    // 分割线
    else if (line.match(/^---+$/)) {
      if (currentElement) elements.push(currentElement)
      currentElement = {
        type: 'hr',
        content: String(line || ''),
        raw: String(line || ''),
        complexity: 5
      }
    }
    // 普通段落
    else {
      if (currentElement?.type !== 'paragraph') {
        if (currentElement) elements.push(currentElement)
        currentElement = {
          type: 'paragraph',
          content: '',
          raw: '',
          complexity: 0
        }
      }
      currentElement.content += (currentElement.content ? '\n' : '') + String(line || '')
      currentElement.raw += (currentElement.raw ? '\n' : '') + String(line || '')
      currentElement.complexity += Math.min(line.length / 10, 15) // 根据长度计算复杂度
    }
  }

  if (currentElement) elements.push(currentElement)
  return elements
}

// 将元素分割到多张卡片
export function splitElementsToCards(elements: MarkdownElement[]): MarkdownElement[][] {
  const cards: MarkdownElement[][] = []
  let currentCard: MarkdownElement[] = []
  let currentComplexity = 0
  const maxComplexity = 120 // 每张卡片的最大复杂度

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]
    
    // 如果是大型列表，需要智能拆分并保持连续性
    if ((element.type === 'ul' || element.type === 'ol') && element.items && element.items.length > 0) {
      const splitLists = splitLongListWithContinuity(element, maxComplexity, currentComplexity)
      
      for (let j = 0; j < splitLists.length; j++) {
        const listPart = splitLists[j]
        
        if (currentComplexity + listPart.complexity > maxComplexity && currentCard.length > 0) {
          // 开始新卡片
          cards.push([...currentCard])
          currentCard = [listPart]
          currentComplexity = listPart.complexity
        }
        else {
          currentCard.push(listPart)
          currentComplexity += listPart.complexity
        }
      }
    }
    // 标题通常开始新卡片（除非是第一个元素）
    else if (element.type === 'heading' && currentCard.length > 0 && currentComplexity > 60) {
      cards.push([...currentCard])
      currentCard = [element]
      currentComplexity = element.complexity
    }
    // 其他元素
    else if (currentComplexity + element.complexity > maxComplexity && currentCard.length > 0) {
      cards.push([...currentCard])
      currentCard = [element]
      currentComplexity = element.complexity
    }
    else {
      currentCard.push(element)
      currentComplexity += element.complexity
    }
  }

  if (currentCard.length > 0) {
    cards.push(currentCard)
  }

  return cards.length > 0 ? cards : [elements]
}

// 拆分长列表并保持连续性
function splitLongListWithContinuity(listElement: MarkdownElement, maxComplexity: number, currentComplexity: number): MarkdownElement[] {
  if (!listElement.items || listElement.complexity + currentComplexity <= maxComplexity) {
    return [listElement]
  }

  const parts: MarkdownElement[] = []
  const itemsPerPart = Math.floor((maxComplexity - 20) / 8) // 预留空间，每项8复杂度
  const items = listElement.items
  
  for (let i = 0; i < items.length; i += itemsPerPart) {
    const partItems = items.slice(i, i + itemsPerPart)
    const part: MarkdownElement = {
      ...listElement,
      items: partItems,
      raw: generateListMarkdown(listElement.type as 'ul' | 'ol', partItems),
      complexity: partItems.length * 8,
      globalStartIndex: partItems[0]?.globalIndex
    }
    parts.push(part)
  }

  return parts
}

// 生成保持索引连续性的列表Markdown
function generateListMarkdown(listType: 'ul' | 'ol', items: ListItem[]): string {
  if (listType === 'ul') {
    return items.map(item => String(item.raw || '')).join('\n')
  }
  
  // 对于有序列表，重新生成序号但保持内容
  return items.map((item, index) => {
    const rawContent = String(item.raw || '')
    const content = rawContent.replace(/^\d+\./, '')
    return `${index + 1}.${content}`
  }).join('\n')
} 