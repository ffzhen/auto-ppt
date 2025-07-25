<template>
  <div class="image-style-panel">
    <div 
      class="origin-image"
      :style="{ backgroundImage: `url(${handleImageElement.src})` }"
    ></div>

    <ElementFlip />

    <ButtonGroup class="row" passive>
      <Button first style="width: calc(100% / 6 * 5);" @click="clipImage()"><IconTailoring class="btn-icon" /> 裁剪图片</Button>
      <Popover trigger="click" v-model:value="clipPanelVisible" style="width: calc(100% / 6);">
        <template #content>
          <div class="clip">
            <div class="title">按形状：</div>
            <div class="shape-clip">
              <div 
                class="shape-clip-item" 
                v-for="(item, key) in shapeClipPathOptions" 
                :key="key"
                @click="presetImageClip(key as string)"
              >
                <div class="shape" :style="{ clipPath: item.style }"></div>
              </div>
            </div>

            <template v-for="typeItem in ratioClipOptions" :key="typeItem.label">
              <div class="title" v-if="typeItem.label">按{{typeItem.label}}：</div>
              <ButtonGroup class="row">
                <Button 
                  style="flex: 1;"
                  v-for="item in typeItem.children"
                  :key="item.key"
                  @click="presetImageClip('rect', item.ratio)"
                >{{item.key}}</Button>
              </ButtonGroup>
            </template>
          </div>
        </template>
        <Button last class="popover-btn" style="width: 100%;"><IconDown /></Button>
      </Popover>
    </ButtonGroup>
    
    <div class="row">
      <div style="width: 40%;">圆角半径：</div>
      <NumberInput 
        :value="handleImageElement.radius || 0" 
        @update:value="value => updateImage({ radius: value })" 
        style="width: 60%;" 
      />
    </div>

    <Divider />
    <ElementColorMask />
    <Divider />
    <ElementFilter />
    <Divider />
    <ElementOutline />
    <Divider />
    <ElementShadow />
    <Divider />
    
    <FileInput @change="files => replaceImage(files)">
      <Button class="full-width-btn"><IconTransform class="btn-icon" /> 替换图片</Button>
    </FileInput>
    <Button class="full-width-btn" @click="resetImage()"><IconUndo class="btn-icon" /> 重置样式</Button>
    <Button class="full-width-btn" @click="setBackgroundImage()"><IconTheme class="btn-icon" /> 设为背景</Button>
    <Button class="full-width-btn" @click="showRegenerateModal()"><IconMagic class="btn-icon" /> 重新生成图片</Button>
  </div>

  <Modal
    v-model:visible="regenerateModalVisible"
    title="重新生成图片"
    :confirm-loading="isRegenerating"
    @ok="regenerateImage"
  >
    <div class="regenerate-input-wrapper">
      <div class="input-label">生成提示词:</div>
      <textarea
        v-model="regeneratePrompt"
        class="regenerate-textarea"
        placeholder="请输入详细的图片描述，如：现代简约风格的商务办公场景，明亮的办公室环境"
        rows="4"
      />
      <div class="modal-footer flex justify-end gap-2 mt-4">
      <Button @click="regenerateModalVisible = false">取消</Button>
      <Button type="primary" :loading="isRegenerating" @click="regenerateImage">重新生成</Button>
    </div>
    </div>
  </Modal>
  
  <FullscreenSpin :loading="isRegenerating" tip="AI生成图片中，请耐心等待 ..." />
</template>

