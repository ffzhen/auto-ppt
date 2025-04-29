<template>
  <div class="canvas-tool">
    <div class="left-handler">
      <IconBack class="handler-item" :class="{ 'disable': !canUndo }" v-tooltip="'撤销（Ctrl + Z）'" @click="undo()" />
      <IconNext class="handler-item" :class="{ 'disable': !canRedo }" v-tooltip="'重做（Ctrl + Y）'" @click="redo()" />
      <div class="more">
        <Divider type="vertical" style="height: 20px;" />
        <Popover class="more-icon" trigger="click" v-model:value="moreVisible" :offset="10">
          <template #content>
            <PopoverMenuItem center @click="toggleNotesPanel(); moreVisible = false">批注面板</PopoverMenuItem>
            <PopoverMenuItem center @click="toggleSelectPanel(); moreVisible = false">选择窗格</PopoverMenuItem>
            <PopoverMenuItem center @click="toggleSraechPanel(); moreVisible = false">查找替换</PopoverMenuItem>
          </template>
          <IconMore class="handler-item" />
        </Popover>
        <IconComment class="handler-item" :class="{ 'active': showNotesPanel }" v-tooltip="'批注面板'" @click="toggleNotesPanel()" />
        <IconMoveOne class="handler-item" :class="{ 'active': showSelectPanel }" v-tooltip="'选择窗格'" @click="toggleSelectPanel()" />
        <IconSearch class="handler-item" :class="{ 'active': showSearchPanel }" v-tooltip="'查找/替换（Ctrl + F）'" @click="toggleSraechPanel()" />
      </div>
    </div>

    <div class="add-element-handler">
      <div class="handler-item group-btn" v-tooltip="'插入文字'">
        <IconFontSize class="icon" :class="{ 'active': creatingElement?.type === 'text' }" @click="drawText()" />
        
        <Popover trigger="click" v-model:value="textTypeSelectVisible" style="height: 100%;display: flex;align-items: center;" :offset="10">
          <template #content>
            <PopoverMenuItem center @click="() => { drawText(); textTypeSelectVisible = false }"><IconTextRotationNone /> 横向文本框</PopoverMenuItem>
            <PopoverMenuItem center @click="() => { drawText(true); textTypeSelectVisible = false }"><IconTextRotationDown /> 竖向文本框</PopoverMenuItem>
          </template>
          <IconDown class="arrow" />
        </Popover>
      </div>
      <div class="handler-item group-btn" v-tooltip="'插入形状'" :offset="10">
        <Popover trigger="click" style="height: 100%;display: flex;align-items: center;" v-model:value="shapePoolVisible" :offset="10">
          <template #content>
            <ShapePool @select="shape => drawShape(shape)" />
          </template>
          <IconGraphicDesign class="icon" :class="{ 'active': creatingCustomShape || creatingElement?.type === 'shape' }" />
        </Popover>
        
        <Popover trigger="click" v-model:value="shapeMenuVisible" style="height: 100%; display: flex;align-items: center;" :offset="10">
          <template #content>
            <PopoverMenuItem center @click="() => { drawCustomShape(); shapeMenuVisible = false }">自由绘制</PopoverMenuItem>
          </template>
          <IconDown class="arrow" />
        </Popover>
      </div>
      <FileInput @change="files => insertImageElement(files)">
        <IconPicture class="handler-item" v-tooltip="'插入图片'" />
      </FileInput>
      <Popover trigger="click" v-model:value="linePoolVisible" :offset="10">
        <template #content>
          <LinePool @select="line => drawLine(line)" />
        </template>
        <IconConnection class="handler-item" :class="{ 'active': creatingElement?.type === 'line' }" v-tooltip="'插入线条'" />
      </Popover>
      <Popover trigger="click" v-model:value="chartPoolVisible" :offset="10">
        <template #content>
          <ChartPool @select="chart => { createChartElement(chart); chartPoolVisible = false }" />
        </template>
        <IconChartProportion class="handler-item" v-tooltip="'插入图表'" />
      </Popover>
      <Popover trigger="click" v-model:value="tableGeneratorVisible" :offset="10">
        <template #content>
          <TableGenerator
            @close="tableGeneratorVisible = false"
            @insert="({ row, col }) => { createTableElement(row, col); tableGeneratorVisible = false }"
          />
        </template>
        <IconInsertTable class="handler-item" v-tooltip="'插入表格'" />
      </Popover>
      <IconFormula class="handler-item" v-tooltip="'插入公式'" @click="latexEditorVisible = true" />
      <Popover trigger="click" v-model:value="mediaInputVisible" :offset="10">
        <template #content>
          <MediaInput 
            @close="mediaInputVisible = false"
            @insertVideo="src => { createVideoElement(src); mediaInputVisible = false }"
            @insertAudio="src => { createAudioElement(src); mediaInputVisible = false }"
          />
        </template>
        <IconVideoTwo class="handler-item" v-tooltip="'插入音视频'" />
      </Popover>
    </div>

    <div class="delete-all-slides-btn">
      <IconDelete class="handler-item" v-tooltip="'删除所有幻灯片'" @click="showConfirmModal = true" />
    </div>

    <div class="right-handler">
      <IconMinus class="handler-item viewport-size" v-tooltip="'画布缩小（Ctrl + -）'" @click="scaleCanvas('-')" />
      <Popover trigger="click" v-model:value="canvasScaleVisible">
        <template #content>
          <PopoverMenuItem
            center
            v-for="item in canvasScalePresetList" 
            :key="item" 
            @click="applyCanvasPresetScale(item)"
          >{{item}}%</PopoverMenuItem>
          <PopoverMenuItem center @click="resetCanvas(); canvasScaleVisible = false">适应屏幕</PopoverMenuItem>
        </template>
        <span class="text">{{canvasScalePercentage}}</span>
      </Popover>
      <IconPlus class="handler-item viewport-size" v-tooltip="'画布放大（Ctrl + =）'" @click="scaleCanvas('+')" />
      <IconFullScreen class="handler-item viewport-size-adaptation" v-tooltip="'适应屏幕（Ctrl + 0）'" @click="resetCanvas()" />
    </div>

    <Modal
      v-model:visible="latexEditorVisible" 
      :width="880"
    >
      <LaTeXEditor 
        @close="latexEditorVisible = false"
        @update="data => { createLatexElement(data); latexEditorVisible = false }"
      />
    </Modal>

    <Modal
      v-model:visible="showConfirmModal"
      :width="400"
    >
      <template #title>确认删除</template>
      <p>确定要删除所有幻灯片？此操作无法恢复。</p>
      <div style="text-align: right;">
          <Button @click="showConfirmModal = false">取消</Button>
          <Button type="primary" @click="deleteAllSlides">删除</Button>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
