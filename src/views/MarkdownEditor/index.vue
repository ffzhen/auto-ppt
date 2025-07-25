<template>
  <div class="markdown-editor">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h1>Markdown 卡片制作器</h1>
        <div class="actions">
          <el-button @click="newFile" size="small" type="primary">新建</el-button>
          <el-button @click="openFile" size="small">打开</el-button>
          <el-button @click="saveFile" size="small">保存</el-button>
        </div>
      </div>
      
      <div class="toolbar-right">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="split">分屏</el-radio-button>
          <el-radio-button value="edit">编辑</el-radio-button>
          <el-radio-button value="cards">卡片预览</el-radio-button>
        </el-radio-group>
        
        <el-dropdown @command="handleExport">
          <el-button type="primary" size="small">导出</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="html">导出为 HTML</el-dropdown-item>
              <el-dropdown-item command="markdown">导出为 Markdown</el-dropdown-item>
              <el-dropdown-item command="images">导出卡片图片</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content" :class="viewMode">
      <!-- 编辑器面板 -->
      <div class="editor-panel" v-show="showEditor">
        <div class="panel-header">
          <span>Markdown 源码</span>
          <div class="buttons">
            <el-button @click="insertBold" size="small" text><strong>B</strong></el-button>
            <el-button @click="insertItalic" size="small" text><em>I</em></el-button>
            <el-button @click="insertCode" size="small" text>Code</el-button>
            <el-button @click="insertDivider" size="small" text>---</el-button>
          </div>
        </div>
        <textarea
          ref="editorTextarea"
          v-model="markdownContent"
          class="editor"
          placeholder="请输入 Markdown 内容...&#10;&#10;使用 --- 分割线来分隔不同的卡片"
        ></textarea>
      </div>

      <!-- 分割线 -->
      <div class="divider" v-show="viewMode === 'split'"></div>

      <!-- 卡片预览面板 -->
      <div class="preview-panel" v-show="showPreview">
        <div class="panel-header">
          <span>卡片预览 ({{ cards.length }}张)</span>
          <div class="preview-controls">
            <el-button @click="copyHtml" size="small" text>复制 HTML</el-button>
            <el-button @click="prevCard" size="small" text :disabled="currentCardIndex === 0" v-if="cards.length > 1">
              ← 上一张
            </el-button>
            <span v-if="cards.length > 1" class="card-indicator">
              {{ currentCardIndex + 1 }} / {{ cards.length }}
            </span>
            <el-button @click="nextCard" size="small" text :disabled="currentCardIndex === cards.length - 1" v-if="cards.length > 1">
              下一张 →
            </el-button>
          </div>
        </div>
        <div class="cards-container">
          <div 
            v-for="(card, index) in cards" 
            :key="index"
            :ref="el => setCardRef(el, index)"
            class="card-wrapper"
            :class="{ active: index === currentCardIndex }"
            :style="cardWrapperStyle"
            v-show="viewMode === 'cards' ? index === currentCardIndex : true"
          >
            <div 
              class="card-content preview" 
              :style="cardContentStyle"
              v-html="card.html"
            ></div>
          </div>
        </div>
      </div>

      <!-- 分割线 -->
      <div class="divider" v-show="viewMode === 'split'"></div>

      <!-- 设置面板 -->
      <div class="settings-panel" v-show="showSettings">
        <div class="panel-header">
          <span>卡片设置</span>
        </div>
        <div class="settings-content">
          <!-- 模版选择 -->
          <div class="setting-group">
            <label>选择模版</label>
            <div class="template-grid">
              <div 
                v-for="template in cardTemplates" 
                :key="template.id"
                :class="['template-item', { active: selectedTemplate.id === template.id }]"
                @click="selectTemplate(template)"
              >
                <div class="template-icon">{{ template.icon }}</div>
                <div class="template-name">{{ template.name }}</div>
              </div>
            </div>
          </div>

          <!-- 卡片尺寸 -->
          <div class="setting-group">
            <label>卡片尺寸</label>
            <div class="size-controls">
              <div class="size-item">
                <span>宽度</span>
                <el-input-number 
                  v-model="cardWidth" 
                  :min="200" 
                  :max="800" 
                  size="small"
                  controls-position="right"
                />
                <span>px</span>
              </div>
              <div class="size-item">
                <span>高度</span>
                <el-input-number 
                  v-model="cardHeight" 
                  :min="200" 
                  :max="1000" 
                  size="small"
                  controls-position="right"
                />
                <span>px</span>
              </div>
            </div>
          </div>

          <!-- 拆分选项 -->
          <div class="setting-group">
            <label>卡片拆分</label>
            <el-radio-group v-model="splitMode" size="small">
              <el-radio value="none">不拆分</el-radio>
              <el-radio value="auto">自动拆分</el-radio>
              <el-radio value="divider">按分割线拆分</el-radio>
            </el-radio-group>
            <p class="hint">{{ splitMode === 'divider' ? '使用 --- 分割不同卡片' : splitMode === 'auto' ? '自动按内容结构拆分' : '单张卡片预览' }}</p>
          </div>

          <!-- 导出选项 -->
          <div class="setting-group">
            <label>导出设置</label>
            <div class="export-controls">
              <el-button @click="exportAllCards" type="primary" size="small">
                导出所有卡片
              </el-button>
              <el-button @click="exportCurrentCard" size="small" v-if="cards.length > 1">
                导出当前卡片
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept=".md,.txt"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- 动态样式 -->
    <component :is="'style'" v-if="selectedTemplate.customCSS">
      {{ selectedTemplate.customCSS }}
    </component>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watchEffect, type ComponentPublicInstance } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { ElMessage } from 'element-plus'
