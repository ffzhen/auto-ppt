import { defineStore } from 'pinia'
import { omit } from 'lodash'
import type { Slide, SlideTheme, PPTElement, PPTAnimation, SlideTemplate } from '@/types/slides'
import { indexedDBService } from '@/services/indexedDB'
import api from '@/services'
import message from '@/utils/message'
import { useProjectStore } from './projects'

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

// 模板缓存接口
interface TemplateCache {
  id: string
  data: any
  version: string
  lastUpdated: number
}

interface TemplateMeta {
  id: string
  name: string
  description?: string
  cover: string
  version: string
  size: number
  lastUpdated: number
}

export interface SlidesState {
  title: string
  theme: SlideTheme
  slides: Slide[]
  slideIndex: number
  viewportSize: number
  viewportRatio: number
  templates: SlideTemplate[]
  templateMetas: TemplateMeta[] // 模板元信息
  templateCache: Map<string, any> // 内存中的模板内容缓存
}

// 模板资源路径
const getTemplateCover = (path: string) => api.getAssetUrl(path)

export const useSlidesStore = defineStore('slides', {
  state: (): SlidesState => {
    return {
      title: '未命名演示文稿',
      theme: {
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
      },
      slides: [],
      slideIndex: 0,
      viewportSize: 1656,
      viewportRatio: 1.33333,
      templates: [],
      templateMetas: [],
      templateCache: new Map(),
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
    async initFromStorage() {
      try {
        const data = await indexedDBService.getData()
        if (data) {
          this.title = data.title
          this.theme = data.theme
          this.slides = data.slides
        }
      }
      catch (error) {
        console.error('Failed to load data from IndexedDB:', error)
        message.error('加载数据失败，请刷新页面重试')
      }
    },

    async saveDataToStorage(projectId?: string) {
      try {
        if (projectId) {
          // 使用项目数据库存储
          const projectStore = useProjectStore()
          const project = await projectStore.getProject(projectId)
          
          if (project) {
            // 更新项目的slides数据
            project.slides = this.slides
            project.title = this.title
            project.theme = this.theme
            project.timestamp = Date.now()
            
            // 使用项目存储服务保存
            await projectStore.updateProject(project)
            console.log('[SlidesStore] Saved slides to project database')
          } 
          else {
            console.error('[SlidesStore] Project not found:', projectId)
            throw new Error('Project not found')
          }
        } 
        else {
          // 没有项目ID时使用原有存储方式作为备份
          console.log('[SlidesStore] No project ID provided, using legacy storage')
          await indexedDBService.saveData({
            title: this.title,
            theme: this.theme,
            slides: this.slides,
          })
        }
      }
      catch (error) {
        console.error('Failed to save data:', error)
        message.error('保存数据失败，请确保有足够的存储空间')
      }
    },

    setTitle(title: string, projectId?: string) {
      if (!title) this.title = '未命名演示文稿'
      else this.title = title
      this.saveDataToStorage(projectId)
    },
  
    setTheme(themeProps: Partial<SlideTheme>, projectId?: string) {
      this.theme = { ...this.theme, ...themeProps }
      this.saveDataToStorage(projectId)
    },
  
    setViewportSize(size: number) {
      this.viewportSize = size
    },
  
    setViewportRatio(viewportRatio: number) {
      this.viewportRatio = viewportRatio
    },
  
    setSlides(slides: Slide[], projectId?: string) {
      this.slides = slides
      this.saveDataToStorage(projectId)
    },
  
    setTemplates(templates: SlideTemplate[]) {
      this.templates = templates
    },

    setTemplateMetas(metas: TemplateMeta[]) {
      this.templateMetas = metas
    },

    // ================= 模板缓存相关方法 =================
    
    // 获取缓存数据库名称
    getTemplateCacheDBName() {
      return 'pptist-template-cache'
    },

    // 初始化模板缓存数据库
    initTemplateCacheDB(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.getTemplateCacheDBName(), 1)
        
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          
          // 模板元信息存储
          if (!db.objectStoreNames.contains('template-metas')) {
            db.createObjectStore('template-metas', { keyPath: 'id' })
          }
          
          // 模板内容存储
          if (!db.objectStoreNames.contains('template-content')) {
            db.createObjectStore('template-content', { keyPath: 'id' })
          }
        }
      })
    },

    // 从缓存加载模板列表
    async loadTemplateMetasFromCache(): Promise<TemplateMeta[]> {
      try {
        const db = await this.initTemplateCacheDB()
        const transaction = db.transaction(['template-metas'], 'readonly')
        const store = transaction.objectStore('template-metas')
        
        return new Promise((resolve, reject) => {
          const request = store.getAll()
          request.onsuccess = () => {
            const metas = request.result as TemplateMeta[]
            console.log('[TemplateCache] Loaded template metas from cache:', metas.length)
            resolve(metas)
          }
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.error('[TemplateCache] Error loading template metas from cache:', error)
        return []
      }
    },

    // 缓存模板列表
    async cacheTemplateMetas(metas: TemplateMeta[]): Promise<void> {
      try {
        const db = await this.initTemplateCacheDB()
        const transaction = db.transaction(['template-metas'], 'readwrite')
        const store = transaction.objectStore('template-metas')
        
        // 清空现有数据
        await new Promise<void>((resolve, reject) => {
          const clearRequest = store.clear()
          clearRequest.onsuccess = () => resolve()
          clearRequest.onerror = () => reject(clearRequest.error)
        })
        
        // 添加新数据
        for (const meta of metas) {
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add(meta)
            addRequest.onsuccess = () => resolve()
            addRequest.onerror = () => reject(addRequest.error)
          })
        }
        
        console.log('[TemplateCache] Cached template metas:', metas.length)
      } catch (error) {
        console.error('[TemplateCache] Error caching template metas:', error)
      }
    },

    // 从缓存获取模板内容
    async getTemplateFromCache(templateId: string): Promise<any | null> {
      try {
        // 先检查内存缓存
        if (this.templateCache.has(templateId)) {
          console.log('[TemplateCache] Found template in memory cache:', templateId)
          return this.templateCache.get(templateId)
        }

        // 从 IndexedDB 获取
        const db = await this.initTemplateCacheDB()
        const transaction = db.transaction(['template-content'], 'readonly')
        const store = transaction.objectStore('template-content')
        
        return new Promise((resolve, reject) => {
          const request = store.get(templateId)
          request.onsuccess = () => {
            const result = request.result as TemplateCache | undefined
            if (result) {
              console.log('[TemplateCache] Found template in IndexedDB cache:', templateId)
              // 加载到内存缓存
              this.templateCache.set(templateId, result.data)
              resolve(result.data)
            } else {
              console.log('[TemplateCache] Template not found in cache:', templateId)
              resolve(null)
            }
          }
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.error('[TemplateCache] Error getting template from cache:', error)
        return null
      }
    },

    // 缓存模板内容
    async cacheTemplateContent(templateId: string, data: any, version: string = '1.0.0'): Promise<void> {
      try {
        // 更新内存缓存
        this.templateCache.set(templateId, data)

        // 更新 IndexedDB 缓存
        const db = await this.initTemplateCacheDB()
        const transaction = db.transaction(['template-content'], 'readwrite')
        const store = transaction.objectStore('template-content')
        
        const cacheData: TemplateCache = {
          id: templateId,
          data,
          version,
          lastUpdated: Date.now()
        }
        
        await new Promise<void>((resolve, reject) => {
          const request = store.put(cacheData)
          request.onsuccess = () => {
            console.log('[TemplateCache] Cached template content:', templateId)
            resolve()
          }
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.error('[TemplateCache] Error caching template content:', error)
      }
    },

    // 检查缓存是否过期（24小时）
    isTemplateCacheExpired(lastUpdated: number): boolean {
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      return now - lastUpdated > twentyFourHours
    },

    // ================= 优化后的模板加载方法 =================
    
    // 智能加载模板（先缓存后网络）
    async loadTemplatesWithCache(): Promise<SlideTemplate[]> {
      console.log('[SlidesStore] Starting smart template loading...')
      
      try {
        // 1. 先尝试从缓存加载模板列表
        const cachedMetas = await this.loadTemplateMetasFromCache()
        
        if (cachedMetas.length > 0) {
          // 检查缓存是否过期
          const oldestCache = Math.min(...cachedMetas.map(m => m.lastUpdated))
          if (!this.isTemplateCacheExpired(oldestCache)) {
            console.log('[SlidesStore] Using cached template list')
            const templates = cachedMetas.map(meta => ({
              id: meta.id,
              name: meta.name,
              description: meta.description,
              cover: meta.cover
            }))
            this.setTemplates(templates)
            this.setTemplateMetas(cachedMetas)

            // 在后台对比服务端模板，如有变化则自动刷新缓存与UI（避免手动清缓存）
            ;(async () => {
              try {
                const latest = await api.getMockData('templates')
                if (Array.isArray(latest)) {
                  const cachedIds = new Set(cachedMetas.map(m => m.id))
                  const latestIds = new Set(latest.map((t: any) => t.id))

                  const idsChanged = cachedIds.size !== latestIds.size ||
                    [...latestIds].some(id => !cachedIds.has(id))

                  // 也可简单对比内容摘要（如名称、封面变更）
                  let metaChanged = false
                  if (!idsChanged) {
                    const cachedMap = new Map(cachedMetas.map(m => [m.id, m]))
                    for (const t of latest) {
                      const cm = cachedMap.get(t.id)
                      if (!cm || cm.name !== t.name || cm.cover !== t.cover) {
                        metaChanged = true
                        break
                      }
                    }
                  }

                  if (idsChanged || metaChanged) {
                    const now = Date.now()
                    const templateMetas = latest.map((t: any) => ({
                      id: t.id,
                      name: t.name,
                      description: undefined,
                      cover: t.cover,
                      version: '1.0.0',
                      size: 0,
                      lastUpdated: now
                    }))

                    await this.cacheTemplateMetas(templateMetas)
                    this.setTemplates(latest)
                    this.setTemplateMetas(templateMetas)
                    console.log('[SlidesStore] Template list updated from server (cache refreshed)')
                  }
                }
              } catch (e) {
                console.warn('[SlidesStore] Background template refresh failed:', e)
              }
            })()

            return templates
          }
          
          console.log('[SlidesStore] Template cache expired, refreshing...')
        }
        
        // 2. 缓存不存在或过期，从服务器获取
        return await this.loadTemplatesFromServer()
      } catch (error) {
        console.error('[SlidesStore] Error in smart template loading:', error)
        // 降级到基本模板列表
        return []
      }
    },

    // 从服务器加载模板列表并缓存
    async loadTemplatesFromServer(retryCount = 2): Promise<SlideTemplate[]> {
      console.log('[SlidesStore] Loading templates from server...')
      try {
        const timeoutPromise = new Promise<SlideTemplate[]>((_, reject) => {
          setTimeout(() => reject(new Error('Template loading timed out')), 3000) // 减少到3秒
        })
        
        const apiPromise = api.getMockData('templates')
          .then(async (templates) => {
            console.log('[SlidesStore] Templates data received:', templates?.length || 0, 'templates')
            
            if (!templates || !Array.isArray(templates) || templates.length === 0) {
              throw new Error('Invalid templates data received')
            }
            
            // 处理模板数据并创建元信息
            const now = Date.now()
            const templateMetas: TemplateMeta[] = templates.map((template: SlideTemplate) => ({
              id: template.id,
              name: template.name,
              description: undefined, // SlideTemplate没有description字段
              cover: template.cover,
              version: '1.0.0',
              size: 0, // 将在后台计算
              lastUpdated: now
            }))
            
            // 缓存模板元信息
            await this.cacheTemplateMetas(templateMetas)
            
            const processedTemplates = templates.map((template: SlideTemplate) => ({
              ...template,
              // cover: getTemplateCover(template.cover)
            }))
            
            this.setTemplates(processedTemplates)
            this.setTemplateMetas(templateMetas)
            
            console.log('[SlidesStore] Templates processed and cached')
            return processedTemplates
          })
        
        return await Promise.race([apiPromise, timeoutPromise])
      } 
      catch (error) {
        console.error('[SlidesStore] Error loading templates:', error)
        
        if (retryCount > 0) {
          console.warn(`[SlidesStore] Loading templates failed, retrying (${retryCount} left)`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return this.loadTemplatesFromServer(retryCount - 1)
        }
        
        console.error('[SlidesStore] Failed to load templates after all retries')
        message.error('模板加载失败，但您仍然可以使用基本功能')
        return []
      }
    },
    
    // 懒加载模板内容（按需加载）
    async getTemplateData(templateId: string, retryCount = 3): Promise<any> {
      console.log(`[SlidesStore] Getting template data: ${templateId}`)
      
      // 1. 先从缓存获取
      const cachedData = await this.getTemplateFromCache(templateId)
      if (cachedData) {
        console.log(`[SlidesStore] Template data loaded from cache: ${templateId}`)
        return cachedData
      }
      
      // 2. 从服务器加载并缓存
      try {
        console.log(`[SlidesStore] Loading template data from server: ${templateId}`)
        // 如果templateId已经包含template前缀，则直接使用；否则添加template_前缀
        const filename = templateId.startsWith('template') ? templateId : `template_${templateId}`
        const data = await api.getMockData(filename)
        
        if (data) {
          // 异步缓存，不阻塞返回
          this.cacheTemplateContent(templateId, data).catch(err => {
            console.error(`Failed to cache template ${templateId}:`, err)
          })
          
          console.log(`[SlidesStore] Template data loaded from server: ${templateId}`)
          return data
        }
        
        throw new Error('Empty template data received')
      }
      catch (error) {
        if (retryCount > 0) {
          console.warn(`加载模板${templateId}数据失败，剩余重试次数: ${retryCount - 1}`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return this.getTemplateData(templateId, retryCount - 1)
        }
        console.error(`加载模板${templateId}数据失败:`, error)
        return null
      }
    },

    // 预加载热门模板（后台任务）
    async preloadPopularTemplates() {
      console.log('[SlidesStore] Starting to preload popular templates...')
      
      // 定义热门模板ID（可以从配置或统计数据获取）
      const popularTemplateIds = ['template001', 'template002', 'template005', 'template006']
      
      // 限制并发数，避免过多网络请求
      const concurrentLimit = 2
      
      for (let i = 0; i < popularTemplateIds.length; i += concurrentLimit) {
        const batch = popularTemplateIds.slice(i, i + concurrentLimit)
        
        const promises = batch.map(async (templateId) => {
          try {
            // 检查是否已经缓存
            const cached = await this.getTemplateFromCache(templateId)
            if (!cached) {
              console.log(`[SlidesStore] Preloading template: ${templateId}`)
              await this.getTemplateData(templateId)
            }
          } catch (error) {
            console.warn(`[SlidesStore] Failed to preload template ${templateId}:`, error)
          }
        })
        
        await Promise.all(promises)
        
        // 批次间稍微延迟，避免服务器压力
        if (i + concurrentLimit < popularTemplateIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      console.log('[SlidesStore] Popular templates preloading completed')
    },
  
    addSlide(slide: Slide | Slide[], projectId?: string) {
      const slides = Array.isArray(slide) ? slide : [slide]
      for (const slide of slides) {
        if (slide.sectionTag) delete slide.sectionTag
      }

      const addIndex = this.slideIndex + 1
      this.slides.splice(addIndex, 0, ...slides)
      this.slideIndex = addIndex
      this.saveDataToStorage(projectId)
    },
  
    updateSlide(props: Partial<Slide>, slideId?: string, projectId?: string) {
      const slideIndex = slideId ? this.slides.findIndex(item => item.id === slideId) : this.slideIndex
      this.slides[slideIndex] = { ...this.slides[slideIndex], ...props }
      this.saveDataToStorage(projectId)
    },
  
    removeSlideProps(data: RemovePropData) {
      const { id, propName } = data
      const slideIndex = this.slides.findIndex(item => item.id === id)
      if (slideIndex === -1) return

      const propsNames = typeof propName === 'string' ? [propName] : propName
      const slide = this.slides[slideIndex]
      
      this.slides[slideIndex] = omit(slide, propsNames) as Slide
      this.saveDataToStorage()
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
      this.saveDataToStorage()
    },
  
    updateSlideIndex(index: number) {
      this.slideIndex = index
    },
  
    addElement(element: PPTElement | PPTElement[]) {
      const elements = Array.isArray(element) ? element : [element]
      const currentSlideEls = this.slides[this.slideIndex].elements
      const newEls = [...currentSlideEls, ...elements]
      this.slides[this.slideIndex].elements = newEls
      this.saveDataToStorage()
    },

    deleteElement(elementId: string | string[]) {
      const elementIdList = Array.isArray(elementId) ? elementId : [elementId]
      const currentSlideEls = this.slides[this.slideIndex].elements
      const newEls = currentSlideEls.filter(item => !elementIdList.includes(item.id))
      this.slides[this.slideIndex].elements = newEls
      this.saveDataToStorage()
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
      this.saveDataToStorage()
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
      this.saveDataToStorage()
    },

    addTableCell(rowIndex: number, colIndex: number) {
      // ... existing code ...
      this.saveDataToStorage()
    },

    deleteTableRow(rowIndex: number) {
      // ... existing code ...
      this.saveDataToStorage()
    },

    deleteTableCol(colIndex: number) {
      // ... existing code ...
      this.saveDataToStorage()
    },

    clearSlideAnimations(slideId?: string) {
      const slideIndex = slideId ? this.slides.findIndex(item => item.id === slideId) : this.slideIndex
      this.slides[slideIndex].animations = []
      this.saveDataToStorage()
    },

    addAnimation(animation: PPTAnimation) {
      const currentSlide = this.slides[this.slideIndex]
      const animations = currentSlide.animations || []
      const addIndex = animations.length
  
      animations.splice(addIndex, 0, animation)
      this.slides[this.slideIndex].animations = animations
      this.saveDataToStorage()
    },

    updateAnimation(animation: PPTAnimation) {
      const currentSlide = this.slides[this.slideIndex]
      const animations = currentSlide.animations || []
      const index = animations.findIndex(item => item.id === animation.id)
      animations[index] = animation
      
      this.slides[this.slideIndex].animations = animations
      this.saveDataToStorage()
    },

    deleteAnimation(animationId: string) {
      const currentSlide = this.slides[this.slideIndex]
      const animations = currentSlide.animations || []
      const index = animations.findIndex(item => item.id === animationId)
      animations.splice(index, 1)
      
      this.slides[this.slideIndex].animations = animations
      this.saveDataToStorage()
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
      this.saveDataToStorage()
    },

    moveAnimation(sourceIndex: number, targetIndex: number) {
      const currentSlide = this.slides[this.slideIndex]
      const animations = currentSlide.animations || []
      
      const animation = animations[sourceIndex]
      animations.splice(sourceIndex, 1)
      animations.splice(targetIndex, 0, animation)
      
      this.slides[this.slideIndex].animations = animations
      this.saveDataToStorage()
    },
  },
})