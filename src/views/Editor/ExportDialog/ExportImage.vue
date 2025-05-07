<template>
  <div class="export-img-dialog">
    <div class="thumbnails-view">
      <div class="thumbnails" ref="imageThumbnailsRef">
        <ThumbnailSlide 
          class="thumbnail" 
          v-for="slide in renderSlides" 
          :key="slide.id" 
          :slide="slide" 
          :size="1600" 
        />
      </div>
    </div>
    <div class="configs">
      <div class="row">
        <div class="title">导出格式：</div>
        <RadioGroup
          class="config-item"
          v-model:value="format"
        >
          <RadioButton style="width: 50%;" value="jpeg">JPEG</RadioButton>
          <RadioButton style="width: 50%;" value="png">PNG</RadioButton>
        </RadioGroup>
      </div>
      <div class="row">
        <div class="title">导出范围：</div>
        <RadioGroup
          class="config-item"
          v-model:value="rangeType"
        >
         <RadioButton style="width: 25%;" value="separate">逐页</RadioButton>
          <RadioButton style="width: 25%;" value="all">全部</RadioButton>
          <RadioButton style="width: 25%;" value="current">当前页</RadioButton>
          <RadioButton style="width: 25%;" value="custom">自定义</RadioButton>
        </RadioGroup>
      </div>
      <div class="row" v-if="rangeType === 'custom'">
        <div class="title">选择方式：</div>
        <RadioGroup
          class="config-item"
          v-model:value="customSelectionType"
        >
          <RadioButton style="width: 50%;" value="range">连续范围</RadioButton>
          <RadioButton style="width: 50%;" value="individual">自由选择</RadioButton>
        </RadioGroup>
      </div>
      <div class="row" v-if="rangeType === 'custom' && customSelectionType === 'range'">
        <div class="title" :data-range="`（${range[0]} ~ ${range[1]}）`">范围选择：</div>
        <Slider
          class="config-item"
          range
          :min="1"
          :max="slides.length"
          :step="1"
          v-model:value="range"
        />
      </div>
      <div class="row custom-slides-selector" v-if="rangeType === 'custom' && customSelectionType === 'individual'">
        <div class="title">幻灯片选择：</div>
        <div class="config-item slides-checkbox-container">
          <div class="slides-checkbox-grid">
            <div 
              v-for="(slide, index) in slides" 
              :key="slide.id"
              class="slide-checkbox-item"
            >
              <Checkbox 
                :value="selectedSlideIds.includes(slide.id)"
                @change="toggleSlideSelection(slide.id)"
              >
                <div class="slide-number-label">
                  {{ index + 1 }}
                </div>
              </Checkbox>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="title">图片质量：</div>
        <Slider
          class="config-item"
          :min="0"
          :max="1"
          :step="0.1"
          v-model:value="quality"
        />
      </div>

      <!-- <div class="row">
        <div class="title">忽略在线字体：</div>
        <div class="config-item">
          <Switch v-model:value="ignoreWebfont" v-tooltip="'导出时默认忽略在线字体，若您在幻灯片中使用了在线字体，且希望导出后保留相关样式，可选择关闭【忽略在线字体】选项，但要注意这将会增加导出用时。'" />
        </div>
      </div> -->
    </div>

    <div class="btns">
      <div class="btn-group">
        <!-- <Button class="btn export" type="primary" @click="expImage()">导出图片</Button> -->
        <Button class="btn export-zip" type="primary" @click="expZipImage()">导出图片压缩包</Button>
      </div>
      <Button class="btn close" @click="emit('close')">关闭</Button>
    </div>

    <FullscreenSpin :loading="exporting" tip="正在导出..." />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import Switch from '@/components/Switch.vue'
import Slider from '@/components/Slider.vue'
import Button from '@/components/Button.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import Checkbox from '@/components/Checkbox.vue'

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'export-complete', images: string[]): void
}>()

const { slides, currentSlide } = storeToRefs(useSlidesStore())

const imageThumbnailsRef = ref<HTMLElement>()
const rangeType = ref<'all' | 'current' | 'custom' | 'separate'>('separate')
const range = ref<[number, number]>([1, slides.value.length])
const format = ref<'jpeg' | 'png'>('jpeg')
const quality = ref(1)
const ignoreWebfont = ref(false)
const selectedSlideIds = ref<string[]>([])
const customSelectionType = ref<'range' | 'individual'>('range')

const renderSlides = computed(() => {
  if (rangeType.value === 'all') return slides.value
  if (rangeType.value === 'current') return [currentSlide.value]
  if (rangeType.value === 'custom') {
    if (selectedSlideIds.value.length === 0) {
      return slides.value.filter((item, index) => {
        const [min, max] = range.value
        return index >= min - 1 && index <= max - 1
      })
    }
    
    return slides.value.filter(slide => selectedSlideIds.value.includes(slide.id))
  }
  return slides.value
})

const { exportImage, exportSingleImage, exportZippedImages, exporting } = useExport()

