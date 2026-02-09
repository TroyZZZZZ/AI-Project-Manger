const { db } = require('../lib/database.cjs');

class StakeholderService {
  // 获取所有项目的干系人列表（全局）
  static async getAllStakeholders(userId, options = {}) {
    try {
      const { page = 1, limit = 50, type, search, excludeResigned } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE p.owner_id = ?';
      const queryParams = [parseInt(userId)];

      if (excludeResigned) {
        whereClause += ' AND (s.is_resigned = FALSE OR s.is_resigned IS NULL)';
      }

      if (type) {
        whereClause += ' AND REPLACE(s.identity_type, " ", "") = ?';
        queryParams.push(String(type).replace(/\s+/g, ''));
      }

      if (search) {
        const searchPattern = `%${search}%`;
        whereClause += ' AND (s.name LIKE ? OR s.role LIKE ? OR s.company LIKE ?)';
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const query = `
        SELECT s.*, p.name AS project_name
        FROM stakeholders s
        JOIN projects p ON s.project_id = p.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [rows] = await db.query(query, queryParams);

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM stakeholders s
        JOIN projects p ON s.project_id = p.id
        ${whereClause}
      `;
      const [countRows] = await db.query(countQuery, queryParams);

      return {
        data: rows,
        total: countRows[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countRows[0].total / parseInt(limit))
      };
    } catch (error) {
      console.error('获取所有干系人失败:', error);
      throw new Error(error.message || '获取所有干系人失败');
    }
  }
  // 获取项目的干系人列表
  static async getStakeholders(projectId, userId, options = {}) {
    try {
      const { page = 1, limit = 50, type, search, excludeResigned } = options;
      const offset = (page - 1) * limit;

      // 检查用户是否有权限访问该项目
      const [projects] = await db.query(
        'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
        [projectId, userId]
      );
      
      if (projects.length === 0) {
        throw new Error('项目不存在或无权限');
      }

      let whereClause = 'WHERE project_id = ?';
      const queryParams = [parseInt(projectId)];

      if (excludeResigned) {
        whereClause += ' AND (is_resigned = FALSE OR is_resigned IS NULL)';
      }

      if (type) {
        // 使用去空格后的 identity_type 进行类型筛选，避免数据中的意外空格导致不匹配
        whereClause += ' AND REPLACE(identity_type, " ", "") = ?';
        queryParams.push(String(type).replace(/\s+/g, ''));
      }

      if (search) {
        whereClause += ' AND (name LIKE ? OR role LIKE ? OR company LIKE ?)';
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const query = `
        SELECT *
        FROM stakeholders
        ${whereClause}
        ORDER BY CONVERT(name USING gbk) ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const [rows] = await db.query(query, queryParams);

      // 获取总数查询参数（不包含LIMIT和OFFSET）
      const countParams = queryParams;
      const countQuery = `
        SELECT COUNT(*) as total
        FROM stakeholders
        ${whereClause}
      `;
      const [countResult] = await db.query(countQuery, countParams);

      return {
        data: rows,
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      };
    } catch (error) {
      console.error('获取干系人失败:', error);
      throw new Error(error.message || '获取干系人失败');
    }
  }

  // 创建干系人
  static async createStakeholder(projectId, stakeholderData, userId) {
    try {
      const {
        name,
        role,
        company,
        identity_type,
        is_resigned
      } = stakeholderData;

      // 验证必填字段
      if (!name) {
        throw new Error('姓名为必填字段');
      }

      const [dups] = await db.query(
        'SELECT id FROM stakeholders WHERE REPLACE(REPLACE(REPLACE(name, " ", ""), " ", ""), "　", "") = REPLACE(REPLACE(REPLACE(?, " ", ""), " ", ""), "　", "")',
        [name]
      );

      if (dups && dups.length > 0) {
        throw new Error('系统已存在相同姓名的干系人');
      }

      const [result] = await db.query(
        `INSERT INTO stakeholders (
          project_id, name, role, company, identity_type, is_resigned, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [projectId, name, role || null, company || null, identity_type || null, is_resigned || false]
      );

      // 直接返回插入的数据，避免额外查询
      return {
        id: result.insertId,
        project_id: projectId,
        name,
        role: role || null,
        company: company || null,
        identity_type: identity_type || null,
        is_resigned: is_resigned || false,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error('创建干系人失败:', error);
      if (error && error.code === 'ER_DUP_ENTRY') {
        throw new Error('系统已存在相同姓名的干系人');
      }
      throw new Error(error.message || '创建干系人失败');
    }
  }

  // 获取干系人详情
  static async getStakeholderById(id) {
    try {
      const query = `
        SELECT 
          s.*,
          p.name as project_name
        FROM stakeholders s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.id = ?
      `;
      
      const [rows] = await db.query(query, [id]);
      
      if (rows.length === 0) {
        throw new Error('干系人不存在');
      }
      
      return rows[0];
    } catch (error) {
      console.error('获取干系人详情失败:', error);
      throw new Error('获取干系人详情失败');
    }
  }

  // 更新干系人
  static async updateStakeholder(id, updates, userId) {
    try {
      // 检查权限
      const [stakeholders] = await db.query(
        `SELECT s.id, s.project_id, p.owner_id 
         FROM stakeholders s 
         JOIN projects p ON s.project_id = p.id 
         WHERE s.id = ? AND p.owner_id = ?`,
        [id, userId]
      );
      
      if (stakeholders.length === 0) {
        throw new Error('干系人不存在或无权限');
      }

      // 重名校验：若更新了 name，检查全局是否已有同名（去空格）且不是自身
      if (updates.name !== undefined) {
        const [dups] = await db.query(
          'SELECT id FROM stakeholders WHERE REPLACE(REPLACE(REPLACE(name, " ", ""), " ", ""), "　", "") = REPLACE(REPLACE(REPLACE(?, " ", ""), " ", ""), "　", "") AND id <> ?',
          [updates.name, id]
        )
        if (dups && dups.length > 0) {
          throw new Error('系统已存在相同姓名的干系人')
        }
      }

      const updateFields = [];
      const updateValues = [];

      // 允许更新的字段，包含身份类型
      const allowedFields = ['name', 'role', 'company', 'identity_type', 'is_resigned'];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updates[field]);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('没有可更新的字段');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await db.query(
        `UPDATE stakeholders SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.getStakeholderById(id);
    } catch (error) {
      console.error('更新干系人失败:', error);
      if (error && error.code === 'ER_DUP_ENTRY') {
        throw new Error('系统已存在相同姓名的干系人');
      }
      throw new Error(error.message || '更新干系人失败');
    }
  }

  // 删除干系人
  static async deleteStakeholder(id, projectId, userId) {
    try {
      // 检查权限
      const [stakeholders] = await db.query(
        `SELECT s.id, p.owner_id 
         FROM stakeholders s 
         JOIN projects p ON s.project_id = p.id 
         WHERE s.id = ? AND s.project_id = ? AND p.owner_id = ?`,
        [id, projectId, userId]
      );
      
      if (stakeholders.length === 0) {
        throw new Error('干系人不存在或无权限');
      }

      // 检查是否被故事线引用
      const [storylines] = await db.query(
        'SELECT id FROM storylines WHERE FIND_IN_SET(?, stakeholder_ids) > 0',
        [id]
      );
      
      if (storylines.length > 0) {
        throw new Error('该干系人已被故事线引用，无法删除');
      }

      await db.query('DELETE FROM stakeholders WHERE id = ?', [id]);
      
      return { success: true, message: '干系人删除成功' };
    } catch (error) {
      console.error('删除干系人失败:', error);
      throw new Error(error.message || '删除干系人失败');
    }
  }

  // 批量导入干系人
  static async batchImportStakeholders(projectId, stakeholdersData, userId) {
    try {
      // 检查项目权限
      const [projects] = await db.query(
        'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
        [projectId, userId]
      );
      
      if (projects.length === 0) {
        throw new Error('项目不存在或无权限');
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < stakeholdersData.length; i++) {
        try {
          const stakeholder = await this.createStakeholder(projectId, stakeholdersData[i], userId);
          results.push(stakeholder);
        } catch (error) {
          errors.push({
            index: i,
            data: stakeholdersData[i],
            error: error.message
          });
        }
      }

      return {
        success: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      console.error('批量导入干系人失败:', error);
      throw new Error(error.message || '批量导入干系人失败');
    }
  }

  // 获取干系人统计信息
  static async getStakeholderStats(projectId, userId) {
    try {
      // 验证输入参数
      if (!projectId || !userId) {
        throw new Error('项目ID和用户ID不能为空');
      }

      // 检查项目权限
      const [projects] = await db.query(
        'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
        [projectId, userId]
      );
      
      if (projects.length === 0) {
        throw new Error('项目不存在或无权限');
      }

      // 获取按身份类型统计 (使用identity_type字段)
      const typeQuery = `
        SELECT 
          identity_type,
          COUNT(*) as count
        FROM stakeholders
        WHERE project_id = ? AND identity_type IS NOT NULL
        GROUP BY identity_type
      `;
      
      const [typeRows] = await db.query(typeQuery, [projectId]);
      
      // 获取按角色统计
      const roleQuery = `
        SELECT 
          role,
          COUNT(*) as count
        FROM stakeholders
        WHERE project_id = ?
        GROUP BY role
      `;
      
      const [roleRows] = await db.query(roleQuery, [projectId]);

      // 初始化统计数据
      const by_type = {
        supplier: 0,
        suzhou_tech_equity_service: 0
      };

      const by_role = {
        sponsor: 0,
        owner: 0,
        manager: 0,
        member: 0,
        consultant: 0,
        user: 0,
        reviewer: 0,
        stakeholder: 0,
        observer: 0
      };

      let total = 0;

      // 处理类型统计
      typeRows.forEach(row => {
        total += row.count;
        if (by_type.hasOwnProperty(row.identity_type)) {
          by_type[row.identity_type] = row.count;
        }
      });

      // 处理角色统计
      roleRows.forEach(row => {
        if (by_role.hasOwnProperty(row.role)) {
          by_role[row.role] = row.count;
        }
      });

      return {
        total,
        by_type,
        by_role
      };
    } catch (error) {
      console.error('获取干系人统计失败:', error);
      
      // 如果是已知的业务错误，直接抛出
      if (error.message === '项目不存在或无权限' || error.message === '项目ID和用户ID不能为空') {
        throw error;
      }
      
      // 其他错误统一处理
      throw new Error('获取干系人统计失败');
    }
  }
}

module.exports = { StakeholderService };
