const { db } = require('../lib/database.cjs');
const { dbValidator } = require('../utils/dbValidator.cjs');

const hasTaskColumn = (columnName) => {
  const columns = dbValidator.getTableColumns('tasks');
  return columns.includes(columnName);
};

class ProjectService {
  // 获取项目列表
  static async getProjects({ userId, page = 1, limit = 10, search, priority }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let params = [];
      
      // 基础查询：用户拥有的项目，但排除子项目（只显示顶级项目）
      whereConditions.push('p.owner_id = ?');
      whereConditions.push('p.parent_id IS NULL');
      params.push(parseInt(userId));
      
      // 搜索条件
      if (search) {
        whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      // 优先级筛选

      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // 获取总数
      const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM projects p
        ${whereClause}
      `;
      
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;
      
      // 获取项目列表 - 使用字符串拼接避免LIMIT/OFFSET参数化问题
      const projectsQuery = `
        SELECT 
          p.*,
          u.username as creator_name,
          u.email as creator_email
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        ${whereClause}
        ORDER BY p.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      // 只传递WHERE子句的参数

      const [projects] = await db.query(projectsQuery, params);
      
      const hasCompletedAt = hasTaskColumn('completed_at');

      // 为每个项目添加统计信息
      for (let project of projects) {
        // 获取任务统计
        const completedExpr = hasCompletedAt
          ? 'SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)'
          : '0';
        const [taskStats] = await db.execute(
          `SELECT COUNT(*) as total, ${completedExpr} as completed FROM tasks WHERE project_id = ?`,
          [project.id]
        );
        
        project.task_count = taskStats[0].total;
        project.completed_task_count = taskStats[0].completed;
        
        // 获取成员数量
        const [memberCount] = await db.execute(
          'SELECT COUNT(*) as count FROM project_members WHERE project_id = ?',
          [project.id]
        );
        
        project.member_count = memberCount[0].count + 1; // +1 for owner
        project.user_role = 'owner';
      }
      
      return {
        projects,
        total
      };
    } catch (error) {
      console.error('获取项目列表失败:', error);
      
      // 记录详细错误信息
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, 'project-service-errors.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] 获取项目列表失败: ${error.message}\n参数: ${JSON.stringify({ userId, page, limit, search, priority })}\n堆栈: ${error.stack}\n\n`;
      
      fs.appendFileSync(logFile, logEntry);
      
      throw new Error('获取项目列表失败，请稍后重试');
    }
  }
  
