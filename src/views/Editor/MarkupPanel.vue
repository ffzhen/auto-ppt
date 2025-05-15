<template>
  <MoveablePanel 
    class="notes-panel" 
    :width="300" 
    :height="220" 
    title="幻灯片类型标注" 
    :left="-270" 
    :top="90"
    @close="close()"
  >
    <div class="container">
      <div class="row">
        <div style="width: 40%;">当前页面类型：</div>
        <Select
          style="width: 60%;"
          :value="slideType"
          @update:value="value => updateSlide(value as SlideType | '')"
          :options="slideTypeOptions"
        />
      </div>
      <div class="row" v-if="handleElement && (handleElement.type === 'text' || (handleElement.type === 'shape' && handleElement.text))">
        <div style="width: 40%;">当前文本类型：</div>
        <Select
          style="width: 60%;"
          :value="textType"
          @update:value="value => updateElement(value as TextType | '')"
          :options="textTypeOptions"
        />
      </div>
      <div class="row" v-if="handleElement && (handleElement.type === 'text' || (handleElement.type === 'shape' && handleElement.text)) && textType">
        <div style="width: 40%;">最大行数：</div>
        <div style="width: 60%; display: flex; align-items: center;">
          <input 
            type="number" 
            class="input-number" 
            :value="maxLine" 
            @input="e => updateMaxLine(parseInt((e.target as HTMLInputElement).value, 10))" 
            min="1" 
            max="50"
          />
          <button 
            class="reset-button" 
            @click="resetMaxLineToDefault" 
            title="重置为默认值"
          >
            重置
          </button>
        </div>
      </div>
      <div class="row" v-if="handleElement && (handleElement.type === 'text' || (handleElement.type === 'shape' && handleElement.text)) && textType">
        <div style="width: 40%;">自动垂直居中：</div>
        <div style="width: 60%; display: flex; align-items: center;">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              :checked="autoVerticalCenter" 
              @change="toggleAutoVerticalCenter"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="row" v-if="handleElement && (handleElement.type === 'text' || (handleElement.type === 'shape' && handleElement.text)) && textType">
        <div style="width: 40%;">固定容器大小：</div>
        <div style="width: 60%; display: flex; align-items: center;">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              :checked="fixContainer" 
              @change="toggleFixContainer"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="row" v-else-if="handleElement && handleElement.type === 'image'">
        <div style="width: 40%;">当前图片类型：</div>
        <Select
          style="width: 60%;"
          :value="imageType"
          @update:value="value => updateElement(value as ImageType | '')"
          :options="imageTypeOptions"
        />
      </div>
      <div class="placeholder" v-else>选中图片、文字、带文字的形状，标记类型</div>
    </div>
  </MoveablePanel>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { ImageType, SlideType, TextType } from '@/types/slides'

import MoveablePanel from '@/components/MoveablePanel.vue'
import Select from '@/components/Select.vue'

const slidesStore = useSlidesStore()
const mainStore = useMainStore()
const { currentSlide } = storeToRefs(slidesStore)
const { handleElement, handleElementId } = storeToRefs(mainStore)

const currentElementId = ref('')

const slideTypeOptions = ref<{ label: string; value: SlideType | '' }[]>([
  { label: '未标记类型', value: '' },
  { label: '封面页', value: 'cover' },
  { label: '目录页', value: 'contents' },
  { label: '过渡页', value: 'transition' },
  { label: '内容页', value: 'content' },
  { label: '结束页', value: 'end' },
])

const textTypeOptions = ref<{ label: string; value: TextType | '' }[]>([
  { label: '未标记类型', value: '' },
  { label: '标题', value: 'title' },
  { label: '副标题', value: 'subtitle' },
  { label: '正文', value: 'content' },
  { label: '嵌入HTML', value: 'html' },
  { label: '列表项目', value: 'item' },
  { label: '列表项标题', value: 'itemTitle' },
  { label: '注释', value: 'notes' },
  { label: '页眉', value: 'header' },
  { label: '页脚', value: 'footer' },
  { label: '节编号', value: 'partNumber' },
  { label: '项目编号', value: 'itemNumber' },
])

const imageTypeOptions = ref<{ label: string; value: ImageType | '' }[]>([
  { label: '未标记类型', value: '' },
  { label: '页面插图', value: 'pageFigure' },
  { label: '项目插图', value: 'itemFigure' },
  { label: '背景图', value: 'background' },
])

