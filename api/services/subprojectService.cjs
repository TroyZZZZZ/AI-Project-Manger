const { db } = require('../lib/database.cjs');
const { dbValidator } = require('../utils/dbValidator.cjs');

class SubprojectService {
  // 获取项目的子项目列表（单用户系统）
  static async getSubprojects(projectId) {
    try {
      const query = `
        SELECT 
          p.*,
          COUNT(DISTINCT t.id) as task_count,
          COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
        FROM projects p
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.parent_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
      
      // 验证SQL中的字段名
      if (!dbValidator.validateSqlColumns('projects', query)) {
        throw new Error('SQL查询包含无效的字段名');
      }
      
      const [rows] = await db.query(query, [projectId]);
      return rows;
    } catch (error) {
      console.error('获取子项目失败:', error);
      throw new Error('获取子项目失败');
    }
  }

  // 创建子项目（单用户系统）
  static async createSubproject(parentId, projectData, userId) {
    try {
      // 检查父项目是否存在
      const [parentProjects] = await db.query(
        'SELECT id FROM projects WHERE id = ?',
        [parentId]
      );
      
      if (parentProjects.length === 0) {
        throw new Error('父项目不存在');
      }
      
      const {
        name,
        description,
        status = 'planning',
        start_date,
        end_date
      } = projectData;

      const [result] = await db.query(
        `INSERT INTO projects (
          name, description, status, start_date, end_date,
          owner_id, parent_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          name, 
          description || null, 
          status, 
          start_date || null, 
          end_date || null, 
          userId, 
          parentId
        ]
      );

      // 获取创建的子项目详情
      const subproject = await this.getSubprojectById(result.insertId);
      return subproject;
    } catch (error) {
      console.error('创建子项目失败:', error);
      throw new Error(error.message || '创建子项目失败');
    }
  }

  // 获取子项目详情
  static async getSubprojectById(id) {
    try {
      const query = `
        SELECT 
          p.*,
          u.username as owner_name,
          parent.name as parent_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN projects parent ON p.parent_id = parent.id
        WHERE p.id = ?
      `;
      
      const [rows] = await db.query(query, [id]);
      
      if (rows.length === 0) {
        throw new Error('子项目不存在');
      }
      
      return rows[0];
    } catch (error) {
      console.error('获取子项目详情失败:', error);
      throw new Error('获取子项目详情失败');
    }
  }

  // 更新子项目
  static async updateSubproject(id, updates, userId) {
    try {
      // 检查权限
      const [projects] = await db.query(
        'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
        [id, userId]
      );
      
      if (projects.length === 0) {
        throw new Error('子项目不存在或无权限');
      }

      const updateFields = [];
      const updateValues = [];

      const allowedFields = ['name', 'description', 'status', 'start_date', 'end_date'];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updates[field] || null);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('没有可更新的字段');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await db.query(
        `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.getSubprojectById(id);
    } catch (error) {
      console.error('更新子项目失败:', error);
      throw new Error(error.message || '更新子项目失败');
    }
  }

  // 删除子项目
  static async deleteSubproject(id, projectId, userId) {
    try {
      // 检查子项目是否存在且属于指定的父项目
      const [projects] = await db.query(
        'SELECT id, parent_id FROM projects WHERE id = ? AND parent_id = ? AND owner_id = ?',
        [id, projectId, userId]
      );
      
      if (projects.length === 0) {
        throw new Error('子项目不存在或无权限');
      }

      // 检查是否有子项目
      const [subprojects] = await db.query(
        'SELECT id FROM projects WHERE parent_id = ?',
        [id]
      );
      
      if (subprojects.length > 0) {
        throw new Error('请先删除所有子项目');
      }

      await db.query('DELETE FROM projects WHERE id = ?', [id]);
      
      return { success: true, message: '子项目删除成功' };
    } catch (error) {
      console.error('删除子项目失败:', error);
      throw new Error(error.message || '删除子项目失败');
    }
  }

  // 获取项目树结构
  static async getProjectTree(rootProjectId, userId) {
    try {
      const buildTree = async (parentId, level = 0) => {
        const query = `
          SELECT 
            p.*,
            u.username as owner_name,
            COUNT(DISTINCT t.id) as task_count,
            COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
          FROM projects p
          LEFT JOIN users u ON p.owner_id = u.id
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE ${parentId ? 'p.parent_id = ?' : 'p.id = ? AND p.parent_id IS NULL'}
          GROUP BY p.id
          ORDER BY p.created_at DESC
        `;
        
        const [projects] = await db.query(query, [parentId || rootProjectId]);
        
        for (const project of projects) {
          project.children = await buildTree(project.id, level + 1);
        }
        
        return projects;
      };

      return await buildTree(rootProjectId);
    } catch (error) {
      console.error('获取项目树失败:', error);
      throw new Error('获取项目树失败');
    }
  }
}

module.exports = { SubprojectService };