const expImage = () => {
  if (!imageThumbnailsRef.value) return
  
  if (rangeType.value === 'separate') {
    // 逐页导出，每页单独生成一个图片文件
    const slidesToExport = renderSlides.value
    exportSingleImage(imageThumbnailsRef.value, slidesToExport, format.value, quality.value, ignoreWebfont.value)
    return
  }
  
  // 普通导出，所有页面合并为一个图片文件
  exportImage(imageThumbnailsRef.value, format.value, quality.value, ignoreWebfont.value)
}

// 导出图片压缩包
const expZipImage = () => {
  if (!imageThumbnailsRef.value) return
  
  // 导出所有幻灯片为PNG格式，并打包为ZIP
  exportZippedImages(
    imageThumbnailsRef.value,
    renderSlides.value,
    'png',
    quality.value,
    ignoreWebfont.value
  )
}

// 导出图片并返回数据URLs（用于小红书发布）
const exportImagesForXHS = () => {
  if (!imageThumbnailsRef.value) return []
  
  // 创建一个Promise来获取图片数据
  return new Promise<string[]>((resolve) => {
    const originalCreateObjectURL = URL.createObjectURL
    const imageUrls: string[] = []
    const totalSlides = renderSlides.value.length
    
    // 替换URL.createObjectURL以捕获图片数据
    URL.createObjectURL = (blob: Blob) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          imageUrls.push(reader.result.toString())
        }
        
        // 检查是否所有图片都已处理
        if (imageUrls.length === totalSlides) {
          // 恢复原始函数
          URL.createObjectURL = originalCreateObjectURL
          
          // 返回结果
          if (imageUrls.length === 0) {
            URL.createObjectURL = originalCreateObjectURL
            const placeholder = ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==']
            resolve(placeholder)
            emit('export-complete', placeholder)
            return
          }
          
          if (imageUrls.length < totalSlides) {
            URL.createObjectURL = originalCreateObjectURL
            resolve(imageUrls)
            emit('export-complete', imageUrls)
          }
        }
      }
      reader.readAsDataURL(blob)
      
      // 返回临时URL
      return originalCreateObjectURL(blob)
    }
    
    // 使用现有导出功能
    if (imageThumbnailsRef.value) {
      exportSingleImage(
        imageThumbnailsRef.value,
        renderSlides.value,
        'png',
        quality.value,
        ignoreWebfont.value
      )
    }
    
    // 防止永久挂起
    setTimeout(() => {
      if (imageUrls.length === 0) {
        URL.createObjectURL = originalCreateObjectURL
        const placeholder = ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==']
        resolve(placeholder)
        emit('export-complete', placeholder)
        return
      }
      
      if (imageUrls.length < totalSlides) {
        URL.createObjectURL = originalCreateObjectURL
        resolve(imageUrls)
        emit('export-complete', imageUrls)
      }
    }, 10000)
  })
}

const toggleSlideSelection = (id: string) => {
  if (selectedSlideIds.value.includes(id)) {
    selectedSlideIds.value = selectedSlideIds.value.filter((i) => i !== id)
    return
  }
  
  selectedSlideIds.value.push(id)
}

// 监听自定义事件
onMounted(() => {
  // 创建一个全局事件，可以从外部触发导出
  window.addEventListener('trigger-xhs-export', async (event: any) => {
    console.log('Received trigger-xhs-export event')
    const images = await exportImagesForXHS()
    
    // 如果事件有回调，调用它
    if (event.detail && typeof event.detail.callback === 'function') {
      event.detail.callback(images)
    }
  })
})

// 暴露给外部使用
defineExpose({
  exportImagesForXHS
})
</script>

<style lang="scss" scoped>
.export-img-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.thumbnails-view {
  @include absolute-0();

  &::after {
    content: '';
    background-color: #fff;
    @include absolute-0();
  }
}
.configs {
  width: 450px;
  height: calc(100% - 100px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1;

  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
  }

  .title {
    width: 100px;
    position: relative;

    &::after {
      content: attr(data-range);
      position: absolute;
      top: 20px;
      left: 0;
    }
  }
  .config-item {
    flex: 2;
  }
}
.btns {
  width: 300px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;

  .btn-group {
    flex: 1;
    display: flex;
    
    .export, .export-zip {
      flex: 1;
    }
    
    .export-zip {
      margin-left: 10px;
    }
  }
  .close {
    width: 100px;
    margin-left: 10px;
  }
}

// 添加复选框选择器的样式
.custom-slides-selector {
  margin-bottom: 10px;
}

.slides-checkbox-container {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
}

.slides-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
}

.slide-checkbox-item {
  text-align: center;
}

.slide-number-label {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  background-color: #f5f7fa;
  color: #606266;
  transition: all 0.2s;
  margin: 0 auto;
  border: 2px solid transparent;
}

:deep(.el-checkbox.is-checked) .slide-number-label {
  background-color: #ecf5ff;
  color: #409eff;
  border-color: #409eff;
}

:deep(.el-checkbox:hover) .slide-number-label {
  border-color: #c0c4cc;
}
</style>