import { getImageDataURL } from '@/utils/image'
import type { ShapePoolItem } from '@/configs/shapes'
import type { LinePoolItem } from '@/configs/lines'
import useScaleCanvas from '@/hooks/useScaleCanvas'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useCreateElement from '@/hooks/useCreateElement'
import useSlideHandler from '@/hooks/useSlideHandler'
import message from '@/utils/message'

import ShapePool from './ShapePool.vue'
import LinePool from './LinePool.vue'
import ChartPool from './ChartPool.vue'
import TableGenerator from './TableGenerator.vue'
import MediaInput from './MediaInput.vue'
import LaTeXEditor from '@/components/LaTeXEditor/index.vue'
import FileInput from '@/components/FileInput.vue'
import Modal from '@/components/Modal.vue'
import Divider from '@/components/Divider.vue'
import Popover from '@/components/Popover.vue'
import PopoverMenuItem from '@/components/PopoverMenuItem.vue'
import Button from '@/components/Button.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { creatingElement, creatingCustomShape, showSelectPanel, showSearchPanel, showNotesPanel } = storeToRefs(mainStore)
const { canUndo, canRedo } = storeToRefs(useSnapshotStore())

const { redo, undo } = useHistorySnapshot()
const { createSlide, deleteSlide, resetSlides } = useSlideHandler()

const {
  scaleCanvas,
  setCanvasScalePercentage,
  resetCanvas,
  canvasScalePercentage,
} = useScaleCanvas()

const canvasScalePresetList = [200, 150, 125, 100, 75, 50]
const canvasScaleVisible = ref(false)

const showConfirmModal = ref(false)

