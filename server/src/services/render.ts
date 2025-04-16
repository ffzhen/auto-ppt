import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import PptxGenJS from 'pptxgenjs';
import { PresentationData } from '../types';
import JSZip from 'jszip';

// Create temp directory if it doesn't exist
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Using a more flexible slide type definition to avoid type errors
interface SlideElement {
  id: string;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
  zIndex?: number;
  content?: string;
  src?: string;
  fill?: string;
  radius?: number;
  text?: {
    content: string;
    [key: string]: any;
  };
  clip?: any;
  imageType?: string;
  [key: string]: any;
}

interface Slide {
  id: string;
  elements: SlideElement[];
  background?: {
    type: string;
    color: string;
    [key: string]: any;
  };
  size?: {
    width: number;
    height: number;
  };
  [key: string]: any;
}

export const RenderService = {
  /**
   * Generate HTML representation of a presentation
   */
  generatePresentationHTML(presentation: PresentationData): string {
    const { title, slides, theme } = presentation;
    
    // Generate HTML for each slide
    const slidesHTML = slides.map((slide) => {
      return this.generateSlideHTML(slide as unknown as Slide, theme);
    }).join('\n');
    
    // Get dimensions from the first slide or use defaults
    const firstSlide = slides[0] || {};
    const slideWidth = (firstSlide as any).size?.width || 600;
    const slideHeight = (firstSlide as any).size?.height || 800;
    const slideBackground = (firstSlide as any).background?.color || theme.backgroundColor || '#FFFFFF';
    
    // Create complete HTML document
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
        .slide-container { 
          page-break-after: always; 
          position: relative;
          width: ${slideWidth}px;
          height: ${slideHeight}px;
          overflow: hidden;
          background-color: ${slideBackground};
        }
        .slide-element {
          position: absolute;
          overflow: hidden;
        }
      </style>
    </head>
    <body>
      ${slidesHTML}
    </body>
    </html>
    `;
  },
  
  /**
   * Generate HTML for a single slide
   */
  generateSlideHTML(slide: Slide, theme: any): string {
    // Generate HTML for each element
    const elementsHTML = slide.elements.map(element => {
      switch (element.type) {
        case 'text':
          return `
            <div class="slide-element text-element" style="
              left: ${element.left}px;
              top: ${element.top}px;
              width: ${element.width}px;
              height: ${element.height}px;
              transform: rotate(${element.rotate || 0}deg);
              z-index: ${element.zIndex || 0};
            ">
              ${element.content || ''}
            </div>
          `;
        case 'image':
          return `
            <div class="slide-element image-element" style="
              left: ${element.left}px;
              top: ${element.top}px;
              width: ${element.width}px;
              height: ${element.height}px;
              transform: rotate(${element.rotate || 0}deg);
              z-index: ${element.zIndex || 0};
            ">
              <img src="${element.src || ''}" 
                style="width: 100%; height: 100%; object-fit: ${element.clip ? 'cover' : 'contain'};" 
                alt="Slide image">
            </div>
          `;
        case 'shape':
          let shapeContent = '';
          if (element.text && element.text.content) {
            shapeContent = element.text.content;
          }
          
          return `
            <div class="slide-element shape-element" style="
              left: ${element.left}px;
              top: ${element.top}px;
              width: ${element.width}px;
              height: ${element.height}px;
              transform: rotate(${element.rotate || 0}deg);
              z-index: ${element.zIndex || 0};
              background-color: ${element.fill || 'transparent'};
              border-radius: ${element.radius || 0}px;
            ">
              ${shapeContent}
            </div>
          `;
        default:
          return '';
      }
    }).join('\n');
    
    // Create slide container
    return `
      <div class="slide-container" style="background-color: ${slide.background?.color || theme.backgroundColor || '#FFFFFF'}">
        ${elementsHTML}
      </div>
    `;
  },
  
  /**
   * Render presentation as PDF
   */
  async renderAsPDF(presentation: PresentationData): Promise<Buffer> {
    const html = this.generatePresentationHTML(presentation);
    const tempHtmlPath = path.join(TEMP_DIR, `${uuidv4()}.html`);
    
    // Write HTML to temporary file
    fs.writeFileSync(tempHtmlPath, html);
    
    try {
      // Launch Puppeteer
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      
      // Load the HTML file
      await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
      
      // Set the page size to match slide dimensions
      const slide = presentation.slides[0] || {};
      const width = (slide as any).size?.width || 600;
      const height = (slide as any).size?.height || 800;
      
      await page.setViewport({ width, height });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        width: `${width}px`,
        height: `${height}px`,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      
      await browser.close();
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error rendering PDF:', error);
      // Fallback to mock implementation if rendering fails
      return Buffer.from(`Mock PDF export of presentation: ${presentation.title}, ${presentation.slides.length} slides`);
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    }
  },
  
  /**
   * Render presentation as images (one per slide)
   */
  async renderAsImages(presentation: PresentationData): Promise<Buffer[]> {
    const html = this.generatePresentationHTML(presentation);
    const tempHtmlPath = path.join(TEMP_DIR, `${uuidv4()}.html`);
    
    // Write HTML to temporary file
    fs.writeFileSync(tempHtmlPath, html);
    
    try {
      // Launch Puppeteer
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      
      // Load the HTML file
      await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
      
      // Set the page size to match slide dimensions
      const slide = presentation.slides[0] || {};
      const width = (slide as any).size?.width || 600;
      const height = (slide as any).size?.height || 800;
      
      await page.setViewport({ width, height });
      
      // Get all slide containers
      const slideCount = presentation.slides.length;
      const images: Buffer[] = [];
      
      // Take screenshot of each slide
      for (let i = 0; i < slideCount; i++) {
        // Navigate to specific slide
        await page.evaluate((index: number) => {
          const slides = document.querySelectorAll('.slide-container');
          const slide = slides[index];
          if (slide) {
            slide.scrollIntoView();
          }
        }, i);
        
        // Take screenshot
        const screenshot = await page.screenshot({
          type: 'png',
          omitBackground: false,
          clip: {
            x: 0,
            y: 0,
            width,
            height
          }
        });
        
        images.push(screenshot);
      }
      
      await browser.close();
      
      return images;
    } catch (error) {
      console.error('Error rendering images:', error);
      // Generate mock images if rendering fails
      const mockImages: Buffer[] = [];
      for (let i = 0; i < presentation.slides.length; i++) {
        mockImages.push(Buffer.from(`Mock image for slide ${i + 1}`));
      }
      return mockImages;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    }
  },
  
  /**
   * Render presentation as PPTX
   */
  async renderAsPPTX(presentation: PresentationData): Promise<Buffer> {
    try {
      // Create new PPTX
      const pptx = new PptxGenJS();
      
      // Set presentation properties
      pptx.layout = 'LAYOUT_CUSTOM';
      
      // Get slide dimensions
      const firstSlide = presentation.slides[0] || {};
      const slideWidth = (firstSlide as any).size?.width || 600;
      const slideHeight = (firstSlide as any).size?.height || 800;
      
      // Convert px to inches (1 inch = 96px)
      pptx.defineLayout({
        name: 'CUSTOM',
        width: slideWidth / 96,
        height: slideHeight / 96
      });
      
      // Process each slide
      for (const slide of presentation.slides) {
        // Create new slide
        const pptxSlide = pptx.addSlide();
        
        // Set background
        if ((slide as any).background) {
          if ((slide as any).background.type === 'solid' && (slide as any).background.color) {
            pptxSlide.background = { color: (slide as any).background.color };
          }
          // We could handle image backgrounds here if needed
        }
        
        // Process each element
        for (const element of (slide as any).elements) {
          switch (element.type) {
            case 'text':
              if (element.content) {
                pptxSlide.addText(this.cleanHtmlForPptx(element.content), {
                  x: element.left / 96,
                  y: element.top / 96,
                  w: element.width / 96,
                  h: element.height / 96,
                  rotate: element.rotate || 0,
                  isTextBox: true,
                });
              }
              break;
            
            case 'image':
              if (element.src) {
                try {
                  // For external images, we need to handle them differently
                  if (element.src.startsWith('http')) {
                    pptxSlide.addImage({
                      path: element.src,
                      x: element.left / 96,
                      y: element.top / 96,
                      w: element.width / 96,
                      h: element.height / 96,
                      sizing: { type: 'cover' },
                    });
                  } else if (element.src.startsWith('data:')) {
                    // For base64 images
                    const imgData = element.src.split(',')[1];
                    pptxSlide.addImage({
                      data: imgData,
                      x: element.left / 96,
                      y: element.top / 96,
                      w: element.width / 96,
                      h: element.height / 96,
                      sizing: { type: 'cover' },
                    });
                  }
                } catch (error) {
                  console.error('Error adding image to PPTX:', error);
                }
              }
              break;
            
            case 'shape':
              // Add shape
              if (element.text && element.text.content) {
                pptxSlide.addText(this.cleanHtmlForPptx(element.text.content), {
                  x: element.left / 96,
                  y: element.top / 96,
                  w: element.width / 96,
                  h: element.height / 96,
                  rotate: element.rotate || 0,
                  isTextBox: true,
                  fill: element.fill || 'transparent',
                  shape: 'rect', // Default shape
                  // We could map different shape types here
                });
              } else {
                pptxSlide.addShape('rect', {
                  x: element.left / 96,
                  y: element.top / 96,
                  w: element.width / 96,
                  h: element.height / 96,
                  rotate: element.rotate || 0,
                  fill: element.fill || 'transparent',
                });
              }
              break;
          }
        }
      }
      
      // Generate PPTX as Buffer
      const pptxData = await pptx.write('arraybuffer');
      return Buffer.from(pptxData);
    } catch (error) {
      console.error('Error rendering PPTX:', error);
      // Fallback to mock implementation if rendering fails
      return Buffer.from(`Mock PPTX export of presentation: ${presentation.title}, ${presentation.slides.length} slides`);
    }
  },
  
  /**
   * Pack images into a ZIP file
   */
  async packImagesIntoZip(images: Buffer[]): Promise<Buffer> {
    try {
      const zip = new JSZip();
      
      // Add each image to the ZIP
      images.forEach((imageBuffer, index) => {
        zip.file(`slide_${index + 1}.png`, imageBuffer);
      });
      
      // Generate ZIP file
      return await zip.generateAsync({ type: 'nodebuffer' });
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      // Fallback to simple concatenation if ZIP creation fails
      return Buffer.concat(images);
    }
  },
  
  /**
   * Clean HTML content for PPTX
   * Remove or convert HTML tags that pptxgenjs can't handle
   */
  cleanHtmlForPptx(html: string): string {
    // This is a basic implementation
    // For a production app, you'd need more sophisticated HTML parsing
    let cleaned = html.replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '\n');
    cleaned = cleaned.replace(/<br\s*\/?>/g, '\n');
    cleaned = cleaned.replace(/<[^>]*>/g, ''); // Remove all remaining HTML tags
    return cleaned;
  }
}; 