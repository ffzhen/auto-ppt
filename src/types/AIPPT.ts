export interface AIPPTCover {
  type: 'cover'
  data: {
    title: string
    text: string
  }
}

export interface AIPPTContents {
  type: 'contents'
  data: {
    items: string[]
  }
  offset?: number
}

export interface AIPPTTransition {
  type: 'transition'
  data: {
    title: string
    text: string
  }
}

export interface AIPPTContent {
  type: 'content'
  data: {
    title?: string
    header?: string
    footer?: string
    html?: boolean
    content?: string
    items?: {
      title: string
      text: string
    }[]
  }
  offset?: number
}

export interface AIPPTEnd {
  type: 'end'
  data?: {
    content?: string
    title?: string
  }
}

export type AIPPTSlide = AIPPTCover | AIPPTContents | AIPPTTransition | AIPPTContent | AIPPTEnd