const { db } = require('../lib/database.cjs');

class TaskService {
  // 获取任务列表（单用户系统）
  static async getTasks({
    projectId,
    page = 1,
    limit = 10,
    priority,
    assignedTo,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      let params = [];
      
      // 项目筛选
      if (projectId) {
        whereConditions.push('t.project_id = ?');
        params.push(projectId);
      }
      
      // 指派人筛选
      if (assignedTo) {
        whereConditions.push('t.assignee_id = ?');
        params.push(assignedTo);
      }
      
      // 搜索条件
      if (search) {
        whereConditions.push('(t.title LIKE ? OR t.description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // 排序字段验证
      const validSortFields = ['created_at', 'updated_at', 'title', 'due_date'];
      const validSortOrder = ['asc', 'desc'];
      
      if (!validSortFields.includes(sortBy)) {
        sortBy = 'created_at';
      }
      
      if (!validSortOrder.includes(sortOrder.toLowerCase())) {
        sortOrder = 'desc';
      }
      
      // 获取总数
      const countQuery = `
        SELECT COUNT(DISTINCT t.id) as total
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        ${whereClause}
      `;
      
      const [countResult] = await db.query(countQuery, params);
      const total = countResult[0].total;
      
      // 获取任务列表
      const tasksQuery = `
        SELECT 
          t.*,
          p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        ${whereClause}
        ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `;
      
      const taskParams = params;
      const [tasks] = await db.query(tasksQuery, taskParams);
      
      return {
        tasks,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('获取任务列表失败:', error);
      throw error;
    }
  }
  
  // 创建任务（单用户系统）
  static async createTask(taskData) {
    try {
      const { 
        title, 
        description, 
        project_id, 
        assigned_to, 
        priority = 'medium', 
        due_date, 
        created_by 
      } = taskData;
      
      // 检查项目是否存在
      const [projects] = await db.query('SELECT id FROM projects WHERE id = ?', [project_id]);
      if (projects.length === 0) {
        throw new Error('项目不存在');
      }
      
      // 验证日期
      if (due_date && new Date(due_date) < new Date()) {
        throw new Error('截止日期不能早于当前时间');
      }
      
      const [result] = await db.query(
        `INSERT INTO tasks (
          title, description, project_id, assignee_id, 
          priority, due_date, creator_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [title, description, project_id, (assigned_to ?? null), priority, due_date, created_by]
      );
      
      // 获取创建的任务详情
      const task = await this.getTaskById(result.insertId);
      return task;
    } catch (error) {
      console.error('创建任务失败:', error);
      throw error;
    }
  }
  
  // 根据ID获取任务详情（单用户系统）
  static async getTaskById(taskId) {
    try {
      const [tasks] = await db.query(
        `SELECT 
          t.*,
          p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?`,
        [taskId]
      );
      
      return tasks[0] || null;
    } catch (error) {
      console.error('获取任务详情失败:', error);
      throw error;
    }
  }
  
  // 更新任务（单用户系统）
  static async updateTask(taskId, updateData) {
    try {
      const existingTask = await this.getTaskById(taskId);
      if (!existingTask) {
        throw new Error('任务不存在');
      }
      
      const { title, description, priority, due_date, assigned_to } = updateData;
      
      let updateFields = [];
      let params = [];
      
      if (title !== undefined) {
        updateFields.push('title = ?');
        params.push(title);
      }
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        params.push(description);
      }
      
      if (priority !== undefined) {
        updateFields.push('priority = ?');
        params.push(priority);
      }
      
      if (due_date !== undefined) {
        updateFields.push('due_date = ?');
        params.push(due_date);
      }
      
      if (assigned_to !== undefined) {
        updateFields.push('assignee_id = ?');
        params.push(assigned_to);
      }
      
      if (updateFields.length === 0) {
        return existingTask;
      }
      
      updateFields.push('updated_at = NOW()');
      params.push(taskId);
      
      await db.query(
        `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
      
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('更新任务失败:', error);
      throw error;
    }
  }
  
  // 删除任务
  static async deleteTask(taskId) {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }
      
      await db.query('DELETE FROM tasks WHERE id = ?', [taskId]);
      
      return { success: true, message: '任务删除成功' };
    } catch (error) {
      console.error('删除任务失败:', error);
      throw error;
    }
  }
  
  // 搜索任务（单用户系统）
  static async searchTasks({ keyword, projectId, page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;
      const searchTerm = `%${keyword}%`;
      
      let whereConditions = ['(t.title LIKE ? OR t.description LIKE ?)'];
      let params = [searchTerm, searchTerm];
      
      if (projectId) {
        whereConditions.push('t.project_id = ?');
        params.push(projectId);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // 获取总数
      const [countResult] = await db.query(
        `SELECT COUNT(DISTINCT t.id) as total
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        ${whereClause}`,
        params
      );
      
      const total = countResult[0].total;
      
      // 获取任务列表
      const [tasks] = await db.query(
        `SELECT 
          t.*,
          p.name as project_name,
          p.status as project_status
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        ${whereClause}
        ORDER BY 
          CASE 
            WHEN t.title LIKE ? THEN 1
            WHEN t.description LIKE ? THEN 2
            ELSE 3
          END,
          t.updated_at DESC
        LIMIT ? OFFSET ?`,
        [...params, searchTerm, searchTerm, limit, offset]
      );
      
      return {
        tasks,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('搜索任务失败:', error);
      throw error;
    }
  }
}

module.exports = { TaskService };
