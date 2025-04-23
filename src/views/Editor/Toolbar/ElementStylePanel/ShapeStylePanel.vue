<template>
  <div class="shape-style-panel">
    <div class="title">
      <span>点击替换形状</span>
      <IconDown />
    </div>
    <div class="shape-pool">
      <div class="category" v-for="item in SHAPE_LIST" :key="item.type">
        <div class="shape-list">
          <ShapeItemThumbnail 
            class="shape-item"
            v-for="(shape, index) in item.children"
            :key="index"
            :shape="shape"
            @click="changeShape(shape)"
          />
        </div>
      </div>
    </div>

    <div class="row">
      <Select 
        style="flex: 1;" 
        :value="fillType" 
        @update:value="value => updateFillType(value as 'fill' | 'gradient' | 'pattern')"
        :options="[
          { label: '纯色填充', value: 'fill' },
          { label: '渐变填充', value: 'gradient' },
          { label: '图片填充', value: 'pattern' },
        ]"
      />
      <div style="width: 10px;" v-if="fillType !== 'pattern'"></div>
      <Popover trigger="click" v-if="fillType === 'fill'" style="flex: 1;">
        <template #content>
          <ColorPicker
            :modelValue="fill"
            @update:modelValue="value => updateFill(value)"
          />
        </template>
        <ColorButton :color="fill" />
      </Popover>
      <Select 
        style="flex: 1;" 
        :value="gradient.type" 
        @update:value="value => updateGradient({ type: value as GradientType })"
        v-else-if="fillType === 'gradient'"
        :options="[
          { label: '线性渐变', value: 'linear' },
          { label: '径向渐变', value: 'radial' },
        ]"
      />
    </div>
    
    <template v-if="fillType === 'gradient'">
      <div class="row">
        <GradientBar
          :value="gradient.colors"
          :index="currentGradientIndex"
          @update:value="value => updateGradient({ colors: value })"
          @update:index="index => currentGradientIndex = index"
        />
      </div>
      
      <!-- 渐变样式 -->
      <div class="row">
        <div style="width: 40%;">渐变样式(R)：</div>
        <div class="gradient-style-options" style="width: 60%;">
          <div 
            v-for="(type, index) in ['linear', 'radial', 'conic', 'reflected']" 
            :key="index"
            class="gradient-style-item"
            :class="{ 'active': gradient.type === type }"
            @click="updateGradient({ type: type as GradientType })"
          >
            <div class="gradient-preview" :class="`gradient-${type}`"></div>
          </div>
        </div>
      </div>
      
      <!-- 角度控制 -->
      <div class="row" v-if="gradient.type === 'linear' || gradient.type === 'conic' || gradient.type === 'reflected'">
        <div style="width: 40%;">角度(E)：</div>
        <div style="width: 60%; display: flex; align-items: center;">
          <button class="angle-btn" @click="updateGradient({ rotate: (gradient.rotate - 15) % 360 })">−</button>
          <div class="angle-input-container">
            <input
              type="number"
              class="angle-input"
              :value="gradient.rotate"
              @input="e => updateGradient({ rotate: parseFloat((e.target as HTMLInputElement).value) })"
            />
            <span class="angle-symbol">°</span>
          </div>
          <button class="angle-btn" @click="updateGradient({ rotate: (gradient.rotate + 15) % 360 })">+</button>
        </div>
      </div>
      
      <!-- 渐变色条 -->
      <div class="row">
        <div 
          class="gradient-preview-bar" 
          :style="{ background: getGradientBackground() }"
          ref="gradientBarRef"
        >
          <div 
            v-for="(color, index) in gradient.colors" 
            :key="index"
            class="gradient-thumb"
            :class="{ 'active': currentGradientIndex === index }"
            :style="{ 
              left: `${color.pos}%`,
              backgroundColor: color.color,
              borderColor: currentGradientIndex === index ? '#2468f2' : '#333'
            }"
            @click="currentGradientIndex = index"
            @mousedown="startDragging($event, index)"
          ></div>
        </div>
        <div class="gradient-controls">
          <button class="gradient-btn" style="color: green" @click="addGradientColor">+</button>
          <button class="gradient-btn" style="color: red" @click="removeGradientColor" :disabled="gradient.colors.length <= 2">×</button>
        </div>
      </div>
      
      <!-- 色标颜色 -->
      <div class="row">
        <div style="width: 40%;">色标颜色(C)：</div>
        <Popover trigger="click" style="width: 60%;">
          <template #content>
            <ColorPicker
              :modelValue="gradient.colors[currentGradientIndex].color"
              @update:modelValue="value => updateGradientColors(value)"
            />
          </template>
          <ColorButton :color="gradient.colors[currentGradientIndex].color" />
        </Popover>
      </div>
      
      <!-- 位置控制 -->
      <div class="row">
        <div style="width: 40%;">位置(O)：</div>
        <div style="width: 60%; display: flex; align-items: center;">
          <Slider
            style="flex: 1;"
            :min="0"
            :max="100"
            :step="1"
            :value="gradient.colors[currentGradientIndex].pos"
            @update:value="value => updateGradientColorPosition(value as number)" 
          />
          <div class="percent-input-container">
            <input
              type="number"
              class="percent-input"
              :value="gradient.colors[currentGradientIndex].pos"
              @input="e => updateGradientColorPosition(parseFloat((e.target as HTMLInputElement).value))"
            />
            <span class="percent-symbol">%</span>
          </div>
          <div class="position-buttons">
            <button class="position-btn up" v-tooltip="'增加'">▲</button>
            <button class="position-btn down" v-tooltip="'减少'">▼</button>
          </div>
        </div>
      </div>
      
      <!-- 透明度控制 -->
      <div class="row">
        <div style="width: 40%;">透明度(T)：</div>
        <div style="width: 60%; display: flex; align-items: center;">
          <Slider
            style="flex: 1;"
            :min="0"
            :max="100"
            :step="1"
            :value="100 - (gradient.colors[currentGradientIndex].opacity || 0) * 100"
            @update:value="value => updateGradientColorOpacity(value as number)" 
          />
          <div class="percent-input-container">
            <input
              type="number"
              class="percent-input"
              :value="100 - (gradient.colors[currentGradientIndex].opacity || 0) * 100"
              @input="e => updateGradientColorOpacity(parseFloat((e.target as HTMLInputElement).value))"
            />
            <span class="percent-symbol">%</span>
          </div>
          <div class="position-buttons">
            <button class="position-btn up" v-tooltip="'增加'">▲</button>
            <button class="position-btn down" v-tooltip="'减少'">▼</button>
          </div>
        </div>
      </div>
      
      <!-- 亮度控制 -->
      <div class="row">
        <div style="width: 40%;">亮度(B)：</div>
        <div style="width: 60%; display: flex; align-items: center;">
          <Slider
            style="flex: 1;"
            :min="-100"
            :max="100"
            :step="1"
            :value="gradient.colors[currentGradientIndex].brightness || 0"
            @update:value="value => updateGradientColorBrightness(value as number)" 
          />
          <div class="percent-input-container">
            <input
              type="number"
              class="percent-input"
              :value="gradient.colors[currentGradientIndex].brightness || 0"
              @input="e => updateGradientColorBrightness(parseFloat((e.target as HTMLInputElement).value))"
            />
            <span class="percent-symbol">%</span>
          </div>
          <div class="position-buttons">
            <button class="position-btn up" v-tooltip="'增加'">▲</button>
            <button class="position-btn down" v-tooltip="'减少'">▼</button>
          </div>
        </div>
      </div>
    </template>
    
    <template v-if="fillType === 'pattern'">
      <div class="pattern-image-wrapper">
        <FileInput @change="files => uploadPattern(files)">
          <div class="pattern-image">
            <div class="content" :style="{ backgroundImage: `url(${pattern})` }">
              <IconPlus />
            </div>
          </div>
        </FileInput>
      </div>
    </template>

    <ElementFlip />

    <Divider />

    <template v-if="handleShapeElement.text?.content">
      <RichTextBase />
      <Divider />

      <RadioGroup 
        class="row" 
        button-style="solid" 
        :value="textAlign"
        @update:value="value => updateTextAlign(value as 'top' | 'middle' | 'bottom')"
      >
        <RadioButton value="top" v-tooltip="'顶对齐'" style="flex: 1;"><IconAlignTextTopOne /></RadioButton>
        <RadioButton value="middle" v-tooltip="'居中'" style="flex: 1;"><IconAlignTextMiddleOne /></RadioButton>
        <RadioButton value="bottom" v-tooltip="'底对齐'" style="flex: 1;"><IconAlignTextBottomOne /></RadioButton>
      </RadioGroup>

      <Divider />
    </template>

    <ElementOutline />
    <Divider />
    <ElementShadow />
    <Divider />
    <ElementOpacity />
    <Divider />

    <div class="row">
      <CheckboxButton
        v-tooltip="'双击连续使用'"
        style="flex: 1;"
        :checked="!!shapeFormatPainter"
        @click="toggleShapeFormatPainter()"
        @dblclick="toggleShapeFormatPainter(true)"
      ><IconFormatBrush /> 形状格式刷</CheckboxButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { type Ref, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { GradientType, PPTShapeElement, Gradient, ShapeText } from '@/types/slides'
import { type ShapePoolItem, SHAPE_LIST, SHAPE_PATH_FORMULAS } from '@/configs/shapes'
import { getImageDataURL } from '@/utils/image'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useShapeFormatPainter from '@/hooks/useShapeFormatPainter'

import ElementOpacity from '../common/ElementOpacity.vue'
import ElementOutline from '../common/ElementOutline.vue'
import ElementShadow from '../common/ElementShadow.vue'
import ElementFlip from '../common/ElementFlip.vue'
import RichTextBase from '../common/RichTextBase.vue'
import ShapeItemThumbnail from '@/views/Editor/CanvasTool/ShapeItemThumbnail.vue'
import ColorButton from '@/components/ColorButton.vue'
import CheckboxButton from '@/components/CheckboxButton.vue'
import ColorPicker from '@/components/ColorPicker/index.vue'
import Divider from '@/components/Divider.vue'
import Slider from '@/components/Slider.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import Select from '@/components/Select.vue'
import Popover from '@/components/Popover.vue'
import GradientBar from '@/components/GradientBar.vue'
import FileInput from '@/components/FileInput.vue'

import { IconPlus, IconClose } from '@/utils/icons'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { handleElement, handleElementId, shapeFormatPainter } = storeToRefs(mainStore)

const handleShapeElement = handleElement as Ref<PPTShapeElement>

const fill = ref<string>('#000')
const pattern = ref<string>('')
const gradient = ref<Gradient>({
  type: 'linear', 
  rotate: 0,
  colors: [
    { pos: 0, color: '#fff' },
    { pos: 100, color: '#fff' },
  ],
})
const fillType = ref('fill')
const textAlign = ref('middle')
const currentGradientIndex = ref(0)
const gradientBarRef = ref<HTMLElement | null>(null)

watch(handleElement, () => {
  if (!handleElement.value || handleElement.value.type !== 'shape') return

  fill.value = handleElement.value.fill || '#fff'
  const defaultGradientColor = [
    { pos: 0, color: fill.value },
    { pos: 100, color: '#fff' },
  ]
  gradient.value = handleElement.value.gradient || { type: 'linear', rotate: 0, colors: defaultGradientColor }
  pattern.value = handleElement.value.pattern || ''
  fillType.value = (handleElement.value.pattern !== undefined) ? 'pattern' : (handleElement.value.gradient ? 'gradient' : 'fill')
  textAlign.value = handleElement.value?.text?.align || 'middle'
}, { deep: true, immediate: true })

watch(handleElementId, () => {
  currentGradientIndex.value = 0
})

const { addHistorySnapshot } = useHistorySnapshot()
const { toggleShapeFormatPainter } = useShapeFormatPainter()

const updateElement = (props: Partial<PPTShapeElement>) => {
  slidesStore.updateElement({ id: handleElementId.value, props })
  addHistorySnapshot()
}

// 设置填充类型：渐变、纯色
const updateFillType = (type: 'gradient' | 'fill' | 'pattern') => {
  if (type === 'fill') {
    slidesStore.removeElementProps({ id: handleElementId.value, propName: ['gradient', 'pattern'] })
    addHistorySnapshot()
  }
  else if (type === 'gradient') {
    currentGradientIndex.value = 0
    slidesStore.removeElementProps({ id: handleElementId.value, propName: 'pattern' })
    updateElement({ gradient: gradient.value })
  }
  else if (type === 'pattern') {
    slidesStore.removeElementProps({ id: handleElementId.value, propName: 'gradient' })
    updateElement({ pattern: '' })
  }
}

// 设置渐变填充
const updateGradient = (gradientProps: Partial<Gradient>) => {
  if (!gradient.value) return
  const _gradient = { ...gradient.value, ...gradientProps }
  updateElement({ gradient: _gradient })
}
const updateGradientColors = (color: string) => {
  const colors = gradient.value.colors.map((item, index) => {
    if (index === currentGradientIndex.value) return { ...item, color }
    return item
  })
  updateGradient({ colors })
}

// 设置渐变色块位置
const updateGradientColorPosition = (pos: number) => {
  const colors = gradient.value.colors.map((item, index) => {
    if (index === currentGradientIndex.value) return { ...item, pos }
    return item
  })
  updateGradient({ colors })
}

// 设置渐变色块透明度
const updateGradientColorOpacity = (value: number) => {
  const opacity = (100 - value) / 100
  const colors = gradient.value.colors.map((item, index) => {
    if (index === currentGradientIndex.value) return { ...item, opacity }
    return item
  })
  updateGradient({ colors })
}

// 设置渐变色块亮度
const updateGradientColorBrightness = (brightness: number) => {
  const colors = gradient.value.colors.map((item, index) => {
    if (index === currentGradientIndex.value) return { ...item, brightness }
    return item
  })
  updateGradient({ colors })
}

// 上传填充图片
const uploadPattern = (files: FileList) => {
  const imageFile = files[0]
  if (!imageFile) return
  getImageDataURL(imageFile).then(dataURL => {
    pattern.value = dataURL
    updateElement({ pattern: dataURL })
  })
}

// 设置填充色
const updateFill = (value: string) => {
  updateElement({ fill: value })
}

// 修改形状
const changeShape = (shape: ShapePoolItem) => {
  const { width, height } = handleElement.value as PPTShapeElement
  const props: Partial<PPTShapeElement> = {
    viewBox: shape.viewBox,
    path: shape.path,
    special: shape.special,
  }
  if (shape.pathFormula) {
    props.pathFormula = shape.pathFormula
    props.viewBox = [width, height]

    const pathFormula = SHAPE_PATH_FORMULAS[shape.pathFormula]
    if ('editable' in pathFormula) {
      props.path = pathFormula.formula(width, height, pathFormula.defaultValue)
      props.keypoints = pathFormula.defaultValue
    }
    else props.path = pathFormula.formula(width, height)
  }
  else {
    props.pathFormula = undefined
    props.keypoints = undefined
  }
  updateElement(props)
}

const updateTextAlign = (align: 'top' | 'middle' | 'bottom') => {
  const _handleElement = handleElement.value as PPTShapeElement
  
  const defaultText: ShapeText = {
    content: '',
    defaultFontName: '',
    defaultColor: '#000',
    align: 'middle',
  }
  const _text = _handleElement.text || defaultText
  updateElement({ text: { ..._text, align } })
}

const getGradientBackground = () => {
  if (!gradient.value || gradient.value.colors.length === 0) return 'linear-gradient(90deg, #003ec3 0%, #2c79ff 50%, #ffffff 100%)'
  
  // Sort colors by position
  const sortedColors = [...gradient.value.colors].sort((a, b) => a.pos - b.pos)
  
  // Create color stops with positions
  const colorStops = sortedColors.map(color => {
    // Apply opacity if available
    let colorValue = color.color
    if (color.opacity !== undefined) {
      const rgba = hexToRgba(colorValue, 1 - color.opacity)
      colorValue = rgba
    }
    
    // Apply brightness if available
    if (color.brightness !== undefined && color.brightness !== 0) {
      // Brightness affects the color intensity
      // Positive brightness adds white, negative adds black
      colorValue = adjustBrightness(colorValue, color.brightness)
    }
    
    return `${colorValue} ${color.pos}%`
  })
  
  return `linear-gradient(90deg, ${colorStops.join(', ')})`
}

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, opacity: number) => {
  // Remove the hash
  hex = hex.replace('#', '')
  
  // Parse the hex values
  let r = parseInt(hex.substring(0, 2), 16)
  let g = parseInt(hex.substring(2, 4), 16)
  let b = parseInt(hex.substring(4, 6), 16)
  
  // Return rgba
  return `rgba(${r}, ${g}, ${b}, ${1 - opacity})`
}