const slideType = computed(() => currentSlide.value?.type || '')
const textType = computed(() => {
  if (!handleElement.value) return ''
  if (handleElement.value.type === 'text') return handleElement.value.textType || ''
  if (handleElement.value.type === 'shape' && handleElement.value.text) return handleElement.value.text.type || ''
  return ''
})
const imageType = computed(() => {
  if (!handleElement.value) return ''
  if (handleElement.value.type === 'image') return handleElement.value.imageType || ''
  return ''
})

const maxLine = computed(() => {
  console.log('Computing maxLine. Element ID:', handleElementId.value)
  
  if (handleElementId.value && currentSlide.value) {
    const slideIndex = slidesStore.slideIndex
    if (slideIndex < 0 || !slidesStore.slides[slideIndex]) return 1
    
    const freshElement = slidesStore.slides[slideIndex].elements.find(el => el.id === handleElementId.value)
    console.log('Fresh element found:', freshElement)
    
    if (freshElement) {
      if (freshElement.type === 'text') {
        console.log('Text element maxLine from direct access:', freshElement.maxLine)
        return freshElement.maxLine !== undefined && freshElement.maxLine !== null 
          ? freshElement.maxLine 
          : getDefaultMaxLine()
      }
      if (freshElement.type === 'shape' && freshElement.text) {
        console.log('Shape text maxLine from direct access:', freshElement.text.maxLine)
        return freshElement.text.maxLine !== undefined && freshElement.text.maxLine !== null
          ? freshElement.text.maxLine
          : getDefaultMaxLine()
      }
    }
  }
  return 1
})