<script lang="ts" setup>
import { type Ref, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { PPTImageElement, SlideBackground } from '@/types/slides'
import { CLIPPATHS } from '@/configs/imageClip'
import { getImageDataURL, getImageSize } from '@/utils/image'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import api from '@/services'
import message from '@/utils/message'

import ElementOutline from '../common/ElementOutline.vue'
import ElementShadow from '../common/ElementShadow.vue'
import ElementFlip from '../common/ElementFlip.vue'
import ElementFilter from '../common/ElementFilter.vue'
import ElementColorMask from '../common/ElementColorMask.vue'
import FileInput from '@/components/FileInput.vue'
import Divider from '@/components/Divider.vue'
import Button from '@/components/Button.vue'
import ButtonGroup from '@/components/ButtonGroup.vue'
import Popover from '@/components/Popover.vue'
import NumberInput from '@/components/NumberInput.vue'
import Modal from '@/components/Modal.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'

const shapeClipPathOptions = CLIPPATHS
const ratioClipOptions = [
  {
    label: '纵横比（正方形）',
    children: [
      { key: '1:1', ratio: 1 / 1 },
    ],
  },
  {
    label: '纵横比（纵向）',
    children: [
      { key: '2:3', ratio: 3 / 2 },
      { key: '3:4', ratio: 4 / 3 },
      { key: '3:5', ratio: 5 / 3 },
      { key: '4:5', ratio: 5 / 4 },
    ],
  },
  {
    label: '纵横比（横向）',
    children: [
      { key: '3:2', ratio: 2 / 3 },
      { key: '4:3', ratio: 3 / 4 },
      { key: '5:3', ratio: 3 / 5 },
      { key: '5:4', ratio: 4 / 5 },
    ],
  },
  {
    children: [
      { key: '16:9', ratio: 9 / 16 },
      { key: '16:10', ratio: 10 / 16 },
    ],
  },
]

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { handleElement, handleElementId } = storeToRefs(mainStore)
const { currentSlide } = storeToRefs(slidesStore)

const handleImageElement = handleElement as Ref<PPTImageElement>

const clipPanelVisible = ref(false)
const regenerateModalVisible = ref(false)
const isRegenerating = ref(false)

// 初始化重新生成提示词，基于当前图片元素的generatePrompt
const regeneratePrompt = ref(handleImageElement.value.generatePrompt || '')
const workflow_id = ref(handleImageElement.value.workflow_id || '')

// 监听图片元素变化，自动更新提示词
watch(
  () => handleImageElement.value.generatePrompt,
  (newPrompt) => {
    regeneratePrompt.value = newPrompt || ''
  },
  { immediate: true }
)
// 监听图片元素变化，自动更新提示词
watch(
  () => handleImageElement.value.workflow_id,
  (newId) => {
    workflow_id.value = newId || ''
  },
  { immediate: true }
)

const { addHistorySnapshot } = useHistorySnapshot()

// 打开自由裁剪
const clipImage = () => {
  mainStore.setClipingImageElementId(handleElementId.value)
  clipPanelVisible.value = false
}

// 获取原始图片的位置大小
const getImageElementDataBeforeClip = () => {
  const _handleElement = handleElement.value as PPTImageElement

  // 图片当前的位置大小和裁剪范围
  const imgWidth = _handleElement.width
  const imgHeight = _handleElement.height
  const imgLeft = _handleElement.left
  const imgTop = _handleElement.top
  const originClipRange: [[number, number], [number, number]] = _handleElement.clip ? _handleElement.clip.range : [[0, 0], [100, 100]]

  const originWidth = imgWidth / ((originClipRange[1][0] - originClipRange[0][0]) / 100)
  const originHeight = imgHeight / ((originClipRange[1][1] - originClipRange[0][1]) / 100)
  const originLeft = imgLeft - originWidth * (originClipRange[0][0] / 100)
  const originTop = imgTop - originHeight * (originClipRange[0][1] / 100)

  return {
    originClipRange,
    originWidth,
    originHeight,
    originLeft,
    originTop,
  }
}

const updateImage = (props: Partial<PPTImageElement>) => {
  if (!handleElement.value) return
  slidesStore.updateElement({ id: handleElementId.value, props })
  addHistorySnapshot()
}

// 预设裁剪
const presetImageClip = (shape: string, ratio = 0) => {
  const _handleElement = handleElement.value as PPTImageElement

  const {
    originClipRange,
    originWidth,
    originHeight,
    originLeft,
    originTop,
  } = getImageElementDataBeforeClip()
  
  // 纵横比裁剪（形状固定为矩形）
  if (ratio) {
    const imageRatio = originHeight / originWidth

    const min = 0
    const max = 100
    let range: [[number, number], [number, number]]

    if (imageRatio > ratio) {
      const distance = ((1 - ratio / imageRatio) / 2) * 100
      range = [[min, distance], [max, max - distance]]
    }
    else {
      const distance = ((1 - imageRatio / ratio) / 2) * 100
      range = [[distance, min], [max - distance, max]]
    }
    updateImage({
      clip: { ..._handleElement.clip, shape, range },
      left: originLeft + originWidth * (range[0][0] / 100),
      top: originTop + originHeight * (range[0][1] / 100),
      width: originWidth * (range[1][0] - range[0][0]) / 100,
      height: originHeight * (range[1][1] - range[0][1]) / 100,
    })
  }
  // 形状裁剪（保持当前裁剪范围）
  else {
    const clipData = { ..._handleElement.clip, shape, range: originClipRange }
    let props: Partial<PPTImageElement> = { clip: clipData }
    if (shape === 'rect') props = { clip: clipData, radius: 0 }
    updateImage(props)
  }
  clipImage()
}

// 替换图片（保持当前的样式）
const replaceImage = (files: FileList) => {
  const imageFile = files[0]
  if (!imageFile) return
  getImageDataURL(imageFile).then(dataURL => {
    const originWidth = handleImageElement.value.width
    const originHeight = handleImageElement.value.height
    const originLeft = handleImageElement.value.left
    const originTop = handleImageElement.value.top
    const centerX = originLeft + originWidth / 2
    const centerY = originTop + originHeight / 2

    getImageSize(dataURL).then(({ width, height }) => {
      const h = originHeight
      const w = width * (originHeight / height)
      const l = centerX - w / 2
      const t = centerY - h / 2

      slidesStore.removeElementProps({
        id: handleElementId.value,
        propName: 'clip',
      })
      updateImage({
        src: dataURL,
        width: w,
        height: h,
        left: l,
        top: t,
      })
    })
  })
}

// 重置图片：清除全部样式
const resetImage = () => {
  const _handleElement = handleElement.value as PPTImageElement

  if (_handleElement.clip) {
    const {
      originWidth,
      originHeight,
      originLeft,
      originTop,
    } = getImageElementDataBeforeClip()

    updateImage({
      left: originLeft,
      top: originTop,
      width: originWidth,
      height: originHeight,
    })
  }

  slidesStore.removeElementProps({
    id: handleElementId.value,
    propName: ['clip', 'outline', 'flip', 'shadow', 'filters', 'colorMask', 'radius'],
  })
  addHistorySnapshot()
}

// 将图片设置为背景
const setBackgroundImage = () => {
  const _handleElement = handleElement.value as PPTImageElement

  const background: SlideBackground = {
    ...currentSlide.value.background,
    type: 'image',
    image: {
      src: _handleElement.src,
      size: 'cover'
    },
  }
  slidesStore.updateSlide({ background })
  addHistorySnapshot()
}

// 重新生成图片
const showRegenerateModal = () => {
  regenerateModalVisible.value = true
}

const regenerateImage = async () => {
  if (!regeneratePrompt.value.trim()) {
    message.error('请输入生成提示词')
    return
  }

  // 关闭模态框，显示全屏加载状态
  regenerateModalVisible.value = false
  isRegenerating.value = true
  
  try {
    // 从元素中获取workflow_id，如果不存在则使用默认值
    const api_token = 'pat_deu1y1IB5IDig8WCqVHQWoVvhu6doYlMMEfS0yc2UZwzu7OMNZ5ZNLWWw6ljH7am'
    
    const result = await api.generateVolcengineImage({
      prompt: regeneratePrompt.value.trim(),
      workflow_id: workflow_id.value,
      api_token
    })
    if (!result.image_url) {
      throw new Error('生成的图片URL为空')
    }

    // 更新图片，同时保存workflow_id
    updateImage({
      src: result.image_url,
      generatePrompt: regeneratePrompt.value.trim(),
      workflow_id: workflow_id.value // 保存使用的workflow_id到元素中
    })

    // 如果当前幻灯片是封面背景图片到其他幻灯片
    if (currentSlide.value.type === 'cover') {
      // 同步背景图片到其他幻灯片
      const updatedSlides = slidesStore.slides.map(slide => {
        // 跳过封面幻灯片
        if (slide.type === 'cover') return slide
        
        // 查找具有background imageType的图片元素
        const updatedElements = slide.elements.map(el => {
          if (el.type === 'image' && (el as PPTImageElement).imageType === 'background') {
            return {
              ...el,
              src: result.image_url,
              isPlaceholder: false,
              generatePrompt: regeneratePrompt.value.trim(),
              workflow_id: workflow_id.value // 使用当前的workflow_id
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

    message.success('图片重新生成成功')
  } 
  catch (error) {
    console.error('重新生成图片失败:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    message.error(`重新生成图片失败: ${errorMessage}`)
  } 
  finally {
    isRegenerating.value = false
  }
}
</script>

<style lang="scss" scoped>
.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.switch-wrapper {
  text-align: right;
}
.origin-image {
  height: 100px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-color: $lightGray;
  margin-bottom: 10px;
}
.full-width-btn {
  width: 100%;
  margin-bottom: 10px;
}
.btn-icon {
  margin-right: 3px;
}

.clip {
  width: 260px;
  font-size: 12px;

  .title {
    margin-bottom: 5px;
  }
}
.shape-clip {
  margin-bottom: 10px;

  @include flex-grid-layout();
}
.shape-clip-item {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  @include flex-grid-layout-children(5, 16%);

  &:hover .shape {
    background-color: #ccc;
  }

  .shape {
    width: 40px;
    height: 40px;
    background-color: #e1e1e1;
  }
}
.popover-btn {
  padding: 0 3px;
}

.regenerate-input-wrapper {
  margin: 16px 0;
}

.input-label {
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.regenerate-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  }
  
  &::placeholder {
    color: #c0c4cc;
  }
}
</style>