// Helper function to adjust brightness
const adjustBrightness = (color: string, brightness: number) => {
  // Convert color to rgba first if it's a hex
  let rgba = color
  if (color.startsWith('#')) {
    rgba = hexToRgba(color, 0)
  }
  
  // Extract RGBA values
  const rgbaMatch = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/)
  if (!rgbaMatch) return color
  
  const r = parseInt(rgbaMatch[1])
  const g = parseInt(rgbaMatch[2])
  const b = parseInt(rgbaMatch[3])
  const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
  
  // Apply brightness
  // Positive brightness: add white (increase values)
  // Negative brightness: add black (decrease values)
  const factor = brightness / 100
  let newR, newG, newB
  
  if (factor > 0) {
    // Add white (increase values toward 255)
    newR = Math.min(255, r + (255 - r) * factor)
    newG = Math.min(255, g + (255 - g) * factor)
    newB = Math.min(255, b + (255 - b) * factor)
  } else {
    // Add black (decrease values toward 0)
    const absFactor = Math.abs(factor)
    newR = Math.max(0, r - r * absFactor)
    newG = Math.max(0, g - g * absFactor)
    newB = Math.max(0, b - b * absFactor)
  }
  
  // Round the values
  newR = Math.round(newR)
  newG = Math.round(newG)
  newB = Math.round(newB)
  
  // Return the adjusted color
  return `rgba(${newR}, ${newG}, ${newB}, ${a})`
}

