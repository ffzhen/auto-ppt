import type { Slide, SlideTheme } from '@/types/slides'

const DB_NAME = 'PPTIST_DB'
const DB_VERSION = 1
const STORE_NAME = 'slides'

interface DBData {
  title: string
  theme: SlideTheme
  slides: Slide[]
}

class IndexedDBService {
  private db: IDBDatabase | null = null

  initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open database')
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
    })
  }

  private serializeData(data: DBData): string {
    try {
      // 移除可能包含循环引用的属性
      const cleanData = {
        title: data.title,
        theme: {
          ...data.theme,
          // 确保没有函数或特殊对象
          shadow: { ...data.theme.shadow },
          outline: { ...data.theme.outline }
        },
        slides: data.slides.map(slide => ({
          ...slide,
          elements: slide.elements.map(el => ({
            ...el,
            // 移除可能包含循环引用的属性
            groupId: el.groupId,
            // 确保动画数据可以被序列化
            animations: el.animations?.map(anim => ({
              ...anim,
              elId: anim.elId
            }))
          }))
        }))
      }
      return JSON.stringify(cleanData)
    } catch (error) {
      console.error('Failed to serialize data:', error)
      throw error
    }
  }

  private deserializeData(serialized: string): DBData {
    try {
      return JSON.parse(serialized)
    } catch (error) {
      console.error('Failed to deserialize data:', error)
      throw error
    }
  }

  async saveData(data: DBData): Promise<void> {
    if (!this.db) await this.initDB()
    
    return new Promise((resolve, reject) => {
      try {
        const serialized = this.serializeData(data)
        const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(serialized, 'current')

        request.onerror = () => {
          console.error('Failed to save data')
          reject(request.error)
        }

        request.onsuccess = () => resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  async getData(): Promise<DBData | null> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get('current')

      request.onerror = () => {
        console.error('Failed to get data')
        reject(request.error)
      }

      request.onsuccess = () => {
        try {
          const result = request.result
          if (!result) {
            resolve(null)
            return
          }
          const data = this.deserializeData(result)
          resolve(data)
        } catch (error) {
          console.error('Failed to deserialize data:', error)
          reject(error)
        }
      }
    })
  }

  async clearData(): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onerror = () => {
        console.error('Failed to clear data')
        reject(request.error)
      }

      request.onsuccess = () => resolve()
    })
  }
}

export const indexedDBService = new IndexedDBService() 