import { cardTemplates, type CardTemplate, type SplitMode } from '@/types/cardTemplates'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { parseMarkdownToElements, type MarkdownElement, type ListItem } from '@/utils/markdownSplitter'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

// 响应式数据
const markdownContent = ref(`# 📝 Markdown 卡片制作器

一个强大的卡片制作工具，支持多种精美模版。

## ✨ 功能特性

- **模版丰富**: 4种精美卡片模版
- **智能拆分**: 自动或手动拆分卡片
- **实时预览**: 所见即所得
- **一键导出**: 批量导出高清图片

---

# 🎨 使用技巧

1. 选择喜欢的模版
2. 调整卡片尺寸
3. 使用 \`---\` 分割不同卡片
4. 导出精美卡片图片

> **提示**: 切换到"卡片预览"模式查看效果

---

# 🚀 开始创作

现在就开始制作你的专属卡片吧！

\`\`\`javascript
// 代码也会被美美地展示
console.log("Hello, Card Maker!");
\`\`\``)

const viewMode = ref<'split' | 'edit' | 'cards'>('split')
const splitMode = ref<SplitMode>('auto')
const currentFileName = ref('untitled.md')
const selectedTemplate = ref<CardTemplate>(cardTemplates[0])
const cardWidth = ref(440) // 卡片宽度
const cardHeight = ref(586) // 卡片高度
const currentCardIndex = ref(0)

// 卡片数据使用ref而不是computed
const cards = ref<Array<{ content: string; html: string }>>([])

// DOM 引用
const editorTextarea = ref<HTMLTextAreaElement>()
const fileInput = ref<HTMLInputElement>()
const cardRefs = ref<Array<HTMLElement | null>>([])

// 计算属性
const showEditor = computed(() => viewMode.value === 'split' || viewMode.value === 'edit')
const showPreview = computed(() => viewMode.value === 'split' || viewMode.value === 'cards')
const showSettings = computed(() => viewMode.value === 'split' || viewMode.value === 'cards')

// 异步更新卡片内容
async function updateCards() {
  if (splitMode.value === 'none') {
    // 不拆分模式：无论内容多长都只生成一张卡片
    const html = await renderWithContinuity(markdownContent.value, { ul: 0, ol: 0 })
    cards.value = [{
      content: markdownContent.value,
      html
    }]
    return
  }

  if (splitMode.value === 'divider') {
    const sections = markdownContent.value.split(/^---$/gm)
      .map(section => section.trim())
      .filter(section => section.length > 0)
    
    const processedCards: Array<{ content: string; html: string }> = []
    
    for (const section of sections) {
      // 每个分割段独立计算列表索引，从0开始
      const sectionStartCounts = { ul: 0, ol: 0 }
      
      // 检查每个分割段是否超出高度限制
      if (await checkContentExceedsHeight(section)) {
        // 如果超出，对该段进行智能细分（段内保持连续性）
        const subCards = await smartSplitByHeight(section, sectionStartCounts)
        processedCards.push(...subCards)
      }
      else {
        // 如果不超出，直接添加
        const html = await renderWithContinuity(section, sectionStartCounts)
        processedCards.push({
          content: section,
          html
        })
      }
    }
    
    cards.value = processedCards
    return
  }

  if (splitMode.value === 'auto') {
    const content = markdownContent.value.trim()
    if (!content) {
      cards.value = []
      return
    }

    const splitCards = await simpleAutoSplit(content)
    cards.value = splitCards
    return
  }

  cards.value = []
}

