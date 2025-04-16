import { Request, Response } from 'express';
import { PresentationModel } from '../models/presentation';
import { CreatePresentationDto, UpdatePresentationDto } from '../types';
import { ExportService } from '../services/export';
import { RenderService } from '../services/render';
import * as fs from 'fs';
import * as path from 'path';

export const PresentationController = {
  // Get all presentations
  getAllPresentations(req: Request, res: Response) {
    try {
      const presentations = PresentationModel.getAllPresentations();
      return res.status(200).json(presentations);
    } catch (error) {
      console.error('Error fetching presentations:', error);
      return res.status(500).json({ message: 'Failed to fetch presentations' });
    }
  },

  // Get a presentation by ID
  getPresentationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const presentation = PresentationModel.getPresentationById(id);
      
      if (!presentation) {
        return res.status(404).json({ message: 'Presentation not found' });
      }
      
      return res.status(200).json(presentation);
    } catch (error) {
      console.error('Error fetching presentation:', error);
      return res.status(500).json({ message: 'Failed to fetch presentation' });
    }
  },

  // Create a new presentation
  createPresentation(req: Request, res: Response) {
    try {
      const presentationData: CreatePresentationDto = req.body;
      const newPresentation = PresentationModel.createPresentation(presentationData);
      
      return res.status(201).json(newPresentation);
    } catch (error) {
      console.error('Error creating presentation:', error);
      return res.status(500).json({ message: 'Failed to create presentation' });
    }
  },

  // Update a presentation
  updatePresentation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const presentationData: UpdatePresentationDto = req.body;
      
      const updatedPresentation = PresentationModel.updatePresentation(id, presentationData);
      
      if (!updatedPresentation) {
        return res.status(404).json({ message: 'Presentation not found' });
      }
      
      return res.status(200).json(updatedPresentation);
    } catch (error) {
      console.error('Error updating presentation:', error);
      return res.status(500).json({ message: 'Failed to update presentation' });
    }
  },

  // Delete a presentation
  deletePresentation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = PresentationModel.deletePresentation(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Presentation not found' });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting presentation:', error);
      return res.status(500).json({ message: 'Failed to delete presentation' });
    }
  },

  // Clone a presentation
  clonePresentation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title } = req.body;
      
      const clonedPresentation = PresentationModel.clonePresentation(id, title);
      
      if (!clonedPresentation) {
        return res.status(404).json({ message: 'Presentation not found' });
      }
      
      return res.status(201).json(clonedPresentation);
    } catch (error) {
      console.error('Error cloning presentation:', error);
      return res.status(500).json({ message: 'Failed to clone presentation' });
    }
  },

  // Export a presentation
  exportPresentation: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { format } = req.params; // pdf, pptx, or image
      
      const presentation = PresentationModel.getPresentationById(id);
      
      if (!presentation) {
        return res.status(404).json({ message: 'Presentation not found' });
      }

      let fileBuffer: Buffer;
      let contentType: string;
      let filename: string;
      
      switch (format) {
        case 'pdf':
          fileBuffer = await ExportService.exportAsPDF(presentation);
          contentType = 'application/pdf';
          filename = `${presentation.title}.pdf`;
          break;
        case 'pptx':
          fileBuffer = await ExportService.exportAsPPTX(presentation);
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          filename = `${presentation.title}.pptx`;
          break;
        case 'image':
          fileBuffer = await ExportService.exportAsImages(presentation);
          contentType = 'application/zip';
          filename = `${presentation.title}_slides.zip`;
          break;
        default:
          return res.status(400).json({ message: 'Invalid export format' });
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(fileBuffer);
    } catch (error) {
      console.error('Error exporting presentation:', error);
      return res.status(500).json({ message: 'Failed to export presentation' });
    }
  },

  // Render a presentation without saving (server-side rendering)
  renderPresentation: async (req: Request, res: Response) => {
    try {
      const { format } = req.params; // pdf, pptx, or image
      const presentation = req.body;
      
      if (!presentation || !presentation.slides || !Array.isArray(presentation.slides)) {
        return res.status(400).json({ message: 'Invalid presentation data' });
      }

      let fileBuffer: Buffer;
      let contentType: string;
      let filename: string;
      
      // Add a title if not provided
      const title = presentation.title || 'Presentation';
      
      switch (format) {
        case 'pdf':
          fileBuffer = await RenderService.renderAsPDF(presentation);
          contentType = 'application/pdf';
          filename = `${title}.pdf`;
          break;
        case 'pptx':
          fileBuffer = await RenderService.renderAsPPTX(presentation);
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          filename = `${title}.pptx`;
          break;
        case 'image':
          const images = await RenderService.renderAsImages(presentation);
          fileBuffer = await RenderService.packImagesIntoZip(images);
          contentType = 'application/zip';
          filename = `${title}_slides.zip`;
          break;
        default:
          return res.status(400).json({ message: 'Invalid render format' });
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(fileBuffer);
    } catch (error) {
      console.error('Error rendering presentation:', error);
      return res.status(500).json({ message: 'Failed to render presentation' });
    }
  },

  // 生成导出文件并返回下载链接
  createExportFileAndGetLink: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { format } = req.params; // pdf, pptx, or image
      
      const presentation = PresentationModel.getPresentationById(id);
      
      if (!presentation) {
        return res.status(404).json({ message: '找不到演示文稿' });
      }

      // 生成并保存导出文件
      const savedFilename = await ExportService.exportAndSave(presentation, format);
      
      // 创建下载链接（30分钟有效）
      const downloadLink = `/api/presentations/download/${savedFilename}`;
      
      // 启动定期清理任务（如果还没启动）
      PresentationController.scheduleCleanup();
      
      return res.status(200).json({ 
        message: '导出成功',
        downloadLink,
        filename: savedFilename,
        expiresIn: '30分钟'
      });
    } catch (error) {
      console.error('导出演示文稿出错:', error);
      return res.status(500).json({ message: '导出演示文稿失败' });
    }
  },

  // 下载已导出的文件
  downloadExportedFile: async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = ExportService.getFilePath(filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: '文件不存在或已过期' });
      }

      // 从文件名确定内容类型
      let contentType = 'application/octet-stream';
      if (filename.endsWith('.pdf')) {
        contentType = 'application/pdf';
      } else if (filename.endsWith('.pptx')) {
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      } else if (filename.endsWith('.zip')) {
        contentType = 'application/zip';
      }
      
      // 提取原始文件名
      const originalFilename = filename.substring(filename.indexOf('-') + 1);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`);
      
      // 流式传输文件
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('下载文件时出错:', error);
      return res.status(500).json({ message: '下载文件失败' });
    }
  },

  // 清理过期文件的任务
  cleanupTask: null as NodeJS.Timeout | null,
  
  // 安排定期清理任务
  scheduleCleanup: () => {
    if (!PresentationController.cleanupTask) {
      // 每10分钟清理一次过期文件
      PresentationController.cleanupTask = setInterval(() => {
        ExportService.cleanupOldExports();
      }, 10 * 60 * 1000);
      
      // 确保进程退出时清理定时器
      process.on('exit', () => {
        if (PresentationController.cleanupTask) {
          clearInterval(PresentationController.cleanupTask);
        }
      });
    }
  }
}; 