  // 创建项目
  static async createProject(projectData) {
    try {
      const {
        name,
        description,
        created_by
      } = projectData;
      
      // 验证必需字段
      if (!name || !name.trim()) {
        throw new Error('项目名称不能为空');
      }
      
      if (!created_by) {
        throw new Error('创建者ID不能为空');
      }
      
      // 检查项目名称是否已存在（同一用户）
      const [existing] = await db.query(
        'SELECT id FROM projects WHERE name = ? AND owner_id = ?',
        [name.trim(), created_by]
      );
      
      if (existing.length > 0) {
        throw new Error('项目名称已存在');
      }
      
      // 插入新项目
      const [result] = await db.query(
        `INSERT INTO projects (name, description, owner_id, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [name.trim(), description || '', created_by]
      );
      
      if (!result.insertId) {
        throw new Error('项目创建失败，未获取到项目ID');
      }
      
      // 获取创建的项目详情
      const project = await this.getProjectById(result.insertId);
      
      if (!project) {
        throw new Error('项目创建成功但获取详情失败');
      }
      
      return project;
    } catch (error) {
      console.error('创建项目失败:', error);
      
      // 记录详细错误信息
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, 'project-service-errors.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ProjectService.createProject 失败 - 项目数据: ${JSON.stringify(projectData)}, 错误: ${error.message}\n堆栈: ${error.stack}\n\n`;
      
      try {
        fs.appendFileSync(logFile, logEntry);
      } catch (logError) {
        console.error('写入服务错误日志失败:', logError);
      }
      
      // 重新抛出错误，保持原有的错误处理逻辑
      throw error;
    }
  }
  
  // 根据ID获取项目详情
  static async getProjectById(projectId) {
    try {
      const hasCompletedAt = hasTaskColumn('completed_at');
      const completedTaskCountSql = hasCompletedAt
        ? `(SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.completed_at IS NOT NULL) as completed_task_count`
        : `0 as completed_task_count`;

      const [projects] = await db.query(
        `SELECT 
          p.*,
          u.username as creator_name,
          u.email as creator_email,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id
          ) as task_count,
          ${completedTaskCountSql},
          (
            SELECT COUNT(*) FROM project_members pm 
            WHERE pm.project_id = p.id
          ) + 1 as member_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.id = ?`,
        [projectId]
      );
      
      return projects[0] || null;
    } catch (error) {
      console.error('获取项目详情失败:', error);
      throw error;
    }
  }
  
  // 更新项目
  static async updateProject(projectId, updateData) {
    try {
      // 检查项目是否存在
      const existingProject = await this.getProjectById(projectId);
      if (!existingProject) {
        throw new Error('项目不存在');
      }
      
      const {
        name,
        description,
        priority
      } = updateData;
      
      // 如果更新名称，检查是否与其他项目重复
      if (name && name !== existingProject.name) {
        const [existing] = await db.query(
          'SELECT id FROM projects WHERE name = ? AND owner_id = ? AND id != ?',
          [name, existingProject.owner_id, projectId]
        );
        
        if (existing.length > 0) {
          throw new Error('项目名称已存在');
        }
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      
      if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
      }
      

      
      if (updateFields.length === 0) {
        return existingProject;
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(projectId);
      
      await db.query(
        `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      // 返回更新后的项目详情
      return await this.getProjectById(projectId);
    } catch (error) {
      console.error('更新项目失败:', error);
      throw error;
    }
  }
  
  // 删除项目
  static async deleteProject(projectId) {
    try {
      // 检查项目是否存在
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new Error('项目不存在');
      }
      
      // 依赖数据库外键约束的ON DELETE CASCADE，允许直接删除项目
      
      // 开始事务
      await db.beginTransaction();
      
      try {
        // 删除项目成员
        await db.query('DELETE FROM project_members WHERE project_id = ?', [projectId]);
        
        // 删除项目
        await db.query('DELETE FROM projects WHERE id = ?', [projectId]);
        
        await db.commit();
      } catch (error) {
        await db.rollback();
        throw error;
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      throw error;
    }
  }
  
  // 获取项目成员
  static async getProjectMembers(projectId) {
    try {
      const [members] = await db.query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.avatar_url,
          pm.role,
          pm.joined_at,
          'member' as member_type
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
        
        UNION
        
        SELECT 
          u.id,
          u.username,
          u.email,
          u.avatar_url,
          'owner' as role,
          p.created_at as joined_at,
          'owner' as member_type
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = ?
        
        ORDER BY 
          CASE WHEN member_type = 'owner' THEN 0 ELSE 1 END,
          joined_at ASC`,
        [projectId, projectId]
      );
      
      return members;
    } catch (error) {
      console.error('获取项目成员失败:', error);
      throw error;
    }
  }
  
  // 添加项目成员
  static async addProjectMember(projectId, userId, role = 'member') {
    try {
      // 检查项目是否存在
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new Error('项目不存在');
      }
      
      // 检查用户是否存在
      const [users] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        throw new Error('用户不存在');
      }
      
      // 检查用户是否已经是项目成员
      if (project.owner_id === userId) {
        throw new Error('用户已是项目创建者');
      }
      
      const [existingMembers] = await db.query(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      
      if (existingMembers.length > 0) {
        throw new Error('用户已是项目成员');
      }
      
      // 添加项目成员
      await db.query(
        'INSERT INTO project_members (project_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())',
        [projectId, userId, role]
      );
    } catch (error) {
      console.error('添加项目成员失败:', error);
      throw error;
    }
  }
  
  // 更新成员角色
  static async updateMemberRole(projectId, userId, role) {
    try {
      // 检查成员是否存在
      const [members] = await db.query(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      
      if (members.length === 0) {
        throw new Error('项目成员不存在');
      }
      
      await db.query(
        'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?',
        [role, projectId, userId]
      );
    } catch (error) {
      console.error('更新成员角色失败:', error);
      throw error;
    }
  }
  
  // 移除项目成员
  static async removeProjectMember(projectId, userId) {
    try {
      // 检查成员是否存在
      const [members] = await db.query(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      
      if (members.length === 0) {
        throw new Error('项目成员不存在');
      }
      
      await db.query(
        'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
    } catch (error) {
      console.error('移除项目成员失败:', error);
      throw error;
    }
  }
  
  // 检查项目权限
  static async checkProjectPermission(projectId, userId, requiredRoles = []) {
    try {
      // 获取项目信息
      const project = await this.getProjectById(projectId);
      if (!project) {
        return false;
      }
      
      // 检查是否是项目创建者
      if (project.owner_id === userId) {
        return requiredRoles.length === 0 || requiredRoles.includes('owner');
      }
      
      // 检查项目成员角色
      const [members] = await db.query(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      
      if (members.length === 0) {
        return false;
      }
      
      const userRole = members[0].role;
      return requiredRoles.length === 0 || requiredRoles.includes(userRole);
    } catch (error) {
      console.error('检查项目权限失败:', error);
      return false;
    }
  }
  
  // 检查用户是否是项目成员
  static async isProjectMember(projectId, userId) {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        return false;
      }
      
      // 检查是否是项目创建者
      if (project.owner_id === userId) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('检查项目成员失败:', error);
      return false;
    }
  }

  // 获取项目统计信息
  static async getProjectStats(projectId) {
    try {
      const hasCompletedAt = hasTaskColumn('completed_at');
      const hasPriority = hasTaskColumn('priority');

      const todoExpr = hasCompletedAt
        ? 'COUNT(CASE WHEN t.completed_at IS NULL THEN 1 END)'
        : 'COUNT(t.id)';
      const completedExpr = hasCompletedAt
        ? 'COUNT(CASE WHEN t.completed_at IS NOT NULL THEN 1 END)'
        : '0';
      const highPriorityExpr = hasPriority
        ? "COUNT(CASE WHEN t.priority = 'high' THEN 1 END)"
        : '0';
      const mediumPriorityExpr = hasPriority
        ? "COUNT(CASE WHEN t.priority = 'medium' THEN 1 END)"
        : '0';
      const lowPriorityExpr = hasPriority
        ? "COUNT(CASE WHEN t.priority = 'low' THEN 1 END)"
        : '0';

      const [stats] = await db.query(
        `SELECT 
          COUNT(t.id) as total_tasks,
          ${todoExpr} as todo_tasks,
          ${completedExpr} as completed_tasks,
          ${highPriorityExpr} as high_priority_tasks,
          ${mediumPriorityExpr} as medium_priority_tasks,
          ${lowPriorityExpr} as low_priority_tasks,
          COALESCE(SUM(t.actual_hours), 0) as total_actual_hours
        FROM tasks t
        WHERE t.project_id = ?`,
        [projectId]
      );
      
      const projectStats = stats[0];
      
      // 计算完成率
      projectStats.completion_rate = projectStats.total_tasks > 0 
        ? Math.round((projectStats.completed_tasks / projectStats.total_tasks) * 100)
        : 0;
      
      return projectStats;
    } catch (error) {
      console.error('获取项目统计失败:', error);
      throw error;
    }
  }
  
  // 获取所有项目（单用户系统）
  static async getAllProjects() {
    try {
      const hasCompletedAt = hasTaskColumn('completed_at');
      const completedTaskCountSql = hasCompletedAt
        ? `(SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.completed_at IS NOT NULL) as completed_task_count`
        : `0 as completed_task_count`;

      const [projects] = await db.query(
        `SELECT 
          p.*,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id
          ) as task_count,
          ${completedTaskCountSql}
        FROM projects p
        ORDER BY p.updated_at DESC`
      );
      
      return projects;
    } catch (error) {
      console.error('获取所有项目失败:', error);
      throw error;
    }
  }
  
  // 搜索项目（单用户系统）
  static async searchProjects({ keyword, page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;
      const searchTerm = `%${keyword}%`;
      
      // 获取总数
      const [countResult] = await db.query(
        `SELECT COUNT(DISTINCT p.id) as total
        FROM projects p
        WHERE (p.name LIKE ? OR p.description LIKE ?)`,
        [searchTerm, searchTerm]
      );
      
      const total = countResult[0].total;
      
      // 获取项目列表
      const hasCompletedAt = hasTaskColumn('completed_at');
      const completedTaskCountSql = hasCompletedAt
        ? `(SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.completed_at IS NOT NULL) as completed_task_count`
        : `0 as completed_task_count`;

      const [projects] = await db.query(
        `SELECT 
          p.*,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id
          ) as task_count,
          ${completedTaskCountSql}
        FROM projects p
        WHERE (p.name LIKE ? OR p.description LIKE ?)
        ORDER BY 
          CASE 
            WHEN p.name LIKE ? THEN 1
            WHEN p.description LIKE ? THEN 2
            ELSE 3
          END,
          p.updated_at DESC
        LIMIT ? OFFSET ?`,
        [searchTerm, searchTerm, searchTerm, searchTerm, limit, offset]
      );
      
      return {
        projects,
        total
      };
    } catch (error) {
      console.error('搜索项目失败:', error);
      throw error;
    }
  }
}

module.exports = { ProjectService };