// 检查内容是否超出高度限制
async function checkContentExceedsHeight(content: string): Promise<boolean> {
  if (!content.trim()) return false
  
  const measureContainer = createMeasureContainer()
  
  try {
    const html = await marked(content)
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    // 完全复制卡片内容的样式
    Object.assign(tempDiv.style, {
      ...selectedTemplate.value.styles,
      width: '100%',
      height: 'auto', // 让内容自然展开以测量高度
      maxHeight: 'none',
      overflow: 'visible',
      boxSizing: 'border-box'
    })
    
    measureContainer.appendChild(tempDiv)
    const contentHeight = tempDiv.offsetHeight
    measureContainer.removeChild(tempDiv)
    
    // 使用更宽松的高度检查，预留更多空间
    const usableHeight = cardHeight.value * 0.9 // 使用90%的高度作为阈值
    return contentHeight > usableHeight
  }
  catch (error) {
    console.error('检查内容高度时出错:', error)
    return false
  }
  finally {
    document.body.removeChild(measureContainer)
  }
}

// 计算内容中的列表项数量 - 按类型分别计算
function countListItemsInContent(content: string): { ul: number; ol: number } {
  const lines = content.split('\n')
  const ulCount = lines.filter(line => line.trim().match(/^[-*+]\s/)).length
  const olCount = lines.filter(line => line.trim().match(/^\d+\.\s/)).length
  return { ul: ulCount, ol: olCount }
}

// 计算卡片内容区域的实际可用高度
function calculateUsableHeight(): number {
  const template = selectedTemplate.value
  console.log('🎨 当前模板:', template.name, '(', template.id, ')')
  
  // 解析当前模板的垂直padding
  let verticalPadding = 0
  const paddingStr = template.styles.padding
  console.log('📦 原始padding值:', paddingStr)
  
  if (paddingStr.includes('px')) {
    const paddingValues = paddingStr.replace(/px/g, '').split(/\s+/).map(Number)
    console.log('📏 解析的padding数组:', paddingValues)
    
    if (paddingValues.length === 1) {
      // 四个方向相同 padding: "24px"
      verticalPadding = paddingValues[0] * 2
      console.log('📐 四个方向相同padding，垂直padding:', verticalPadding, 'px')
    }
    else if (paddingValues.length === 2) {
      // 上下、左右 padding: "24px 32px"
      verticalPadding = paddingValues[0] * 2
      console.log('📐 上下左右padding，垂直padding:', verticalPadding, 'px')
    }
    else if (paddingValues.length === 4) {
      // 上、右、下、左 padding: "32px 28px 32px 48px"
      verticalPadding = paddingValues[0] + paddingValues[2]
      console.log('📐 四个方向不同padding，垂直padding:', `${paddingValues[0]} + ${paddingValues[2]} = ${verticalPadding}px`)
    }
  }
  
  // 实际测量header和footer的高度
  const measureContainer = createMeasureContainer()
  let headerFooterHeight = 0
  
  try {
    // 创建完整的卡片结构来测量header和footer高度
    const cardElement = document.createElement('section')
    cardElement.className = `card markdown-body ${template.id}`
    cardElement.style.cssText = `
      height: auto;
      width: ${cardWidth.value}px;
      max-width: ${cardWidth.value}px;
      --card-height: ${cardHeight.value}px;
    `
    
    // 卡片头部（空内容）
    const headerElement = document.createElement('section')
    headerElement.className = 'card-header'
    const titleElement = document.createElement('section')
    titleElement.className = 'card-title'
    headerElement.appendChild(titleElement)
    
    // 卡片底部（空内容）
    const footerElement = document.createElement('section')
    footerElement.className = 'card-footer'
    
    // 组装卡片（只包含header和footer，不包含内容）
    cardElement.appendChild(headerElement)
    cardElement.appendChild(footerElement)
    
    measureContainer.appendChild(cardElement)
    headerFooterHeight = cardElement.offsetHeight
    measureContainer.removeChild(cardElement)
    
    console.log('🏗️ 实际测量的Header/Footer高度:', headerFooterHeight, 'px')
  }
  catch (error) {
    console.error('测量header/footer高度时出错:', error)
    // 如果测量失败，回退到估算值
    headerFooterHeight = 20
    console.log('⚠️ 使用回退的Header/Footer高度:', headerFooterHeight, 'px')
  }
  finally {
    document.body.removeChild(measureContainer)
  }
  
  // 实际可用高度 = 卡片总高度 - 垂直padding - header/footer高度
  const usableHeight = cardHeight.value - verticalPadding - headerFooterHeight
  console.log('🧮 高度计算:', `${cardHeight.value} - ${verticalPadding} - ${headerFooterHeight} = ${usableHeight}px`)
  
  const finalHeight = Math.max(usableHeight, cardHeight.value * 0.5) // 最小保证50%的高度
  if (finalHeight !== usableHeight) {
    console.log('⚠️ 使用最小高度保护:', finalHeight, 'px (50%高度)')
  }
  
  return finalHeight
}

