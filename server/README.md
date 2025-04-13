# Auto-PPT Server

This is the backend server for the Auto-PPT presentation application.

## Features

- RESTful API for managing presentations
- In-memory database (can be replaced with a persistent database)
- TypeScript for type safety
- Express.js for the web server
- Export presentations to various formats (PDF, PPTX, images)
- Support for direct download and link-based download

## API Endpoints

### 演示文稿管理
- `GET /api/presentations` - 获取所有演示文稿
- `POST /api/presentations` - 创建新演示文稿
- `GET /api/presentations/:id` - 获取单个演示文稿
- `PUT /api/presentations/:id` - 更新演示文稿
- `DELETE /api/presentations/:id` - 删除演示文稿
- `POST /api/presentations/:id/clone` - 克隆演示文稿

### 导出与下载
- `GET /api/presentations/:id/export/:format` - 直接导出演示文稿（格式：pdf, pptx, image）
- `GET /api/presentations/:id/export-link/:format` - 创建导出文件并获取下载链接
- `GET /api/presentations/download/:filename` - 通过文件名下载导出的文件

## Setup

### Prerequisites

- Node.js 14+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following content:
```
PORT=8080
```

3. Build the TypeScript code:
```bash
npm run build
```

### Running the Server

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

## Development

### Project Structure

- `src/controllers/` - Request handlers
- `src/models/` - Data models
- `src/routes/` - API routes
- `src/types/` - TypeScript type definitions
- `src/services/` - Business logic services
- `src/utils/` - Utility functions
- `src/index.ts` - Application entry point

## 导出与下载功能说明

服务器提供了两种方式下载演示文稿：

1. **直接下载**：通过 `/api/presentations/:id/export/:format` 端点，直接生成并下载文件。
   - 优点：单一请求，简单
   - 缺点：大文件可能导致超时

2. **链接下载**：通过 `/api/presentations/:id/export-link/:format` 端点获取下载链接，然后通过 `/api/presentations/download/:filename` 下载文件。
   - 优点：适合大文件，可以处理长时间运行的导出任务
   - 缺点：需要两个请求

导出的文件将临时保存在服务器上，并在30分钟后自动删除。

## Future Improvements

- Add authentication and authorization
- Implement a persistent database (MongoDB, PostgreSQL, etc.)
- Add validation middleware
- Add comprehensive error handling
- Implement logging
- Add unit and integration tests
- Implement real PDF/PPTX generation
- Add progress tracking for large exports 