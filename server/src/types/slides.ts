export interface SlideElement {
  id: string
  type: 'text' | 'image' | 'shape'
  left: number
  top: number
  width: number
  height: number
  rotate?: number
  content?: string
  defaultColor?: string
  defaultFontName?: string
}

export interface SlideBackground {
  type: 'solid' | 'image' | 'gradient'
  color?: string
  image?: string
  gradient?: string
}

export interface Slide {
  id: string
  elements: SlideElement[]
  background?: SlideBackground
} 