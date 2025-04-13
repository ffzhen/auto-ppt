import { PresentationData } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// 创建临时文件目录
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * This is a placeholder service for exporting presentations.
 * In a real application, this would convert presentations to different formats like PDF, PPTX, images, etc.
 */
export const ExportService = {
  /**
   * Export presentation as PDF (mock implementation)
   */
  async exportAsPDF(presentation: PresentationData): Promise<Buffer> {
    // This is just a mock implementation
    // In a real application, this would generate a PDF
    console.log(`Exporting presentation "${presentation.title}" as PDF...`);
    return Buffer.from(`Mock PDF export of presentation: ${presentation.title}，包含 ${presentation.slides.length} 张幻灯片`);
  },

  /**
   * Export presentation as PPTX (mock implementation)
   */
  async exportAsPPTX(presentation: PresentationData): Promise<Buffer> {
    // This is just a mock implementation
    // In a real application, this would generate a PPTX file
    console.log(`Exporting presentation "${presentation.title}" as PPTX...`);
    return Buffer.from(`Mock PPTX export of presentation: ${presentation.title}，包含 ${presentation.slides.length} 张幻灯片`);
  },

  /**
   * Export presentation as images (mock implementation)
   */
  async exportAsImages(presentation: PresentationData): Promise<Buffer> {
    // This is just a mock implementation
    // In a real application, this would generate images for each slide
    console.log(`Exporting presentation "${presentation.title}" as images...`);
    return Buffer.from(`Mock image export of presentation: ${presentation.title}，包含 ${presentation.slides.length} 张幻灯片`);
  },

  /**
   * 保存导出的文件到临时目录并返回文件路径
   */
  async saveExportToFile(buffer: Buffer, filename: string): Promise<string> {
    const uniqueFilename = `${uuidv4()}-${filename}`;
    const filePath = path.join(TEMP_DIR, uniqueFilename);
    
    await fs.promises.writeFile(filePath, buffer);
    console.log(`文件已保存到: ${filePath}`);
    
    return uniqueFilename;
  },

  /**
   * 获取临时文件的完整路径
   */
  getFilePath(filename: string): string {
    return path.join(TEMP_DIR, filename);
  },

  /**
   * 根据格式导出演示文稿并保存到临时文件
   */
  async exportAndSave(presentation: PresentationData, format: string): Promise<string> {
    let buffer: Buffer;
    let filename: string;
    
    switch (format) {
      case 'pdf':
        buffer = await this.exportAsPDF(presentation);
        filename = `${presentation.title}.pdf`;
        break;
      case 'pptx':
        buffer = await this.exportAsPPTX(presentation);
        filename = `${presentation.title}.pptx`;
        break;
      case 'image':
        buffer = await this.exportAsImages(presentation);
        filename = `${presentation.title}_slides.zip`;
        break;
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
    
    return this.saveExportToFile(buffer, filename);
  },

  /**
   * 清理过期的临时文件
   */
  cleanupOldExports(maxAgeMinutes = 30): void {
    try {
      const files = fs.readdirSync(TEMP_DIR);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        const stats = fs.statSync(filePath);
        const fileAgeMinutes = (now - stats.mtimeMs) / (1000 * 60);
        
        if (fileAgeMinutes > maxAgeMinutes) {
          fs.unlinkSync(filePath);
          console.log(`已删除过期文件: ${filePath}`);
        }
      }
    } catch (error) {
      console.error('清理过期文件时出错:', error);
    }
  }
}; 