// 简单的自动拆分算法 - 基于行处理，最大化内容利用
async function simpleAutoSplit(content: string): Promise<Array<{ content: string; html: string }>> {
  console.log('🚀 开始自动拆分，内容总行数:', content.split('\n').length)
  
  const lines = content.split('\n')
  const cards: Array<{ content: string; html: string }> = []
  let currentLines: string[] = []
  let ulCount = 0 // 全局ul计数
  let olCount = 0 // 全局ol计数
  
  const measureContainer = createMeasureContainer()
  // 使用更准确的高度利用率，因为现在测量环境与实际渲染一致
  const usableHeight = calculateUsableHeight()
  console.log('📏 可用高度:', usableHeight, 'px (卡片总高度:', cardHeight.value, 'px)')
  
  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      console.log(`\n📝 处理第 ${i + 1} 行: "${line.trim()}"`)
      
      // 先尝试添加这一行
      const testLines = [...currentLines, line]
      const testContent = testLines.join('\n')
      const testHeight = await measureContentHeight(testContent, measureContainer)
      
      console.log(`📐 累积内容高度: ${testHeight}px，可用高度: ${usableHeight}px，当前行数: ${testLines.length}`)
      
      if (testHeight <= usableHeight) {
        // 如果还能放下，就添加这一行
        currentLines.push(line)
        console.log('✅ 添加成功，当前卡片行数:', currentLines.length)
      }
      else {
        // 如果放不下了
        if (currentLines.length === 0) {
          // 如果当前卡片是空的，强制添加这一行（避免死循环）
          currentLines.push(line)
          console.log('⚠️ 强制添加（避免死循环）')
        }
        else {
          // 完成当前卡片
          const cardContent = currentLines.join('\n')
          
          // 计算这张卡片增加的列表计数
          const { ul: cardUlCount, ol: cardOlCount } = countListItemsInContent(cardContent)
          console.log(`🔢 当前卡片列表计数 - ul: ${cardUlCount}, ol: ${cardOlCount}`)
          
          // 生成HTML，使用当前计数作为起始索引
          const html = await renderWithContinuity(cardContent, { ul: ulCount, ol: olCount })
          
          cards.push({
            content: cardContent,
            html
          })
          
          console.log(`📦 完成第 ${cards.length} 张卡片，内容行数: ${currentLines.length}`)
          console.log(`📊 全局计数更新前 - ul: ${ulCount}, ol: ${olCount}`)
          
          // 更新全局计数
          ulCount += cardUlCount
          olCount += cardOlCount
          
          console.log(`📊 全局计数更新后 - ul: ${ulCount}, ol: ${olCount}`)
          
          // 开始新卡片，当前行作为第一行
          currentLines = [line]
          console.log(`🆕 开始新卡片，起始行: "${line.trim()}"`)
        }
      }
    }
    
    // 处理最后一张卡片
    if (currentLines.length > 0) {
      const cardContent = currentLines.join('\n')
      const html = await renderWithContinuity(cardContent, { ul: ulCount, ol: olCount })
      cards.push({
        content: cardContent,
        html
      })
      console.log(`📦 完成最后一张卡片 (第 ${cards.length} 张)，内容行数: ${currentLines.length}`)
    }
  }
  finally {
    document.body.removeChild(measureContainer)
  }

  console.log(`🎉 自动拆分完成，总共生成 ${cards.length} 张卡片`)
  return cards.length > 0 ? cards : [{ content, html: await renderWithContinuity(content, { ul: 0, ol: 0 }) }]
}

// 测量内容高度的辅助函数 - 使用真实的卡片结构
async function measureContentHeight(content: string, container: HTMLElement): Promise<number> {
  if (!content.trim()) return 0
  
  const html = await marked(content)
  
  // 创建完整的卡片DOM结构，与实际渲染保持一致
  const cardElement = document.createElement('section')
  cardElement.className = `card markdown-body ${selectedTemplate.value.id}`
  cardElement.style.cssText = `
    height: auto;
    width: ${cardWidth.value}px;
    max-width: ${cardWidth.value}px;
    --card-height: ${cardHeight.value}px;
  `
  
  // 卡片头部
  const headerElement = document.createElement('section')
  headerElement.className = 'card-header'
  const titleElement = document.createElement('section')
  titleElement.className = 'card-title'
  headerElement.appendChild(titleElement)
  
  // 卡片内容
  const contentElement = document.createElement('section')
  contentElement.className = 'card-content'
  const innerElement = document.createElement('section')
  innerElement.className = 'card-content-inner'
  innerElement.innerHTML = html
  contentElement.appendChild(innerElement)
  
  // 卡片底部
  const footerElement = document.createElement('section')
  footerElement.className = 'card-footer'
  
  // 组装完整卡片
  cardElement.appendChild(headerElement)
  cardElement.appendChild(contentElement)
  cardElement.appendChild(footerElement)
  
  container.appendChild(cardElement)
  const height = cardElement.offsetHeight
  container.removeChild(cardElement)
  
  return height
}

