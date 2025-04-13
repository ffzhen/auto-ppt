import { Request } from 'express';

// Slide types based on the client types
export interface SlideTheme {
  themeColors: string[];
  fontColor: string;
  fontName: string;
  backgroundColor: string;
  shadow: {
    h: number;
    v: number;
    blur: number;
    color: string;
  };
  outline: {
    width: number;
    color: string;
    style: string;
  };
}

export interface PPTElement {
  id: string;
  type: string;
  name?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  [key: string]: any;
}

export interface PPTAnimation {
  id: string;
  elId: string;
  type: string;
  duration: number;
  trigger: 'click' | 'meantime' | 'auto';
  [key: string]: any;
}

export interface Slide {
  id: string;
  elements: PPTElement[];
  animations?: PPTAnimation[];
  background?: {
    type: string;
    color?: string;
    image?: string;
    imageSize?: string;
    gradientType?: string;
    gradientColor?: string[];
  };
  sectionTag?: string;
}

export interface PresentationData {
  id: string;
  title: string;
  slides: Slide[];
  theme: SlideTheme;
  viewportRatio: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePresentationDto {
  title?: string;
  viewportRatio?: number;
  theme?: Partial<SlideTheme>;
}

export interface UpdatePresentationDto {
  title?: string;
  slides?: Slide[];
  theme?: Partial<SlideTheme>;
  viewportRatio?: number;
}

export interface RequestWithPresentation extends Request {
  presentation?: PresentationData;
} 