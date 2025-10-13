import OSS from 'ali-oss';

// OSS配置
const ossConfig = {
  region: import.meta.env.VITE_ALIYUN_REGION,
  accessKeyId: import.meta.env.VITE_ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: import.meta.env.VITE_ALIYUN_ACCESS_KEY_SECRET,
  bucket: import.meta.env.VITE_ALIYUN_OSS_BUCKET,
  endpoint: import.meta.env.VITE_ALIYUN_OSS_ENDPOINT,
};

// OSS客户端类
export class OSSService {
  private static instance: OSSService;
  private client: OSS;

  private constructor() {
    this.client = new OSS(ossConfig);
  }

  public static getInstance(): OSSService {
    if (!OSSService.instance) {
      OSSService.instance = new OSSService();
    }
    return OSSService.instance;
  }

  // 上传文件
  async uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
    try {
      const fileName = `${folder}/${Date.now()}-${file.name}`;
      const result = await this.client.put(fileName, file);
      return result.url;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw new Error('文件上传失败');
    }
  }

  // 上传Base64图片
  async uploadBase64Image(base64Data: string, folder: string = 'images'): Promise<string> {
    try {
      // 解析base64数据
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('无效的base64数据');
      }

      const mimeType = matches[1];
      const base64 = matches[2];
      const buffer = Buffer.from(base64, 'base64');
      
      // 根据MIME类型确定文件扩展名
      const extension = mimeType.split('/')[1] || 'jpg';
      const fileName = `${folder}/${Date.now()}.${extension}`;
      
      const result = await this.client.put(fileName, buffer, {
        headers: {
          'Content-Type': mimeType,
        },
      });
      
      return result.url;
    } catch (error) {
      console.error('Base64图片上传失败:', error);
      throw new Error('图片上传失败');
    }
  }

  // 删除文件
  async deleteFile(fileName: string): Promise<boolean> {
    try {
      await this.client.delete(fileName);
      return true;
    } catch (error) {
      console.error('文件删除失败:', error);
      return false;
    }
  }

  // 获取文件列表
  async listFiles(prefix: string = '', maxKeys: number = 100): Promise<OSS.ObjectMeta[]> {
    try {
      const result = await this.client.list({
        prefix,
        'max-keys': maxKeys,
      });
      return result.objects || [];
    } catch (error) {
      console.error('获取文件列表失败:', error);
      throw error;
    }
  }

  // 生成签名URL（用于临时访问私有文件）
  async generateSignedUrl(fileName: string, expires: number = 3600): Promise<string> {
    try {
      const url = this.client.signatureUrl(fileName, {
        expires,
        method: 'GET',
      });
      return url;
    } catch (error) {
      console.error('生成签名URL失败:', error);
      throw error;
    }
  }

  // 检查文件是否存在
  async fileExists(fileName: string): Promise<boolean> {
    try {
      await this.client.head(fileName);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 获取文件信息
  async getFileInfo(fileName: string): Promise<OSS.ObjectMeta | null> {
    try {
      const result = await this.client.head(fileName);
      return result.meta;
    } catch (error) {
      console.error('获取文件信息失败:', error);
      return null;
    }
  }

  // 复制文件
  async copyFile(sourceFileName: string, targetFileName: string): Promise<boolean> {
    try {
      await this.client.copy(targetFileName, sourceFileName);
      return true;
    } catch (error) {
      console.error('文件复制失败:', error);
      return false;
    }
  }

  // 批量删除文件
  async deleteMultipleFiles(fileNames: string[]): Promise<string[]> {
    try {
      const result = await this.client.deleteMulti(fileNames);
      return result.deleted || [];
    } catch (error) {
      console.error('批量删除文件失败:', error);
      throw error;
    }
  }
}

// 导出OSS服务实例
export const ossService = OSSService.getInstance();

// 文件上传工具函数
export const uploadUtils = {
  // 验证文件类型
  validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  },

  // 验证文件大小
  validateFileSize(file: File, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  },

  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 生成唯一文件名
  generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${timestamp}-${random}.${extension}`;
  },
};

// 常用文件类型常量
export const FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  PRESENTATIONS: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};

// 文件大小限制常量（MB）
export const FILE_SIZE_LIMITS = {
  IMAGE: 5,
  DOCUMENT: 10,
  VIDEO: 100,
  GENERAL: 20,
};