// 基于实际渲染高度的智能分割算法 - 支持起始索引
async function smartSplitByHeight(content: string, startListCounts = { ul: 0, ol: 0 }): Promise<Array<{ content: string; html: string }>> {
  const elements = parseMarkdownToElements(content)
  if (elements.length === 0) return []

  const measureContainer = createMeasureContainer()
  const cards: Array<{ content: string; html: string }> = []
  let currentElements: MarkdownElement[] = []
  let currentHeight = 0
  
  // 分别追踪ul和ol的计数
  let totalUlCount = startListCounts.ul
  let totalOlCount = startListCounts.ol
  let cardStartUlCount = totalUlCount
  let cardStartOlCount = totalOlCount
  
  // 使用更合理的高度限制，确保充分利用空间
  const usableHeight = calculateUsableHeight()
  try {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      
      if ((element.type === 'ul' || element.type === 'ol') && element.items && element.items.length > 0) {
        const listType = element.type as 'ul' | 'ol'
        const currentListCount = listType === 'ul' ? totalUlCount : totalOlCount
        const splitResult = await splitListByHeight(element, measureContainer, usableHeight - currentHeight, currentListCount)
        
        for (const listPart of splitResult.splitLists) {
          const elementHeight = await measureElementHeight(listPart, measureContainer)
          
          if (currentHeight + elementHeight > usableHeight && currentElements.length > 0) {
            // 创建当前卡片
            const cardContent = elementsToMarkdownWithHeight(currentElements, { ul: cardStartUlCount, ol: cardStartOlCount })
            cards.push({
              content: cardContent,
              html: await renderWithContinuity(cardContent, { ul: cardStartUlCount, ol: cardStartOlCount })
            })
            
            // 开始新卡片
            currentElements = [listPart]
            currentHeight = elementHeight
            cardStartUlCount = totalUlCount
            cardStartOlCount = totalOlCount
          }
          else {
            currentElements.push(listPart)
            currentHeight += elementHeight
          }
        }
        
        // 更新对应类型的计数
        if (listType === 'ul') {
          totalUlCount += splitResult.listIndexIncrement
        }
        else {
          totalOlCount += splitResult.listIndexIncrement
        }
      }
      else {
        const elementHeight = await measureElementHeight(element, measureContainer)
        
        if (currentHeight + elementHeight > usableHeight && currentElements.length > 0) {
          // 创建当前卡片
          const cardContent = elementsToMarkdownWithHeight(currentElements, { ul: cardStartUlCount, ol: cardStartOlCount })
          cards.push({
            content: cardContent,
            html: await renderWithContinuity(cardContent, { ul: cardStartUlCount, ol: cardStartOlCount })
          })
          
          // 开始新卡片
          currentElements = [element]
          currentHeight = elementHeight
          cardStartUlCount = totalUlCount
          cardStartOlCount = totalOlCount
        }
        else {
          currentElements.push(element)
          currentHeight += elementHeight
        }
      }
    }

    // 处理最后一张卡片
    if (currentElements.length > 0) {
      const cardContent = elementsToMarkdownWithHeight(currentElements, { ul: cardStartUlCount, ol: cardStartOlCount })
      cards.push({
        content: cardContent,
        html: await renderWithContinuity(cardContent, { ul: cardStartUlCount, ol: cardStartOlCount })
      })
    }
  }
  finally {
    document.body.removeChild(measureContainer)
  }

  return cards.length > 0 ? cards : [{ content, html: await renderWithContinuity(content, startListCounts) }]
}

function createMeasureContainer(): HTMLElement {
  const container = document.createElement('div')
  
  // 创建一个包含所有卡片样式的测量容器
  container.className = 'cards-container' // 使用实际的容器类名
  Object.assign(container.style, {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    width: `${cardWidth.value}px`,
    visibility: 'hidden',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    overflow: 'visible',
    // 确保字体和其他基础样式一致
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit'
  })
  
  document.body.appendChild(container)
  return container
}