const addGradientColor = () => {
  const newColor = { pos: 50, color: '#fff' }
  const colors = [...gradient.value.colors, newColor]
  updateGradient({ colors })
}

const removeGradientColor = () => {
  const colors = gradient.value.colors.filter((_, index) => index !== currentGradientIndex.value)
  updateGradient({ colors })
}

const startDragging = (event: MouseEvent, index: number) => {
  // Set current color stop index
  currentGradientIndex.value = index
  
  event.preventDefault()
  
  // Get the gradient bar element
  const gradientBar = gradientBarRef.value
  if (!gradientBar) return
  
  const barRect = gradientBar.getBoundingClientRect()
  const barWidth = barRect.width
  
  // Calculate initial position
  const initialX = event.clientX
  const initialPos = gradient.value.colors[index].pos
  
  // Create handlers for mouse move and mouse up
  const handleMouseMove = (moveEvent: MouseEvent) => {
    // Calculate new position based on mouse movement
    const deltaX = moveEvent.clientX - initialX
    const deltaPercent = (deltaX / barWidth) * 100
    let newPos = Math.max(0, Math.min(100, initialPos + deltaPercent))
    
    // Round to nearest integer
    newPos = Math.round(newPos)
    
    // Update color stop position
    updateGradientColorPosition(newPos)
  }
  
  const handleMouseUp = () => {
    // Remove event listeners when done dragging
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  // Add event listeners for dragging
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
</script>

<style lang="scss" scoped>
.shape-style-panel {
  user-select: none;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.font-size-btn {
  padding: 0;
}
.title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.shape-pool {
  width: 235px;
  height: 150px;
  overflow: auto;
  padding: 5px;
  padding-right: 10px;
  border: 1px solid $borderColor;
  margin-bottom: 20px;
}
.shape-list {
  @include flex-grid-layout();
}
.shape-item {
  @include flex-grid-layout-children(6, 14%);

  height: 0;
  padding-bottom: 14%;
  flex-shrink: 0;
}

.pattern-image-wrapper {
  margin-bottom: 10px;
}
.pattern-image {
  height: 0;
  padding-bottom: 56.25%;
  border: 1px dashed $borderColor;
  border-radius: $borderRadius;
  position: relative;
  transition: all $transitionDelay;

  &:hover {
    border-color: $themeColor;
    color: $themeColor;
  }

  .content {
    @include absolute-0();

    display: flex;
    justify-content: center;
    align-items: center;
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
    cursor: pointer;
  }
}

// 渐变样式相关样式
.gradient-style-options {
  display: flex;
  justify-content: space-between;
}

.gradient-style-item {
  width: 35px;
  height: 35px;
  border: 1px solid $borderColor;
  border-radius: 4px;
  padding: 2px;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    border-color: $themeColor;
    border-width: 2px;
  }
}

.gradient-preview {
  width: 100%;
  height: 100%;
  border-radius: 2px;

  &.gradient-linear {
    background: linear-gradient(90deg, #2c79ff 0%, #ffffff 100%);
  }
  &.gradient-radial {
    background: radial-gradient(circle, #2c79ff 0%, #ffffff 100%);
  }
  &.gradient-conic {
    background: conic-gradient(from 90deg, #2c79ff, #ffffff);
  }
  &.gradient-reflected {
    background: linear-gradient(to right, #ffffff 0%, #2c79ff 50%, #ffffff 100%);
  }
}

.angle-btn {
  width: 30px;
  height: 30px;
  border: 1px solid $borderColor;
  background-color: #fff;
  border-radius: 4px;
  font-size: 18px;
  cursor: pointer;

  &:hover {
    background-color: #f5f5f5;
  }
  &:active {
    background-color: #eee;
  }
}

.angle-input-container {
  display: flex;
  align-items: center;
  border: 1px solid $borderColor;
  border-radius: 4px;
  margin: 0 5px;
  flex: 1;
  position: relative;
}

.angle-input {
  width: 100%;
  height: 30px;
  padding: 0 25px 0 10px;
  border: none;
  outline: none;
  text-align: right;
}

.angle-symbol {
  position: absolute;
  right: 10px;
}

.gradient-preview-bar {
  height: 20px;
  flex: 1;
  background: linear-gradient(90deg, #003ec3 0%, #2c79ff 50%, #ffffff 100%);
  border-radius: 4px;
  position: relative;
  margin-right: 10px;
  margin-bottom: 20px;
}

.gradient-thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  background-color: #fff;
  border: 1px solid #333;
  box-sizing: border-box;
  cursor: pointer;
  transform: translateX(-50%);
  transition: all 0.2s;
  bottom: -16px;
  clip-path: polygon(0% 50%, 50% 0%, 100% 50%, 100% 100%, 0% 100%);
  
  &.active {
    border-width: 2px;
    z-index: 10;
    width: 20px;
    height: 20px;
  }
}

.gradient-controls {
  display: flex;
  gap: 5px;
}

.gradient-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 1px solid $borderColor;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #f5f5f5;
  }
}

.percent-input-container {
  display: flex;
  align-items: center;
  border: 1px solid $borderColor;
  border-radius: 4px;
  margin: 0 5px;
  width: 80px;
  position: relative;
}

.percent-input {
  width: 100%;
  height: 30px;
  padding: 0 25px 0 10px;
  border: none;
  outline: none;
  text-align: right;
}

.percent-symbol {
  position: absolute;
  right: 10px;
}

.position-buttons {
  display: flex;
  flex-direction: column;
}

.position-btn {
  width: 16px;
  height: 16px;
  border: 1px solid $borderColor;
  background-color: #fff;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  padding: 0;

  &:hover {
    background-color: #f5f5f5;
  }
  &:active {
    background-color: #eee;
  }
}
</style>