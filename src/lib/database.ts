// 前端API客户端 - 通过HTTP调用后端API而不是直接连接数据库

const API_BASE_URL = 'http://localhost:3001/api';

// API响应接口
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// HTTP客户端类
export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = API_BASE_URL;
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // 通用请求方法 - 单用户系统，无需认证
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();
      let parsed: any = undefined;

      if (contentType.includes('application/json') && rawText.trim() !== '') {
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          parsed = { message: rawText };
        }
      }

      if (!response.ok) {
        const msg = (parsed && (parsed.message || parsed.error)) || rawText || response.statusText;
        throw new Error(`[${response.status}] ${msg}`);
      }

      if (parsed && typeof parsed === 'object' && 'success' in parsed) {
        return parsed as ApiResponse<T>;
      }

      return {
        success: true,
        data: parsed !== undefined ? (parsed as T) : undefined,
      } as ApiResponse<T>;
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  }

  // GET请求
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST请求
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH方法
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE方法
  async delete<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: 'DELETE',
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    return this.request<T>(endpoint, options);
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch (error) {
      console.error('API连接测试失败:', error);
      return false;
    }
  }
}

// 数据库兼容层 - 保持与原有代码的兼容性
export class Database {
  private static instance: Database;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // 模拟查询方法 - 实际通过API调用
  async query(sql: string, params?: any[]): Promise<any> {
    // 注意：这里只是为了保持兼容性，实际应该使用具体的API端点
    console.warn('直接SQL查询已弃用，请使用具体的API端点');
    throw new Error('请使用具体的API服务方法而不是直接SQL查询');
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    return this.apiClient.testConnection();
  }
}

// 导出实例
export const db = Database.getInstance();
export const apiClient = ApiClient.getInstance();