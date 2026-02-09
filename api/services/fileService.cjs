const { db } = require('../lib/database.cjs');

class FileService {
  // 保存文件信息到数据库
  async saveFileInfo(fileData) {
    try {
      const now = new Date();
      const [result] = await db.query(
        `INSERT INTO files (filename, original_name, file_path, file_size, mime_type, uploader_id, 
         project_id, task_id, category, description, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileData.filename,
          fileData.filename, // 使用filename作为original_name
          fileData.file_path,
          fileData.file_size,
          fileData.mime_type,
          fileData.uploader_id,
          fileData.project_id || null,
          fileData.task_id || null,
          fileData.category || 'other',
          fileData.description || null,
          now,
          now
        ]
      );
      
      const insertId = result.insertId;
      const file = await this.getFileById(insertId);
      
      return {
        success: true,
        data: file.data,
        message: '文件信息保存成功'
      };
    } catch (error) {
      console.error('保存文件信息错误:', error);
      return {
        success: false,
        message: '保存文件信息失败'
      };
    }
  }

  // 根据ID获取文件信息
  async getFileById(id) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM files WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return {
          success: false,
          message: '文件不存在'
        };
      }
      
      return {
        success: true,
        data: rows[0]
      };
    } catch (error) {
      console.error('获取文件信息错误:', error);
      return {
        success: false,
        message: '获取文件信息失败'
      };
    }
  }

  // 获取文件列表
  async getFiles(userId, userRole, pagination, sorting, filters) {
    try {
      let query = 'SELECT * FROM files WHERE 1=1';
      const params = [];
      
      // 应用过滤条件
      if (filters.project_id) {
        query += ' AND project_id = ?';
        params.push(filters.project_id);
      }
      
      if (filters.task_id) {
        query += ' AND task_id = ?';
        params.push(filters.task_id);
      }
      
      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }
      
      if (filters.uploader_id) {
        query += ' AND uploader_id = ?';
        params.push(filters.uploader_id);
      }
      
      if (filters.search) {
        query += ' AND (filename LIKE ? OR description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      // 应用排序
      if (sorting.sortBy) {
        query += ` ORDER BY ${sorting.sortBy} ${sorting.sortOrder || 'DESC'}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }
      
      // 应用分页
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(pagination.limit, offset);
      }
      
      const [rows] = await db.query(query, params);
      
      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM files WHERE 1=1';
      const countParams = [];
      
      if (filters.project_id) {
        countQuery += ' AND project_id = ?';
        countParams.push(filters.project_id);
      }
      
      if (filters.task_id) {
        countQuery += ' AND task_id = ?';
        countParams.push(filters.task_id);
      }
      
      if (filters.category) {
        countQuery += ' AND category = ?';
        countParams.push(filters.category);
      }
      
      if (filters.uploader_id) {
        countQuery += ' AND uploader_id = ?';
        countParams.push(filters.uploader_id);
      }
      
      if (filters.search) {
        countQuery += ' AND (filename LIKE ? OR description LIKE ?)';
        countParams.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      const [countRows] = await db.query(countQuery, countParams);
      const total = countRows[0].total;
      
      return {
        success: true,
        data: rows,
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || rows.length,
          total,
          totalPages: pagination ? Math.ceil(total / pagination.limit) : 1
        }
      };
    } catch (error) {
      console.error('获取文件列表错误:', error);
      return {
        success: false,
        message: '获取文件列表失败'
      };
    }
  }

  // 更新文件信息
  async updateFileInfo(id, updates) {
    try {
      const fields = Object.keys(updates).filter(key => key !== 'id');
      const values = fields.map(key => updates[key]);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      await db.query(
        `UPDATE files SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, new Date(), id]
      );
      
      const file = await this.getFileById(id);
      
      return {
        success: true,
        data: file.data,
        message: '文件信息更新成功'
      };
    } catch (error) {
      console.error('更新文件信息错误:', error);
      return {
        success: false,
        message: '更新文件信息失败'
      };
    }
  }

  // 删除文件记录
  async deleteFileRecord(id) {
    try {
      await db.query('DELETE FROM files WHERE id = ?', [id]);
      
      return {
        success: true,
        message: '文件记录删除成功'
      };
    } catch (error) {
      console.error('删除文件记录错误:', error);
      return {
        success: false,
        message: '删除文件记录失败'
      };
    }
  }

  // 检查项目访问权限
  async checkProjectAccess(userId, projectId) {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM project_members 
         WHERE project_id = ? AND user_id = ?`,
        [projectId, userId]
      );
      
      return rows[0].count > 0;
    } catch (error) {
      console.error('检查项目访问权限错误:', error);
      return false;
    }
  }

  // 检查任务访问权限
  async checkTaskAccess(userId, taskId) {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM tasks t
         LEFT JOIN project_members pm ON t.project_id = pm.project_id
         WHERE t.id = ? AND (t.assignee_id = ? OR t.user_id = ? OR pm.user_id = ?)`,
        [taskId, userId, userId, userId]
      );
      
      return rows[0].count > 0;
    } catch (error) {
      console.error('检查任务访问权限错误:', error);
      return false;
    }
  }

  // 获取项目文件
  async getProjectFiles(projectId, pagination, sorting, filters) {
    try {
      const projectFilters = { ...filters, project_id: projectId };
      return await this.getFiles(null, null, pagination, sorting, projectFilters);
    } catch (error) {
      console.error('获取项目文件错误:', error);
      return {
        success: false,
        message: '获取项目文件失败'
      };
    }
  }

  // 获取任务文件
  async getTaskFiles(taskId, pagination, sorting, filters) {
    try {
      const taskFilters = { ...filters, task_id: taskId };
      return await this.getFiles(null, null, pagination, sorting, taskFilters);
    } catch (error) {
      console.error('获取任务文件错误:', error);
      return {
        success: false,
        message: '获取任务文件失败'
      };
    }
  }

  // 获取用户上传的文件
  async getUserFiles(userId, pagination, sorting, filters) {
    try {
      const userFilters = { ...filters, uploader_id: userId };
      return await this.getFiles(userId, null, pagination, sorting, userFilters);
    } catch (error) {
      console.error('获取用户文件错误:', error);
      return {
        success: false,
        message: '获取用户文件失败'
      };
    }
  }

  // 获取文件列表（新增方法）
  async getFileList(options = {}) {
    try {
      const {
        userId,
        userRole,
        projectId,
        taskId,
        category,
        page = 1,
        limit = 20,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      console.log('getFileList 参数:', { userId, userRole, projectId, taskId, category, page, limit });

      // 使用字符串拼接而不是参数化查询来避免MySQL参数问题
      let query = 'SELECT * FROM files WHERE 1=1';

      // 应用过滤条件
      if (projectId) {
        query += ` AND project_id = ${parseInt(projectId)}`;
      }

      if (taskId) {
        query += ` AND task_id = ${parseInt(taskId)}`;
      }

      if (category) {
        query += ` AND category = '${category.replace(/'/g, "''")}'`;
      }

      if (search) {
        const escapedSearch = search.replace(/'/g, "''");
        query += ` AND (filename LIKE '%${escapedSearch}%' OR description LIKE '%${escapedSearch}%')`;
      }

      // 权限控制：非管理员只能看到自己上传的文件或公开文件
      if (userRole && userRole !== 'admin') {
        query += ` AND (uploader_id = ${parseInt(userId)} OR is_public = 1)`;
      }

      // 排序
      const allowedSortFields = ['filename', 'file_size', 'created_at', 'category'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${sortField} ${order}`;

      // 分页
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

      console.log('执行查询:', query);

      const [rows] = await db.query(query);

      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM files WHERE 1=1';

      if (projectId) {
        countQuery += ` AND project_id = ${parseInt(projectId)}`;
      }

      if (taskId) {
        countQuery += ` AND task_id = ${parseInt(taskId)}`;
      }

      if (category) {
        countQuery += ` AND category = '${category.replace(/'/g, "''")}'`;
      }

      if (search) {
        const escapedSearch = search.replace(/'/g, "''");
        countQuery += ` AND (filename LIKE '%${escapedSearch}%' OR description LIKE '%${escapedSearch}%')`;
      }

      if (userRole && userRole !== 'admin') {
        countQuery += ` AND (uploader_id = ${parseInt(userId)} OR is_public = 1)`;
      }

      const [countRows] = await db.query(countQuery);
      const total = countRows[0].total;

      return {
        success: true,
        data: {
          files: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      };
    } catch (error) {
      console.error('获取文件列表错误:', error);
      return {
        success: false,
        message: '获取文件列表失败'
      };
    }
  }

  // 获取文件统计信息
  async getFileStats(projectId = null) {
    try {
      let query = 'SELECT category, COUNT(*) as count, SUM(file_size) as total_size FROM files';
      const params = [];
      
      if (projectId) {
        query += ' WHERE project_id = ?';
        params.push(projectId);
      }
      
      query += ' GROUP BY category';
      
      const [rows] = await db.query(query, params);
      
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byCategory: {}
      };
      
      rows.forEach(row => {
        stats.totalFiles += row.count;
        stats.totalSize += row.total_size || 0;
        stats.byCategory[row.category] = {
          count: row.count,
          size: row.total_size || 0
        };
      });
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('获取文件统计错误:', error);
      return {
        success: false,
        message: '获取文件统计失败'
      };
    }
  }
}

module.exports = { FileService };