import { Project, SubProject, ProjectTreeNode } from '../types'
import { apiClient } from '../lib/database'

const API_BASE = '/api/projects'

// API响应接口
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class SubprojectService {
  // 获取子项目列表
  static async getSubprojects(projectId: string): Promise<SubProject[]> {
    try {
      const response: ApiResponse<SubProject[]> = await apiClient.get(`/projects/${projectId}/subprojects`)
      console.log('子项目API响应:', response)
      // 后端返回的数据结构是 { success: true, data: [...] }
      // apiClient.get 返回的是完整的响应对象，需要提取其中的 data 字段
      return response.data || []
    } catch (error) {
      console.error('获取子项目列表失败:', error)
      throw new Error('获取子项目列表失败')
    }
  }

  // 创建子项目
  static async createSubproject(projectId: string, subprojectData: Partial<Project>): Promise<SubProject> {
    try {
      const response: ApiResponse<SubProject> = await apiClient.post(`/projects/${projectId}/subprojects`, subprojectData)
      return response.data!
    } catch (error) {
      console.error('创建子项目失败:', error)
      throw new Error('创建子项目失败')
    }
  }

  // 获取子项目详情
  static async getSubprojectById(projectId: string, subprojectId: string): Promise<SubProject> {
    try {
      const response: ApiResponse<SubProject> = await apiClient.get(`/projects/${projectId}/subprojects/${subprojectId}`)
      return response.data!
    } catch (error) {
      console.error('获取子项目详情失败:', error)
      throw new Error('获取子项目详情失败')
    }
  }

  // 更新子项目
  static async updateSubproject(projectId: string, subprojectId: string, updateData: Partial<Project>): Promise<SubProject> {
    try {
      const response: ApiResponse<SubProject> = await apiClient.put(`/projects/${projectId}/subprojects/${subprojectId}`, updateData)
      return response.data!
    } catch (error) {
      console.error('更新子项目失败:', error)
      throw new Error('更新子项目失败')
    }
  }

  // 删除子项目
  static async deleteSubproject(projectId: string, subprojectId: string): Promise<void> {
    try {
      console.log('SubprojectService.deleteSubproject - projectId:', projectId, 'subprojectId:', subprojectId)
      const url = `/projects/${projectId}/subprojects/${subprojectId}`
      console.log('删除请求URL:', url)
      await apiClient.delete(url)
    } catch (error) {
      console.error('删除子项目失败:', error)
      throw new Error('删除子项目失败')
    }
  }

  // 获取项目树
  static async getProjectTree(projectId: string): Promise<ProjectTreeNode[]> {
    try {
      const response: ApiResponse<ProjectTreeNode[]> = await apiClient.get(`/projects/${projectId}/tree`)
      console.log('项目树API响应:', response)
      // 修复数据解析逻辑，正确提取API响应中的data字段
      return response.data || []
    } catch (error) {
      console.error('获取项目树失败:', error)
      throw new Error('获取项目树失败')
    }
  }

  // 获取项目层级结构
  static async getProjectHierarchy(projectId: string): Promise<ProjectTreeNode> {
    try {
      const response: ApiResponse<ProjectTreeNode> = await apiClient.get(`/projects/${projectId}/hierarchy`)
      return response.data!
    } catch (error) {
      console.error('获取项目层级结构失败:', error)
      throw new Error('获取项目层级结构失败')
    }
  }

  // 移动子项目到新的父项目
  static async moveSubproject(subprojectId: string, newParentId: string): Promise<void> {
    try {
      await apiClient.put(`/projects/subproject/${subprojectId}/move`, {
        parent_id: newParentId
      })
    } catch (error) {
      console.error('移动子项目失败:', error)
      throw new Error('移动子项目失败')
    }
  }

  // 复制子项目
  static async copySubproject(projectId: string, subprojectId: string, newName?: string): Promise<SubProject> {
    try {
      const response: ApiResponse<SubProject> = await apiClient.post(`/projects/${projectId}/subprojects/${subprojectId}/copy`, {
        name: newName
      })
      return response.data!
    } catch (error) {
      console.error('复制子项目失败:', error)
      throw new Error('复制子项目失败')
    }
  }
}
