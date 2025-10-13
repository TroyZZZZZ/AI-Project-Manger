const { db } = require('../lib/database.cjs');

class ProjectService {
  // 获取项目列表
  static async getProjects({ userId, page = 1, limit = 10, search, status, priority }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let params = [];
      
      // 基础查询：用户参与的项目
      whereConditions.push(`(
        p.created_by = ? OR 
        EXISTS (
          SELECT 1 FROM project_members pm 
          WHERE pm.project_id = p.id AND pm.user_id = ?
        )
      )`);
      params.push(userId, userId);
      
      // 搜索条件
      if (search) {
        whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      // 状态筛选
      if (status) {
        whereConditions.push('p.status = ?');
        params.push(status);
      }
      
      // 优先级筛选
      if (priority) {
        whereConditions.push('p.priority = ?');
        params.push(priority);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // 获取总数
      const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM projects p
        ${whereClause}
      `;
      
      const [countResult] = await db.query(countQuery, params);
      const total = countResult[0].total;
      
      // 获取项目列表
      const projectsQuery = `
        SELECT 
          p.*,
          u.username as creator_name,
          u.email as creator_email,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id
          ) as task_count,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id AND t.status = 'completed'
          ) as completed_task_count,
          (
            SELECT COUNT(*) FROM project_members pm 
            WHERE pm.project_id = p.id
          ) + 1 as member_count,
          CASE 
            WHEN p.created_by = ? THEN 'owner'
            ELSE COALESCE(
              (SELECT role FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?),
              'member'
            )
          END as user_role
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        ${whereClause}
        ORDER BY p.updated_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const projectParams = [...params, userId, userId, limit, offset];
      const [projects] = await db.query(projectsQuery, projectParams);
      
      return {
        projects,
        total
      };
    } catch (error) {
      console.error('获取项目列表失败:', error);
      throw error;
    }
  }
  
  // 创建项目
  static async createProject(projectData) {
    try {
      const {
        name,
        description,
        status = 'active',
        priority = 'medium',
        start_date,
        end_date,
        created_by
      } = projectData;
      
      // 检查项目名称是否已存在（同一用户）
      const [existing] = await db.query(
        'SELECT id FROM projects WHERE name = ? AND created_by = ?',
        [name, created_by]
      );
      
      if (existing.length > 0) {
        throw new Error('项目名称已存在');
      }
      
      // 验证日期
      if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
        throw new Error('开始日期不能晚于结束日期');
      }
      
      const [result] = await db.query(
        `INSERT INTO projects (name, description, status, priority, start_date, end_date, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [name, description, status, priority, start_date, end_date, created_by]
      );
      
      // 获取创建的项目详情
      const project = await this.getProjectById(result.insertId);
      return project;
    } catch (error) {
      console.error('创建项目失败:', error);
      throw error;
    }
  }
  
  // 根据ID获取项目详情
  static async getProjectById(projectId) {
    try {
      const [projects] = await db.query(
        `SELECT 
          p.*,
          u.username as creator_name,
          u.email as creator_email,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id
          ) as task_count,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id AND t.status = 'completed'
          ) as completed_task_count,
          (
            SELECT COUNT(*) FROM project_members pm 
            WHERE pm.project_id = p.id
          ) + 1 as member_count
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
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
        status,
        priority,
        start_date,
        end_date
      } = updateData;
      
      // 如果更新名称，检查是否与其他项目重复
      if (name && name !== existingProject.name) {
        const [existing] = await db.query(
          'SELECT id FROM projects WHERE name = ? AND created_by = ? AND id != ?',
          [name, existingProject.created_by, projectId]
        );
        
        if (existing.length > 0) {
          throw new Error('项目名称已存在');
        }
      }
      
      // 验证日期
      const newStartDate = start_date || existingProject.start_date;
      const newEndDate = end_date || existingProject.end_date;
      
      if (newStartDate && newEndDate && new Date(newStartDate) > new Date(newEndDate)) {
        throw new Error('开始日期不能晚于结束日期');
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
      
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      
      if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
      }
      
      if (start_date !== undefined) {
        updateFields.push('start_date = ?');
        updateValues.push(start_date);
      }
      
      if (end_date !== undefined) {
        updateFields.push('end_date = ?');
        updateValues.push(end_date);
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
      
      // 检查是否有关联的任务
      const [tasks] = await db.query(
        'SELECT COUNT(*) as count FROM tasks WHERE project_id = ?',
        [projectId]
      );
      
      if (tasks[0].count > 0) {
        throw new Error('项目存在关联任务，无法删除');
      }
      
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
        JOIN users u ON p.created_by = u.id
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
      if (project.created_by === userId) {
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
      if (project.created_by === userId) {
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
      if (project.created_by === userId) {
        return true;
      }
      
      // 检查是否是项目成员
      const [members] = await db.query(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      
      return members.length > 0;
    } catch (error) {
      console.error('检查项目成员失败:', error);
      return false;
    }
  }
  
  // 获取项目统计信息
  static async getProjectStats(projectId) {
    try {
      const [stats] = await db.query(
        `SELECT 
          COUNT(t.id) as total_tasks,
          COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
          COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as high_priority_tasks,
          COUNT(CASE WHEN t.priority = 'medium' THEN 1 END) as medium_priority_tasks,
          COUNT(CASE WHEN t.priority = 'low' THEN 1 END) as low_priority_tasks,
          COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
          COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
          COUNT(DISTINCT t.assigned_to) as active_members
        FROM tasks t
        WHERE t.project_id = ?`,
        [projectId]
      );
      
      const projectStats = stats[0];
      
      // 计算完成率
      projectStats.completion_rate = projectStats.total_tasks > 0 
        ? Math.round((projectStats.completed_tasks / projectStats.total_tasks) * 100)
        : 0;
      
      // 计算工时效率
      projectStats.time_efficiency = projectStats.total_estimated_hours > 0
        ? Math.round((projectStats.total_estimated_hours / projectStats.total_actual_hours) * 100)
        : 0;
      
      return projectStats;
    } catch (error) {
      console.error('获取项目统计失败:', error);
      throw error;
    }
  }
  
  // 获取用户参与的所有项目
  static async getUserProjects(userId) {
    try {
      const [projects] = await db.query(
        `SELECT 
          p.*,
          u.username as creator_name,
          CASE 
            WHEN p.created_by = ? THEN 'owner'
            ELSE COALESCE(
              (SELECT role FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?),
              'member'
            )
          END as user_role,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id
          ) as task_count,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id AND t.status = 'completed'
          ) as completed_task_count
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.created_by = ? OR EXISTS (
          SELECT 1 FROM project_members pm 
          WHERE pm.project_id = p.id AND pm.user_id = ?
        )
        ORDER BY p.updated_at DESC`,
        [userId, userId, userId, userId]
      );
      
      return projects;
    } catch (error) {
      console.error('获取用户项目失败:', error);
      throw error;
    }
  }
  
  // 搜索项目
  static async searchProjects({ keyword, userId, page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;
      const searchTerm = `%${keyword}%`;
      
      // 获取总数
      const [countResult] = await db.query(
        `SELECT COUNT(DISTINCT p.id) as total
        FROM projects p
        WHERE (p.name LIKE ? OR p.description LIKE ?)
        AND (
          p.created_by = ? OR 
          EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = p.id AND pm.user_id = ?
          )
        )`,
        [searchTerm, searchTerm, userId, userId]
      );
      
      const total = countResult[0].total;
      
      // 获取项目列表
      const [projects] = await db.query(
        `SELECT 
          p.*,
          u.username as creator_name,
          CASE 
            WHEN p.created_by = ? THEN 'owner'
            ELSE COALESCE(
              (SELECT role FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?),
              'member'
            )
          END as user_role,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id
          ) as task_count,
          (
            SELECT COUNT(*) FROM tasks t 
            WHERE t.project_id = p.id AND t.status = 'completed'
          ) as completed_task_count
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE (p.name LIKE ? OR p.description LIKE ?)
        AND (
          p.created_by = ? OR 
          EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = p.id AND pm.user_id = ?
          )
        )
        ORDER BY 
          CASE 
            WHEN p.name LIKE ? THEN 1
            WHEN p.description LIKE ? THEN 2
            ELSE 3
          END,
          p.updated_at DESC
        LIMIT ? OFFSET ?`,
        [userId, userId, searchTerm, searchTerm, userId, userId, searchTerm, searchTerm, limit, offset]
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