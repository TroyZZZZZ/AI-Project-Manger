const { db } = require('../lib/database.cjs');

class TaskService {
  // 获取任务列表
  static async getTasks({
    userId,
    projectId,
    page = 1,
    limit = 10,
    status,
    priority,
    assignedTo,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let params = [];
      
      // 基础查询：用户有权限访问的任务
      if (projectId) {
        whereConditions.push('t.project_id = ?');
        params.push(projectId);
      } else {
        // 如果没有指定项目，获取用户参与的所有项目的任务
        whereConditions.push(`(
          EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = t.project_id AND p.created_by = ?
          ) OR
          EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = t.project_id AND pm.user_id = ?
          )
        )`);
        params.push(userId, userId);
      }
      
      // 状态筛选
      if (status) {
        whereConditions.push('t.status = ?');
        params.push(status);
      }
      
      // 优先级筛选
      if (priority) {
        whereConditions.push('t.priority = ?');
        params.push(priority);
      }
      
      // 指派人筛选
      if (assignedTo) {
        whereConditions.push('t.assigned_to = ?');
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
      const validSortFields = ['created_at', 'updated_at', 'title', 'priority', 'status', 'due_date'];
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
        ${whereClause}
      `;
      
      const [countResult] = await db.query(countQuery, params);
      const total = countResult[0].total;
      
      // 获取任务列表
      const tasksQuery = `
        SELECT 
          t.*,
          p.name as project_name,
          p.status as project_status,
          creator.username as creator_name,
          creator.email as creator_email,
          assignee.username as assignee_name,
          assignee.email as assignee_email,
          assignee.avatar_url as assignee_avatar,
          (
            SELECT COUNT(*) FROM task_comments tc 
            WHERE tc.task_id = t.id
          ) as comment_count,
          (
            SELECT COUNT(*) FROM task_history th 
            WHERE th.task_id = t.id
          ) as history_count
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        ${whereClause}
        ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;
      
      const taskParams = [...params, limit, offset];
      const [tasks] = await db.query(tasksQuery, taskParams);
      
      return {
        tasks,
        total
      };
    } catch (error) {
      console.error('获取任务列表失败:', error);
      throw error;
    }
  }
  
  // 创建任务
  static async createTask(taskData) {
    try {
      const {
        title,
        description,
        project_id,
        assigned_to,
        status = 'todo',
        priority = 'medium',
        due_date,
        estimated_hours,
        created_by
      } = taskData;
      
      // 检查项目是否存在
      const [projects] = await db.query('SELECT id FROM projects WHERE id = ?', [project_id]);
      if (projects.length === 0) {
        throw new Error('项目不存在');
      }
      
      // 如果指定了指派人，检查用户是否存在且是项目成员
      if (assigned_to) {
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [assigned_to]);
        if (users.length === 0) {
          throw new Error('指派用户不存在');
        }
        
        // 检查用户是否是项目成员
        const { ProjectService } = require('./projectService.cjs');
        const isMember = await ProjectService.isProjectMember(project_id, assigned_to);
        if (!isMember) {
          throw new Error('指派用户不是项目成员');
        }
      }
      
      // 验证日期
      if (due_date && new Date(due_date) < new Date()) {
        throw new Error('截止日期不能早于当前时间');
      }
      
      // 验证工时
      if (estimated_hours !== undefined && (isNaN(estimated_hours) || estimated_hours < 0)) {
        throw new Error('预估工时必须是非负数');
      }
      
      const [result] = await db.query(
        `INSERT INTO tasks (
          title, description, project_id, assigned_to, status, priority, 
          due_date, estimated_hours, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [title, description, project_id, assigned_to, status, priority, due_date, estimated_hours, created_by]
      );
      
      // 记录任务历史
      await this.addTaskHistory(result.insertId, {
        action: 'created',
        user_id: created_by,
        details: `创建了任务 "${title}"`
      });
      
      // 获取创建的任务详情
      const task = await this.getTaskById(result.insertId);
      return task;
    } catch (error) {
      console.error('创建任务失败:', error);
      throw error;
    }
  }
  
  // 根据ID获取任务详情
  static async getTaskById(taskId) {
    try {
      const [tasks] = await db.query(
        `SELECT 
          t.*,
          p.name as project_name,
          p.status as project_status,
          creator.username as creator_name,
          creator.email as creator_email,
          assignee.username as assignee_name,
          assignee.email as assignee_email,
          assignee.avatar_url as assignee_avatar,
          (
            SELECT COUNT(*) FROM task_comments tc 
            WHERE tc.task_id = t.id
          ) as comment_count,
          (
            SELECT COUNT(*) FROM task_history th 
            WHERE th.task_id = t.id
          ) as history_count
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.id = ?`,
        [taskId]
      );
      
      return tasks[0] || null;
    } catch (error) {
      console.error('获取任务详情失败:', error);
      throw error;
    }
  }
  
  // 更新任务
  static async updateTask(taskId, updateData, userId) {
    try {
      // 检查任务是否存在
      const existingTask = await this.getTaskById(taskId);
      if (!existingTask) {
        throw new Error('任务不存在');
      }
      
      const {
        title,
        description,
        assigned_to,
        status,
        priority,
        due_date,
        estimated_hours,
        actual_hours
      } = updateData;
      
      // 如果指定了指派人，检查用户是否存在且是项目成员
      if (assigned_to && assigned_to !== existingTask.assigned_to) {
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [assigned_to]);
        if (users.length === 0) {
          throw new Error('指派用户不存在');
        }
        
        const { ProjectService } = require('./projectService.cjs');
        const isMember = await ProjectService.isProjectMember(existingTask.project_id, assigned_to);
        if (!isMember) {
          throw new Error('指派用户不是项目成员');
        }
      }
      
      // 验证日期
      if (due_date && new Date(due_date) < new Date()) {
        throw new Error('截止日期不能早于当前时间');
      }
      
      // 验证工时
      if (estimated_hours !== undefined && (isNaN(estimated_hours) || estimated_hours < 0)) {
        throw new Error('预估工时必须是非负数');
      }
      
      if (actual_hours !== undefined && (isNaN(actual_hours) || actual_hours < 0)) {
        throw new Error('实际工时必须是非负数');
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      const changes = [];
      
      if (title !== undefined && title !== existingTask.title) {
        updateFields.push('title = ?');
        updateValues.push(title);
        changes.push(`标题从 "${existingTask.title}" 更改为 "${title}"`);
      }
      
      if (description !== undefined && description !== existingTask.description) {
        updateFields.push('description = ?');
        updateValues.push(description);
        changes.push('更新了描述');
      }
      
      if (assigned_to !== undefined && assigned_to !== existingTask.assigned_to) {
        updateFields.push('assigned_to = ?');
        updateValues.push(assigned_to);
        
        const oldAssignee = existingTask.assignee_name || '未指派';
        let newAssignee = '未指派';
        if (assigned_to) {
          const [users] = await db.query('SELECT username FROM users WHERE id = ?', [assigned_to]);
          newAssignee = users[0]?.username || '未知用户';
        }
        changes.push(`指派人从 "${oldAssignee}" 更改为 "${newAssignee}"`);
      }
      
      if (status !== undefined && status !== existingTask.status) {
        updateFields.push('status = ?');
        updateValues.push(status);
        changes.push(`状态从 "${existingTask.status}" 更改为 "${status}"`);
      }
      
      if (priority !== undefined && priority !== existingTask.priority) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
        changes.push(`优先级从 "${existingTask.priority}" 更改为 "${priority}"`);
      }
      
      if (due_date !== undefined && due_date !== existingTask.due_date) {
        updateFields.push('due_date = ?');
        updateValues.push(due_date);
        
        const oldDate = existingTask.due_date ? new Date(existingTask.due_date).toLocaleDateString() : '未设置';
        const newDate = due_date ? new Date(due_date).toLocaleDateString() : '未设置';
        changes.push(`截止日期从 "${oldDate}" 更改为 "${newDate}"`);
      }
      
      if (estimated_hours !== undefined && estimated_hours !== existingTask.estimated_hours) {
        updateFields.push('estimated_hours = ?');
        updateValues.push(estimated_hours);
        changes.push(`预估工时从 ${existingTask.estimated_hours || 0} 小时更改为 ${estimated_hours} 小时`);
      }
      
      if (actual_hours !== undefined && actual_hours !== existingTask.actual_hours) {
        updateFields.push('actual_hours = ?');
        updateValues.push(actual_hours);
        changes.push(`实际工时从 ${existingTask.actual_hours || 0} 小时更改为 ${actual_hours} 小时`);
      }
      
      if (updateFields.length === 0) {
        return existingTask;
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(taskId);
      
      await db.query(
        `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      // 记录任务历史
      if (changes.length > 0) {
        await this.addTaskHistory(taskId, {
          action: 'updated',
          user_id: userId,
          details: changes.join('; ')
        });
      }
      
      // 返回更新后的任务详情
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('更新任务失败:', error);
      throw error;
    }
  }
  
  // 删除任务
  static async deleteTask(taskId) {
    try {
      // 检查任务是否存在
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }
      
      // 开始事务
      await db.beginTransaction();
      
      try {
        // 删除任务评论
        await db.query('DELETE FROM task_comments WHERE task_id = ?', [taskId]);
        
        // 删除任务历史
        await db.query('DELETE FROM task_history WHERE task_id = ?', [taskId]);
        
        // 删除任务
        await db.query('DELETE FROM tasks WHERE id = ?', [taskId]);
        
        await db.commit();
      } catch (error) {
        await db.rollback();
        throw error;
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      throw error;
    }
  }
  
  // 更新任务状态
  static async updateTaskStatus(taskId, status, userId) {
    try {
      const existingTask = await this.getTaskById(taskId);
      if (!existingTask) {
        throw new Error('任务不存在');
      }
      
      if (status === existingTask.status) {
        return existingTask;
      }
      
      await db.query(
        'UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, taskId]
      );
      
      // 记录任务历史
      await this.addTaskHistory(taskId, {
        action: 'status_changed',
        user_id: userId,
        details: `状态从 "${existingTask.status}" 更改为 "${status}"`
      });
      
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('更新任务状态失败:', error);
      throw error;
    }
  }
  
  // 更新任务工时
  static async updateTaskHours(taskId, hoursData, userId) {
    try {
      const existingTask = await this.getTaskById(taskId);
      if (!existingTask) {
        throw new Error('任务不存在');
      }
      
      const { estimated_hours, actual_hours } = hoursData;
      const updateFields = [];
      const updateValues = [];
      const changes = [];
      
      if (estimated_hours !== undefined && estimated_hours !== existingTask.estimated_hours) {
        updateFields.push('estimated_hours = ?');
        updateValues.push(estimated_hours);
        changes.push(`预估工时从 ${existingTask.estimated_hours || 0} 小时更改为 ${estimated_hours} 小时`);
      }
      
      if (actual_hours !== undefined && actual_hours !== existingTask.actual_hours) {
        updateFields.push('actual_hours = ?');
        updateValues.push(actual_hours);
        changes.push(`实际工时从 ${existingTask.actual_hours || 0} 小时更改为 ${actual_hours} 小时`);
      }
      
      if (updateFields.length === 0) {
        return existingTask;
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(taskId);
      
      await db.query(
        `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      // 记录任务历史
      if (changes.length > 0) {
        await this.addTaskHistory(taskId, {
          action: 'hours_updated',
          user_id: userId,
          details: changes.join('; ')
        });
      }
      
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('更新任务工时失败:', error);
      throw error;
    }
  }
  
  // 获取任务评论
  static async getTaskComments(taskId, { page = 1, limit = 20 }) {
    try {
      const offset = (page - 1) * limit;
      
      // 获取总数
      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM task_comments WHERE task_id = ?',
        [taskId]
      );
      const total = countResult[0].total;
      
      // 获取评论列表
      const [comments] = await db.query(
        `SELECT 
          tc.*,
          u.username,
          u.email,
          u.avatar_url
        FROM task_comments tc
        LEFT JOIN users u ON tc.user_id = u.id
        WHERE tc.task_id = ?
        ORDER BY tc.created_at DESC
        LIMIT ? OFFSET ?`,
        [taskId, limit, offset]
      );
      
      return {
        comments,
        total
      };
    } catch (error) {
      console.error('获取任务评论失败:', error);
      throw error;
    }
  }
  
  // 添加任务评论
  static async addTaskComment(taskId, commentData) {
    try {
      const { content, user_id } = commentData;
      
      const [result] = await db.query(
        'INSERT INTO task_comments (task_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())',
        [taskId, user_id, content]
      );
      
      // 记录任务历史
      await this.addTaskHistory(taskId, {
        action: 'commented',
        user_id,
        details: '添加了评论'
      });
      
      // 获取创建的评论详情
      const [comments] = await db.query(
        `SELECT 
          tc.*,
          u.username,
          u.email,
          u.avatar_url
        FROM task_comments tc
        LEFT JOIN users u ON tc.user_id = u.id
        WHERE tc.id = ?`,
        [result.insertId]
      );
      
      return comments[0];
    } catch (error) {
      console.error('添加任务评论失败:', error);
      throw error;
    }
  }
  
  // 获取任务历史
  static async getTaskHistory(taskId, { page = 1, limit = 20 }) {
    try {
      const offset = (page - 1) * limit;
      
      // 获取总数
      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM task_history WHERE task_id = ?',
        [taskId]
      );
      const total = countResult[0].total;
      
      // 获取历史记录
      const [history] = await db.query(
        `SELECT 
          th.*,
          u.username,
          u.email,
          u.avatar_url
        FROM task_history th
        LEFT JOIN users u ON th.user_id = u.id
        WHERE th.task_id = ?
        ORDER BY th.created_at DESC
        LIMIT ? OFFSET ?`,
        [taskId, limit, offset]
      );
      
      return {
        history,
        total
      };
    } catch (error) {
      console.error('获取任务历史失败:', error);
      throw error;
    }
  }
  
  // 添加任务历史记录
  static async addTaskHistory(taskId, historyData) {
    try {
      const { action, user_id, details } = historyData;
      
      await db.query(
        'INSERT INTO task_history (task_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
        [taskId, user_id, action, details]
      );
    } catch (error) {
      console.error('添加任务历史失败:', error);
      // 历史记录失败不应该影响主要操作
    }
  }
  
  // 批量更新任务
  static async batchUpdateTasks(taskIds, updates, userId) {
    try {
      let updatedCount = 0;
      let failedCount = 0;
      const errors = [];
      
      for (const taskId of taskIds) {
        try {
          await this.updateTask(taskId, updates, userId);
          updatedCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            task_id: taskId,
            error: error.message
          });
        }
      }
      
      return {
        updated_count: updatedCount,
        failed_count: failedCount,
        errors
      };
    } catch (error) {
      console.error('批量更新任务失败:', error);
      throw error;
    }
  }
  
  // 获取用户任务
  static async getUserTasks(userId, { page = 1, limit = 10, status, priority, projectId }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = ['t.assigned_to = ?'];
      let params = [userId];
      
      if (status) {
        whereConditions.push('t.status = ?');
        params.push(status);
      }
      
      if (priority) {
        whereConditions.push('t.priority = ?');
        params.push(priority);
      }
      
      if (projectId) {
        whereConditions.push('t.project_id = ?');
        params.push(projectId);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // 获取总数
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM tasks t ${whereClause}`,
        params
      );
      const total = countResult[0].total;
      
      // 获取任务列表
      const [tasks] = await db.query(
        `SELECT 
          t.*,
          p.name as project_name,
          p.status as project_status,
          creator.username as creator_name,
          (
            SELECT COUNT(*) FROM task_comments tc 
            WHERE tc.task_id = t.id
          ) as comment_count
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users creator ON t.created_by = creator.id
        ${whereClause}
        ORDER BY t.updated_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      
      return {
        tasks,
        total
      };
    } catch (error) {
      console.error('获取用户任务失败:', error);
      throw error;
    }
  }
  
  // 搜索任务
  static async searchTasks({ keyword, userId, projectId, page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;
      const searchTerm = `%${keyword}%`;
      
      let whereConditions = [
        '(t.title LIKE ? OR t.description LIKE ?)',
        `(
          EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = t.project_id AND p.created_by = ?
          ) OR
          EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = t.project_id AND pm.user_id = ?
          )
        )`
      ];
      let params = [searchTerm, searchTerm, userId, userId];
      
      if (projectId) {
        whereConditions.push('t.project_id = ?');
        params.push(projectId);
      }
      
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // 获取总数
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM tasks t ${whereClause}`,
        params
      );
      const total = countResult[0].total;
      
      // 获取任务列表
      const [tasks] = await db.query(
        `SELECT 
          t.*,
          p.name as project_name,
          p.status as project_status,
          creator.username as creator_name,
          assignee.username as assignee_name,
          assignee.avatar_url as assignee_avatar,
          (
            SELECT COUNT(*) FROM task_comments tc 
            WHERE tc.task_id = t.id
          ) as comment_count
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
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
        total
      };
    } catch (error) {
      console.error('搜索任务失败:', error);
      throw error;
    }
  }
}

module.exports = { TaskService };