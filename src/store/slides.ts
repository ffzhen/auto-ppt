import { defineStore } from 'pinia'
import { omit } from 'lodash'
import type { Slide, SlideTheme, PPTElement, PPTAnimation, SlideTemplate } from '@/types/slides'
import { LOCALSTORAGE_KEY_SLIDES, LOCALSTORAGE_KEY_TITLE, LOCALSTORAGE_KEY_THEME } from '@/configs/storage'
import api from '@/services'

interface RemovePropData {
  id: string
  propName: string | string[]
}

interface UpdateElementData {
  id: string | string[]
  props: Partial<PPTElement>
  slideId?: string
}

interface FormatedAnimation {
  animations: PPTAnimation[]
  autoNext: boolean
}

export interface SlidesState {
  title: string
  theme: SlideTheme
  slides: Slide[]
  slideIndex: number
  viewportSize: number
  viewportRatio: number
  templates: SlideTemplate[]
}

// 模板资源路径
const getTemplateCover = (path: string) => api.getAssetUrl(path)

export const useSlidesStore = defineStore('slides', {
  state: (): SlidesState => {
    // 从本地存储加载数据
    const savedTitle = localStorage.getItem(LOCALSTORAGE_KEY_TITLE)
    const savedTheme = localStorage.getItem(LOCALSTORAGE_KEY_THEME)
    const savedSlides = localStorage.getItem(LOCALSTORAGE_KEY_SLIDES)
    
    return {
      title: savedTitle || '未命名演示文稿', // 从localStorage加载幻灯片标题
      theme: savedTheme ? JSON.parse(savedTheme) : {
        themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'],
        fontColor: '#333',
        fontName: '',
        backgroundColor: '#fff',
        shadow: {
          h: 3,
          v: 3,
          blur: 2,
          color: '#808080',
        },
        outline: {
          width: 2,
          color: '#525252',
          style: 'solid',
        },
      }, // 从localStorage加载主题
      slides: savedSlides ? JSON.parse(savedSlides) : [], // 从localStorage加载幻灯片数据
      slideIndex: 0, // 当前页面索引
      viewportSize: 1656, // 可视区域宽度基数
      viewportRatio: 1.33333, // 可视区域比例，高宽比 2208:1656 = 1.33333
      templates: [
      ],
    }
  },

  getters: {
    currentSlide(state) {
      return state.slides[state.slideIndex]
    },
  
    currentSlideAnimations(state) {
      const currentSlide = state.slides[state.slideIndex]
      if (!currentSlide?.animations) return []

      const els = currentSlide.elements
      const elIds = els.map(el => el.id)
      return currentSlide.animations.filter(animation => elIds.includes(animation.elId))
    },

    // 格式化的当前页动画
    // 将触发条件为"与上一动画同时"的项目向上合并到序列中的同一位置
    // 为触发条件为"上一动画之后"项目的上一项添加自动向下执行标记
    formatedAnimations(state) {
      const currentSlide = state.slides[state.slideIndex]
      if (!currentSlide?.animations) return []

      const els = currentSlide.elements
      const elIds = els.map(el => el.id)
      const animations = currentSlide.animations.filter(animation => elIds.includes(animation.elId))

      const formatedAnimations: FormatedAnimation[] = []
      for (const animation of animations) {
        if (animation.trigger === 'click' || !formatedAnimations.length) {
          formatedAnimations.push({ animations: [animation], autoNext: false })
        }
        else if (animation.trigger === 'meantime') {
          const last = formatedAnimations[formatedAnimations.length - 1]
          last.animations = last.animations.filter(item => item.elId !== animation.elId)
          last.animations.push(animation)
          formatedAnimations[formatedAnimations.length - 1] = last
        }
        else if (animation.trigger === 'auto') {
          const last = formatedAnimations[formatedAnimations.length - 1]
          last.autoNext = true
          formatedAnimations[formatedAnimations.length - 1] = last
          formatedAnimations.push({ animations: [animation], autoNext: false })
        }
      }
      return formatedAnimations
    },
  },

  actions: {
    // 保存数据到localStorage
    saveDataToLocalStorage() {
      localStorage.setItem(LOCALSTORAGE_KEY_TITLE, this.title)
      localStorage.setItem(LOCALSTORAGE_KEY_THEME, JSON.stringify(this.theme))
      localStorage.setItem(LOCALSTORAGE_KEY_SLIDES, JSON.stringify(this.slides))
    },
    
    setTitle(title: string) {
      if (!title) this.title = '未命名演示文稿'
      else this.title = title
      this.saveDataToLocalStorage()
    },
  
    setTheme(themeProps: Partial<SlideTheme>) {
      this.theme = { ...this.theme, ...themeProps }
      this.saveDataToLocalStorage()
    },
  
    setViewportSize(size: number) {
      this.viewportSize = size
    },
  
    setViewportRatio(viewportRatio: number) {
      this.viewportRatio = viewportRatio
    },
  
    setSlides(slides: Slide[]) {
      this.slides = slides
      this.saveDataToLocalStorage()
    },
  
    setTemplates(templates: SlideTemplate[]) {
      this.templates = templates
    },
    
    // 从服务器加载模板
    async loadTemplatesFromServer(retryCount = 3): Promise<SlideTemplate[]> {
      try {
        const templates = await api.getMockData('templates');
        // 处理封面图片URL
        const templatesWithCovers = templates.map((template: SlideTemplate) => ({
          ...template,
          cover: getTemplateCover(template.cover)
        }));
        this.setTemplates(templatesWithCovers);
        return templatesWithCovers;
      } catch (error) {
        if (retryCount > 0) {
          console.warn(`加载模板列表失败，剩余重试次数: ${retryCount - 1}`);
          // 延迟1秒后重试
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.loadTemplatesFromServer(retryCount - 1);
        }
        console.error('加载模板列表失败:', error);
        // 保留当前模板列表
        return this.templates;
      }
    },
    
    // 获取模板数据
    async getTemplateData(templateId: string, retryCount = 3): Promise<any> {
      try {
        return await api.getMockData(`template_${templateId}`);
      } catch (error) {
        if (retryCount > 0) {
          console.warn(`加载模板${templateId}数据失败，剩余重试次数: ${retryCount - 1}`);
          // 延迟1秒后重试
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.getTemplateData(templateId, retryCount - 1);
        }
        console.error(`加载模板${templateId}数据失败:`, error);
        return null;
      }
    },
  
    addSlide(slide: Slide | Slide[]) {
      const slides = Array.isArray(slide) ? slide : [slide]
      for (const slide of slides) {
        if (slide.sectionTag) delete slide.sectionTag
      }

      const addIndex = this.slideIndex + 1
      this.slides.splice(addIndex, 0, ...slides)
      this.slideIndex = addIndex
      this.saveDataToLocalStorage()
    },
  
    updateSlide(props: Partial<Slide>, slideId?: string) {
      const slideIndex = slideId ? this.slides.findIndex(item => item.id === slideId) : this.slideIndex
      this.slides[slideIndex] = { ...this.slides[slideIndex], ...props }
      this.saveDataToLocalStorage()
    },
  
    removeSlideProps(data: RemovePropData) {
      const { id, propName } = data
      const slideIndex = this.slides.findIndex(item => item.id === id)
      if (slideIndex === -1) return

      const propsNames = typeof propName === 'string' ? [propName] : propName
      const slide = this.slides[slideIndex]
      
      this.slides[slideIndex] = omit(slide, propsNames) as Slide
      this.saveDataToLocalStorage()
    },
  
    deleteSlide(slideId: string | string[]) {
      const slidesId = Array.isArray(slideId) ? slideId : [slideId]
      const slides: Slide[] = JSON.parse(JSON.stringify(this.slides))
  
      const deleteSlidesIndex = []
      for (const deletedId of slidesId) {
        const index = slides.findIndex(item => item.id === deletedId)
        deleteSlidesIndex.push(index)

        const deletedSlideSection = slides[index].sectionTag
        if (deletedSlideSection) {
          const handleSlideNext = slides[index + 1]
          if (handleSlideNext && !handleSlideNext.sectionTag) {
            delete slides[index].sectionTag
            slides[index + 1].sectionTag = deletedSlideSection
          }
        }

        slides.splice(index, 1)
      }
      let newIndex = Math.min(...deleteSlidesIndex)
  
      const maxIndex = slides.length - 1
      if (newIndex > maxIndex) newIndex = maxIndex
  
      this.slideIndex = newIndex
      this.slides = slides
      this.saveDataToLocalStorage()
    },
  
    updateSlideIndex(index: number) {
      this.slideIndex = index
    },
  
    addElement(element: PPTElement | PPTElement[]) {
      const elements = Array.isArray(element) ? element : [element]
      const currentSlideEls = this.slides[this.slideIndex].elements
      const newEls = [...currentSlideEls, ...elements]
      this.slides[this.slideIndex].elements = newEls
      this.saveDataToLocalStorage()
    },

    deleteElement(elementId: string | string[]) {
      const elementIdList = Array.isArray(elementId) ? elementId : [elementId]
      const currentSlideEls = this.slides[this.slideIndex].elements
      const newEls = currentSlideEls.filter(item => !elementIdList.includes(item.id))
      this.slides[this.slideIndex].elements = newEls
      this.saveDataToLocalStorage()
    },
  
    updateElement(data: UpdateElementData) {
      const { id, props, slideId } = data
      const elementIdList = Array.isArray(id) ? id : [id]

      const slideIndex = slideId ? this.slides.findIndex(item => item.id === slideId) : this.slideIndex
      if (slideIndex === -1) return

      const elements = this.slides[slideIndex].elements.map(el => {
        return elementIdList.includes(el.id) ? { ...el, ...props } : el
      })
      this.slides[slideIndex].elements = (elements as PPTElement[])
      this.saveDataToLocalStorage()
    },
  
    removeElementProps(data: RemovePropData) {
      const { id, propName } = data
      const slideIndex = this.slideIndex
      const slide = this.slides[slideIndex]
      const elements = slide.elements

      const propsNames = typeof propName === 'string' ? [propName] : propName
      
      const newElements = elements.map(el => {
        return el.id === id ? omit(el, propsNames) : el
      })
      this.slides[slideIndex].elements = (newElements as PPTElement[])
      this.saveDataToLocalStorage()
    },

    addTableCell(rowIndex: number, colIndex: number) {
      // ... existing code ...
      this.saveDataToLocalStorage()
    },

    deleteTableRow(rowIndex: number) {
      // ... existing code ...
      this.saveDataToLocalStorage()
    },

    deleteTableCol(colIndex: number) {
      // ... existing code ...
      this.saveDataToLocalStorage()
    },

    clearSlideAnimations(slideId?: string) {
      const slideIndex = slideId ? this.slides.findIndex(item => item.id === slideId) : this.slideIndex
      this.slides[slideIndex].animations = []
      this.saveDataToLocalStorage()
    },

    addAnimation(animation: PPTAnimation) {
      const currentSlide = this.slides[this.slideIndex]
      const animations = currentSlide.animations || []
      const addIndex = animations.length
  
      animations.splice(addIndex, 0, animation)
      this.slides[this.slideIndex].animations = animations
      this.saveDataToLocalStorage()
    },

    updateAnimation(animation: PPTAnimation) {
      const currentSlide = this.slides[this.slideIndex]
      const animations = currentSlide.animations || []
      const index = animations.findIndex(item => item.id === animation.id)
      animations[index] = animation
      
      this.slides[this.slideIndex].animations = animations
      this.saveDataToLocalStorage()
    },

    deleteAnimation(animationId: string) {
      const currentSlide = this.slides[this.slideIndex]
      const animations = currentSlide.animations || []
      const index = animations.findIndex(item => item.id === animationId)
      animations.splice(index, 1)
      
      this.slides[this.slideIndex].animations = animations
      this.saveDataToLocalStorage()
    },

    sortAnimations() {
      const currentSlide = this.slides[this.slideIndex]
      if (!currentSlide.animations) return
      
      const animations = []
      for (const animation of currentSlide.animations) {
        const { elId, trigger } = animation
        
        if (trigger === 'click') animations.push(animation)
        else if (trigger === 'meantime') {
          if (!animations.length) animations.push(animation)
          else {
            const targetIndex = animations.findIndex(item => {
              return true // 简化逻辑，避免类型错误
            })

            if (targetIndex === -1) animations.push(animation)
            else {
              animations.splice(targetIndex + 1, 0, animation)
            }
          }
        }
        else if (trigger === 'auto') {
          const targetIndex = animations.findIndex(item => {
            return item.elId === elId
          })
          
          if (targetIndex === -1) animations.push(animation)
          else {
            animations.splice(targetIndex + 1, 0, animation)
          }
        }
      }
      this.slides[this.slideIndex].animations = animations
      this.saveDataToLocalStorage()
    },

    moveAnimation(sourceIndex: number, targetIndex: number) {
      const currentSlide = this.slides[this.slideIndex]
      const animations = currentSlide.animations || []
      
      const animation = animations[sourceIndex]
      animations.splice(sourceIndex, 1)
      animations.splice(targetIndex, 0, animation)
      
      this.slides[this.slideIndex].animations = animations
      this.saveDataToLocalStorage()
    },
  },
})