const applyCanvasPresetScale = (value: number) => {
  setCanvasScalePercentage(value)
  canvasScaleVisible.value = false
}

const {
  createImageElement,
  createChartElement,
  createTableElement,
  createLatexElement,
  createVideoElement,
  createAudioElement,
} = useCreateElement()

const insertImageElement = (files: FileList) => {
  const imageFile = files[0]
  if (!imageFile) return
  getImageDataURL(imageFile).then(dataURL => createImageElement(dataURL))
}

const shapePoolVisible = ref(false)
const linePoolVisible = ref(false)
const chartPoolVisible = ref(false)
const tableGeneratorVisible = ref(false)
const mediaInputVisible = ref(false)
const latexEditorVisible = ref(false)
const textTypeSelectVisible = ref(false)
const shapeMenuVisible = ref(false)
const moreVisible = ref(false)

// 绘制文字范围
const drawText = (vertical = false) => {
  mainStore.setCreatingElement({
    type: 'text',
    vertical,
  })
}

// 绘制形状范围
const drawShape = (shape: ShapePoolItem) => {
  mainStore.setCreatingElement({
    type: 'shape',
    data: shape,
  })
  shapePoolVisible.value = false
}

// 绘制线条范围
const drawLine = (line: LinePoolItem) => {
  mainStore.setCreatingElement({
    type: 'line',
    data: line,
  })
  linePoolVisible.value = false
}

// 绘制自定义形状
const drawCustomShape = () => {
  mainStore.setCreatingCustomShapeState(true)
  shapePoolVisible.value = false
}

// 删除所有幻灯片
const deleteAllSlides = () => {
  if (!slidesStore || !slidesStore.slides || slidesStore.slides.length === 0) {
    message.warning('当前没有幻灯片可删除')
    return
  }
  
  // 重置幻灯片（会创建一个空白幻灯片）
  resetSlides()
  
  message.success('已删除所有幻灯片')
  showConfirmModal.value = false
}

// 切换批注面板显示状态
const toggleNotesPanel = () => {
  mainStore.setNotesPanelState(!showNotesPanel.value)
}

// 切换选择面板显示状态
const toggleSelectPanel = () => {
  mainStore.setSelectPanelState(!showSelectPanel.value)
}

// 切换查找替换面板显示状态
const toggleSraechPanel = () => {
  mainStore.setSearchPanelState(!showSearchPanel.value)
}
</script>

<style lang="scss" scoped>
.canvas-tool {
  height: 40px;
  background-color: $lightGray;
  user-select: none;
  display: flex;
  justify-content: space-between;
  position: relative;
}
.left-handler {
  display: flex;
  align-items: center;

  .more {
    display: flex;
    align-items: center;

    @media screen and (min-width: 1440px) {
      .more-icon {
        display: none;
      }
    }

    @media screen and (max-width: 1439px) {
      .handler-item:not(.more-icon) {
        display: none;
      }
    }
  }
}
.add-element-handler {
  height: 100%;
  display: flex;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}
.delete-all-slides-btn {
  position: absolute;
  top: 0;
  right: 140px;
  height: 100%;
  display: flex;
  align-items: center;

  .handler-item {
    font-size: 18px;
    color: #f56c6c;
  }
}
.right-handler {
  height: 100%;
  display: flex;
  align-items: center;
}
.handler-item {
  padding: 0 10px;
  font-size: 18px;
  color: #888;
  cursor: pointer;
  height: 100%;
  display: flex;
  align-items: center;

  &:hover {
    color: $themeColor;
    background-color: rgba($color: $themeColor, $alpha: .1);
  }
  &.active {
    color: $themeColor;
  }
  &.disable {
    color: #ccc;
    cursor: not-allowed;

    &:hover {
      background-color: transparent;
      color: #ccc;
    }
  }
}
.group-btn {
  position: relative;
  padding-right: 0;

  .icon {
    padding-right: 5px;
  }
  .arrow {
    font-size: 12px;
    padding: 0 5px;
    cursor: pointer;
  }
}
.viewport-size, .viewport-size-adaptation {
  padding: 0 5px;
}
.text {
  font-size: 12px;
  color: #666;
  cursor: pointer;
  width: 40px;
  text-align: center;
}
</style>