async function measureElementHeight(element: MarkdownElement, container: HTMLElement): Promise<number> {
  const html = await marked(element.raw)
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // 应用卡片内容的实际样式，但允许内容自然展开以准确测量
  Object.assign(tempDiv.style, {
    ...selectedTemplate.value.styles,
    width: '100%',
    height: 'auto',
    maxHeight: 'none', // 移除高度限制以准确测量
    overflow: 'visible',
    boxSizing: 'border-box',
    margin: '0 0 8px 0' // 减小元素间距
  })
  
  container.appendChild(tempDiv)
  const height = tempDiv.offsetHeight
  container.removeChild(tempDiv)
  return height
}

async function splitListByHeight(
  listElement: MarkdownElement, 
  container: HTMLElement, 
  availableHeight: number,
  startIndex: number
): Promise<{ splitLists: MarkdownElement[]; listIndexIncrement: number }> {
  if (!listElement.items) return { splitLists: [listElement], listIndexIncrement: 0 }

  const sampleItem = listElement.items[0]
  const sampleHeight = await measureSingleListItem(sampleItem, container, listElement.type as 'ul' | 'ol')
  const maxItemsInCurrentCard = Math.floor(availableHeight / sampleHeight)
  
  if (maxItemsInCurrentCard >= listElement.items.length) {
    return { splitLists: [listElement], listIndexIncrement: listElement.items.length }
  }

  const splitLists: MarkdownElement[] = []
  let currentIndex = startIndex
  
  for (let i = 0; i < listElement.items.length; i += maxItemsInCurrentCard) {
    const endIndex = Math.min(i + maxItemsInCurrentCard, listElement.items.length)
    const partItems = listElement.items.slice(i, endIndex)
    
    splitLists.push({
      ...listElement,
      items: partItems,
      raw: generateContinuousListMarkdown(listElement.type as 'ul' | 'ol', partItems, currentIndex),
      complexity: partItems.length * 8
    })
    currentIndex += partItems.length
  }

  return { splitLists, listIndexIncrement: listElement.items.length }
}

async function measureSingleListItem(item: ListItem, container: HTMLElement, listType: 'ul' | 'ol'): Promise<number> {
  const markdown = listType === 'ul' ? `- ${item.content}` : `1. ${item.content}`
  const html = await marked(markdown)
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  container.appendChild(tempDiv)
  const height = tempDiv.offsetHeight
  container.removeChild(tempDiv)
  return height
}

function generateContinuousListMarkdown(listType: 'ul' | 'ol', items: ListItem[], startIndex: number): string {
  if (listType === 'ul') {
    return items.map(item => `- ${item.content.replace(/^[-*+]\s/, '')}`).join('\n')
  }
  return items.map((item, index) => {
    const content = item.content.replace(/^\d+\.\s/, '')
    return `${startIndex + index + 1}. ${content}`
  }).join('\n')
}

function elementsToMarkdownWithHeight(elements: MarkdownElement[], listStartCounts: { ul: number; ol: number }): string {
  const currentUlIndex = listStartCounts.ul
  let currentOlIndex = listStartCounts.ol
  
  return elements.map(element => {
    if (element.type === 'ul' && element.items) {
      return element.items.map(item => {
        const content = item.content.replace(/^[-*+]\s/, '')
        return `- ${content}`
      }).join('\n')
    }
    if (element.type === 'ol' && element.items) {
      return element.items.map(item => {
        currentOlIndex++
        const content = item.content.replace(/^\d+\.\s/, '')
        return `${currentOlIndex}. ${content}`
      }).join('\n')
    }
    return element.raw
  }).join('\n\n')
}

// 简化的渲染函数 - 修复data-index计算
async function renderWithContinuity(content: string, startCounts: { ul: number; ol: number }): Promise<string> {
  if (!content || !content.trim()) {
    return '<p>空内容</p>'
  }

  try {
    let html = await marked(content)
    
    // 后处理：添加data-index属性，分别为ul和ol计数
    let currentUlIndex = startCounts.ul
    let currentOlIndex = startCounts.ol
    
    // 先处理ul中的li
    html = html.replace(/<ul>[\s\S]*?<\/ul>/g, (ulMatch) => {
      return ulMatch.replace(/<li>/g, () => {
        return `<li data-index="${++currentUlIndex}">`
      })
    })
    
    // 再处理ol中的li
    html = html.replace(/<ol>[\s\S]*?<\/ol>/g, (olMatch) => {
      return olMatch.replace(/<li>/g, () => {
        return `<li data-index="${++currentOlIndex}">`
      })
    })
    
    return html
  }
  catch (error) {
    console.error('Markdown渲染错误:', error)
    return `<pre>${content}</pre>`
  }
}