const getDefaultMaxLine = (): number => {
  if (!textType.value) return 1
  
  // Default values based on text type, matching useAIPPT.ts logic
  switch (textType.value) {
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

const updateMaxLine = (value: number) => {
  if (!handleElement.value || isNaN(value) || value < 1) return
  
  console.log('Updating maxLine to:', value)
  
  // 获取当前幻灯片索引和元素索引
  const slideIndex = slidesStore.slideIndex
  const elementIndex = slidesStore.slides[slideIndex].elements.findIndex(el => el.id === handleElementId.value)
  
  if (elementIndex === -1) {
    console.error('Element not found:', handleElementId.value)
    return
  }
  
  // 直接修改store中的数据
  if (handleElement.value.type === 'text') {
    console.log('Updating text element maxLine:', handleElementId.value)
    // 创建元素的深拷贝并更新maxLine
    const element = JSON.parse(JSON.stringify(slidesStore.slides[slideIndex].elements[elementIndex]))
    element.maxLine = value
    
    // 替换元素
    const elements = [...slidesStore.slides[slideIndex].elements]
    elements[elementIndex] = element
    slidesStore.slides[slideIndex].elements = elements
  }
  
  if (handleElement.value.type === 'shape' && handleElement.value.text) {
    console.log('Updating shape text maxLine:', handleElementId.value)
    // 创建元素的深拷贝
    const element = JSON.parse(JSON.stringify(slidesStore.slides[slideIndex].elements[elementIndex]))
    if (!element.text) element.text = {}
    element.text.maxLine = value
    
    // 替换元素
    const elements = [...slidesStore.slides[slideIndex].elements]
    elements[elementIndex] = element
    slidesStore.slides[slideIndex].elements = elements
  }
  
  // 强制立即保存
  slidesStore.saveDataToStorage()
  
  setTimeout(() => {
    // 验证更新是否成功
    const updatedElement = slidesStore.slides[slideIndex].elements[elementIndex]
    if (updatedElement.type === 'text') {
      console.log('Text element maxLine after update:', updatedElement.maxLine)
    }
    if (updatedElement.type === 'shape' && updatedElement.text) {
      console.log('Shape text maxLine after update:', updatedElement.text.maxLine)
    }
  }, 100)
}

const resetMaxLineToDefault = () => {
  updateMaxLine(getDefaultMaxLine())
}

const updateSlide = (type: SlideType | '') => {
  if (type) slidesStore.updateSlide({ type })
  else {
    slidesStore.removeSlideProps({
      id: currentSlide.value.id,
      propName: 'type',
    })
  }
}

const updateElement = (type: TextType | ImageType | '') => {
  if (!handleElement.value) return
  if (handleElement.value.type === 'image') {
    if (type) {
      slidesStore.updateElement({ id: handleElementId.value, props: { imageType: type as ImageType } })
    }
    else {
      slidesStore.removeElementProps({
        id: handleElementId.value,
        propName: 'imageType',
      })
    }
  }
  if (handleElement.value.type === 'text') {
    if (type) {
      slidesStore.updateElement({ id: handleElementId.value, props: { textType: type as TextType } })
    }
    else {
      slidesStore.removeElementProps({
        id: handleElementId.value,
        propName: 'textType',
      })
    }
  }
  if (handleElement.value.type === 'shape') {
    const text = handleElement.value.text
    if (!text) return

    if (type) {
      slidesStore.updateElement({
        id: handleElementId.value,
        props: { text: { ...text, type: type as TextType } },
      })
    }
    else {
      delete text.type
      slidesStore.updateElement({
        id: handleElementId.value,
        props: { text },
      })
    }
  }
}

onMounted(() => {
  watch(handleElementId, (newId) => {
    if (newId) {
      currentElementId.value = newId
    }
  }, { immediate: true })
})

const refreshElementData = () => {
  console.log('Refreshing element data for ID:', handleElementId.value)
  
  if (handleElementId.value && handleElement.value) {
    currentElementId.value = handleElementId.value
    console.log('Current element after refresh:', currentSlide.value.elements.find(el => el.id === handleElementId.value))
  }
}

watch(textType, (newType, oldType) => {
  if (newType && handleElement.value) {
    // 只在以下情况下重置maxLine:
    // 1. 从未设置类型变为有类型 (oldType为空)
    // 2. 当前元素没有自定义的maxLine值
    const slideIndex = slidesStore.slideIndex
    if (slideIndex >= 0 && slidesStore.slides[slideIndex]) {
      const element = slidesStore.slides[slideIndex].elements.find(el => el.id === handleElementId.value)
      
      if (element) {
        let currentMaxLine = undefined
        if (element.type === 'text') {
          currentMaxLine = element.maxLine
        } 
        else if (element.type === 'shape' && element.text) {
          currentMaxLine = element.text.maxLine
        }
        
        console.log('Current maxLine when changing textType:', currentMaxLine)
        
        // 只有在maxLine不存在时才重置为默认值
        if (currentMaxLine === undefined || currentMaxLine === null) {
          console.log('Resetting maxLine to default for new textType')
          resetMaxLineToDefault()
        } 
        else {
          console.log('Keeping existing maxLine value:', currentMaxLine)
        }
      }
    }
    
    refreshElementData()
  }
})

const close = () => {
  mainStore.setMarkupPanelState(false)
}

watch(() => mainStore.showMarkupPanel, (isVisible) => {
  if (isVisible && handleElementId.value) {
    console.log('Panel opened. Refreshing current element state...')
    
    // 强制重新计算maxLine
    setTimeout(() => {
      // 直接访问store中的元素数据
      const slideIndex = slidesStore.slideIndex
      if (slideIndex >= 0 && slidesStore.slides[slideIndex]) {
        const element = slidesStore.slides[slideIndex].elements.find(el => el.id === handleElementId.value)
        
        if (element) {
          console.log('==== PANEL OPENED: ELEMENT STATE ====')
          if (element.type === 'text') {
            console.log('Text element direct maxLine:', element.maxLine)
          } 
          else if (element.type === 'shape' && element.text) {
            console.log('Shape text direct maxLine:', element.text.maxLine)
          }
          console.log('===================================')
          
          // 触发ui更新
          currentElementId.value = handleElementId.value + '_refresh_' + Date.now()
          setTimeout(() => {
            currentElementId.value = handleElementId.value
          }, 10)
        }
      }
    }, 100)
  }
}, { immediate: true })

// 添加自动垂直居中属性的computed
const autoVerticalCenter = computed(() => {
  if (handleElementId.value && currentSlide.value) {
    const slideIndex = slidesStore.slideIndex
    if (slideIndex < 0 || !slidesStore.slides[slideIndex]) return false
    
    const freshElement = slidesStore.slides[slideIndex].elements.find(el => el.id === handleElementId.value)
    
    if (freshElement) {
      if (freshElement.type === 'text') {
        return !!freshElement.autoVerticalCenter
      }
      if (freshElement.type === 'shape' && freshElement.text) {
        return !!freshElement.text.autoVerticalCenter
      }
    }
  }
  return false
})

// 添加切换自动垂直居中的方法
const toggleAutoVerticalCenter = () => {
  if (!handleElement.value) return
  
  // 获取当前幻灯片索引和元素索引
  const slideIndex = slidesStore.slideIndex
  const elementIndex = slidesStore.slides[slideIndex].elements.findIndex(el => el.id === handleElementId.value)
  
  if (elementIndex === -1) {
    console.error('Element not found:', handleElementId.value)
    return
  }
  
  // 切换值
  const newValue = !autoVerticalCenter.value
  
  // 直接修改store中的数据
  if (handleElement.value.type === 'text') {
    // 创建元素的深拷贝并更新autoVerticalCenter
    const element = JSON.parse(JSON.stringify(slidesStore.slides[slideIndex].elements[elementIndex]))
    element.autoVerticalCenter = newValue
    
    // 替换元素
    const elements = [...slidesStore.slides[slideIndex].elements]
    elements[elementIndex] = element
    slidesStore.slides[slideIndex].elements = elements
  }
  
  if (handleElement.value.type === 'shape' && handleElement.value.text) {
    // 创建元素的深拷贝
    const element = JSON.parse(JSON.stringify(slidesStore.slides[slideIndex].elements[elementIndex]))
    if (!element.text) element.text = {}
    element.text.autoVerticalCenter = newValue
    
    // 替换元素
    const elements = [...slidesStore.slides[slideIndex].elements]
    elements[elementIndex] = element
    slidesStore.slides[slideIndex].elements = elements
  }
  
  // 强制立即保存
  slidesStore.saveDataToStorage()
}

// 添加固定容器大小(fixContainer)的开关UI组件和相关处理逻辑
const fixContainer = computed(() => {
  if (handleElementId.value && currentSlide.value) {
    const slideIndex = slidesStore.slideIndex
    if (slideIndex < 0 || !slidesStore.slides[slideIndex]) return false
    
    const freshElement = slidesStore.slides[slideIndex].elements.find(el => el.id === handleElementId.value)
    
    if (freshElement) {
      if (freshElement.type === 'text') {
        return !!freshElement.fixContainer
      }
      if (freshElement.type === 'shape' && freshElement.text) {
        return !!freshElement.text.fixContainer
      }
    }
  }
  return false
})

// 添加切换固定容器大小(fixContainer)的方法
const toggleFixContainer = () => {
  if (!handleElement.value) return
  
  // 获取当前幻灯片索引和元素索引
  const slideIndex = slidesStore.slideIndex
  const elementIndex = slidesStore.slides[slideIndex].elements.findIndex(el => el.id === handleElementId.value)
  
  if (elementIndex === -1) {
    console.error('Element not found:', handleElementId.value)
    return
  }
  
  // 切换值
  const newValue = !fixContainer.value
  
  // 直接修改store中的数据
  if (handleElement.value.type === 'text') {
    // 创建元素的深拷贝并更新fixContainer
    const element = JSON.parse(JSON.stringify(slidesStore.slides[slideIndex].elements[elementIndex]))
    element.fixContainer = newValue
    
    // 替换元素
    const elements = [...slidesStore.slides[slideIndex].elements]
    elements[elementIndex] = element
    slidesStore.slides[slideIndex].elements = elements
  }
  
  if (handleElement.value.type === 'shape' && handleElement.value.text) {
    // 创建元素的深拷贝
    const element = JSON.parse(JSON.stringify(slidesStore.slides[slideIndex].elements[elementIndex]))
    if (!element.text) element.text = {}
    element.text.fixContainer = newValue
    
    // 替换元素
    const elements = [...slidesStore.slides[slideIndex].elements]
    elements[elementIndex] = element
    slidesStore.slides[slideIndex].elements = elements
  }
  
  // 强制立即保存
  slidesStore.saveDataToStorage()
}
</script>

<style lang="scss" scoped>
.notes-panel {
  height: 100%;
  font-size: 12px;
  user-select: none;
}
.container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;

  & + .row {
    margin-top: 5px;
  }
}
.placeholder {
  height: 30px;
  line-height: 30px;
  text-align: center;
  color: #999;
  font-style: italic;
  border: 1px dashed #ccc;
  border-radius: $borderRadius;
  margin-top: 5px;
}
.input-number {
  flex: 1;
  height: 24px;
  padding: 0 5px;
  border: 1px solid #d9d9d9;
  border-radius: $borderRadius;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
}

.reset-button {
  margin-left: 5px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #d9d9d9;
  border-radius: $borderRadius;
  background-color: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #e6f7ff;
    border-color: #1890ff;
  }
}

/* 添加开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
    
    &:checked + .toggle-slider {
      background-color: #1890ff;
      
      &:before {
        transform: translateX(20px);
      }
    }
    
    &:focus + .toggle-slider {
      box-shadow: 0 0 1px #1890ff;
    }
  }
  
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 20px;
    
    &:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
  }
}
</style>