// 监听内容变化，异步更新卡片
watchEffect(() => {
  updateCards()
})

const cardWrapperStyle = computed(() => {
  if (splitMode.value === 'none') {
    // 不拆分模式：高度自适应
    return {
      width: `${cardWidth.value}px`,
      minHeight: `${cardHeight.value}px`,
      margin: '10px auto'
    }
  }
  return {
    width: `${cardWidth.value}px`,
    height: `${cardHeight.value}px`,
    margin: '10px auto'
  }
})

const cardContentStyle = computed(() => {
  if (splitMode.value === 'none') {
    // 不拆分模式：高度自适应，无溢出隐藏
    return {
      ...selectedTemplate.value.styles,
      width: '100%',
      minHeight: `${cardHeight.value}px`,
      boxSizing: 'border-box'
    }
  }
  return {
    ...selectedTemplate.value.styles,
    width: '100%',
    height: `${cardHeight.value}px`,
    maxHeight: `${cardHeight.value}px`,
    overflow: 'hidden',
    boxSizing: 'border-box'
  }
})

// 方法
function selectTemplate(template: CardTemplate) {
  selectedTemplate.value = template
  ElMessage.success(`已切换到"${template.name}"模版`)
}

function setCardRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el && 'offsetWidth' in el) {
    cardRefs.value[index] = el as HTMLElement
  }
}

function prevCard() {
  if (currentCardIndex.value > 0) {
    currentCardIndex.value--
  }
}

function nextCard() {
  if (currentCardIndex.value < cards.value.length - 1) {
    currentCardIndex.value++
  }
}

function newFile() {
  if (markdownContent.value.trim() && 
      !confirm('当前文档尚未保存，确定要新建文档吗？')) {
    return
  }
  markdownContent.value = ''
  currentFileName.value = 'untitled.md'
  currentCardIndex.value = 0
  ElMessage.success('已新建文档')
}

function openFile() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    markdownContent.value = content
    currentFileName.value = file.name
    currentCardIndex.value = 0
    ElMessage.success(`已打开文件：${file.name}`)
  }
  reader.readAsText(file)
}

function saveFile() {
  const blob = new Blob([markdownContent.value], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = currentFileName.value
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('文件已保存')
}

function insertAtCursor(text: string) {
  if (!editorTextarea.value) return

  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  markdownContent.value = 
    markdownContent.value.substring(0, start) + 
    text + 
    markdownContent.value.substring(end)

  nextTick(() => {
    textarea.focus()
    const newPos = start + text.length
    textarea.setSelectionRange(newPos, newPos)
  })
}

function insertBold() {
  insertAtCursor('**粗体**')
}

function insertItalic() {
  insertAtCursor('*斜体*')
}

function insertCode() {
  insertAtCursor('`代码`')
}

function insertDivider() {
  insertAtCursor('\n\n---\n\n')
}

function copyHtml() {
  const allHtml = cards.value.map(card => card.html).join('\n\n<hr>\n\n')
  navigator.clipboard.writeText(allHtml).then(() => {
    ElMessage.success('HTML 已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function handleExport(command: string) {
  if (command === 'html') {
    exportAsHtml()
  }
  else if (command === 'markdown') {
    saveFile()
  }
  else if (command === 'images') {
    exportAllCards()
  }
}

function exportAsHtml() {
  const allHtml = cards.value.map(card => card.html).join('\n\n<div style="page-break-after: always;"></div>\n\n')
  
  const stylesString = Object.entries(selectedTemplate.value.styles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ')
  
  const content = 'data:text/html;charset=utf-8,' + encodeURIComponent(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${currentFileName.value.replace('.md', '')} - 卡片集合</title>
    <style>
        body { max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
        .card { ${stylesString}; margin-bottom: 30px; }
        ${selectedTemplate.value.customCSS || ''}
    </style>
</head>
<body>
    ${allHtml}
</body>
</html>`)

  const a = document.createElement('a')
  a.href = content
  a.download = currentFileName.value.replace('.md', '.html')
  a.click()
  ElMessage.success('HTML 文件已导出')
}

async function generateCardImage(cardIndex: number): Promise<{ blob: Blob; filename: string }> {
  const cardElement = cardRefs.value[cardIndex]
  if (!cardElement) {
    throw new Error('卡片元素不存在')
  }

  const dataUrl = await toPng(cardElement, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: 'transparent'
  })

  // 将 dataURL 转换为 Blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  
  const filename = `${currentFileName.value.replace('.md', '')}-card-${cardIndex + 1}.png`
  
  return { blob, filename }
}

async function exportCurrentCard() {
  try {
    const { blob, filename } = await generateCardImage(currentCardIndex.value)
    saveAs(blob, filename)
    ElMessage.success(`卡片 ${currentCardIndex.value + 1} 导出成功`)
  }
  catch (error) {
    ElMessage.error('导出失败')
  }
}

async function exportAllCards() {
  if (cards.value.length === 0) {
    ElMessage.warning('没有卡片可以导出')
    return
  }

  const loadingMsg = ElMessage({
    message: '正在生成卡片压缩包，请稍候...',
    type: 'info',
    duration: 0
  })

  try {
    const zip = new JSZip()
    const baseFileName = currentFileName.value.replace('.md', '') || 'cards'

    // 生成所有卡片图片
    for (let i = 0; i < cards.value.length; i++) {
      const { blob, filename } = await generateCardImage(i)
      zip.file(filename, blob)
      await new Promise(resolve => setTimeout(resolve, 100)) // 小延迟避免并发问题
    }

    // 添加源文件
    zip.file(`${baseFileName}.md`, markdownContent.value)

    // 生成并下载压缩包
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, `${baseFileName}-cards.zip`)

    loadingMsg.close()
    ElMessage.success(`成功导出 ${cards.value.length} 张卡片到压缩包`)
  }
  catch (error) {
    loadingMsg.close()
    ElMessage.error('批量导出失败')
  }
}

onMounted(() => {
  // 确保当前卡片索引在有效范围内
  if (currentCardIndex.value >= cards.value.length) {
    currentCardIndex.value = 0
  }
})
</script>

<style scoped lang="scss">
.markdown-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 20px;

    h1 {
      margin: 0;
      font-size: 18px;
      color: #333;
      background: linear-gradient(45deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .actions {
      display: flex;
      gap: 8px;
    }
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
}

.main-content {
  flex: 1;
  display: flex;
  min-height: 0;

  &.split {
    .editor-panel {
      flex: 1;
    }
    
    .preview-panel {
      flex: 1;
    }
    
    .settings-panel {
      width: 280px;
    }
  }

  &.edit {
    .editor-panel {
      flex: 1;
    }
  }

  &.cards {
    .preview-panel {
      flex: 1;
    }
    
    .settings-panel {
      width: 280px;
    }
  }
}

.editor-panel, 
.preview-panel, 
.settings-panel {
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e0e0e0;
  margin: 10px;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
  color: #666;
  font-weight: 500;

  .buttons, 
  .preview-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .card-indicator {
    font-size: 12px;
    color: #999;
    margin: 0 8px;
  }
}

.editor {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 20px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;

  &::placeholder {
    color: #999;
  }
}

.settings-content {
  padding: 16px;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 24px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 8px;
  }

  .hint {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
    margin-bottom: 0;
  }
}

.template-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.template-item {
  padding: 12px 8px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    background: #f8f9ff;
  }

  &.active {
    border-color: #667eea;
    background: #667eea;
    color: white;
  }

  .template-icon {
    font-size: 20px;
    margin-bottom: 4px;
  }

  .template-name {
    font-size: 12px;
    font-weight: 500;
  }
}

.size-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.size-item {
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    font-size: 12px;
    color: #666;
    min-width: 30px;
  }

  .el-input-number {
    flex: 1;
  }
}

.export-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cards-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-wrapper {
  margin-bottom: 20px;
  transition: all 0.3s ease;

  &.active {
    transform: scale(1.02);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
  }
}

.card-content {
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.divider {
  width: 1px;
  background: #e0e0e0;
  margin: 10px 0;
}

// 预览内容样式重置
.preview {
  :deep(h1), 
  :deep(h2), 
  :deep(h3), 
  :deep(h4), 
  :deep(h5), 
  :deep(h6) {
    margin-top: 0;
    margin-bottom: 16px;
    font-weight: 600;
  }

  :deep(h1:first-child), 
  :deep(h2:first-child), 
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(p) {
    margin-bottom: 16px;
    line-height: 1.6;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(pre) {
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    margin: 16px 0;
  }

  :deep(code) {
    border-radius: 3px;
    padding: 2px 4px;
  }

  :deep(pre code) {
    background: none !important;
    padding: 0;
  }

  :deep(blockquote) {
    padding-left: 16px;
    margin: 16px 0;
  }

  :deep(ul), 
  :deep(ol) {
    padding-left: 24px;
    margin: 16px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 24px 0;
  }
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
  }

  .main-content.split {
    flex-direction: column;

    .editor-panel, 
    .preview-panel, 
    .settings-panel {
      height: 33vh;
      margin: 5px;
    }
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .size-item {
    .el-input-number {
      width: 100px;
    }
  }
}
</style> 