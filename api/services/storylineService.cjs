const { db } = require('../lib/database.cjs');

// 兼容旧/新表结构的列映射与时间格式处理
const formatDateTimeForMySQL = (dt) => {
  if (!dt) return null;
  const pad = (n) => String(n).padStart(2, '0');
  // string inputs
  if (typeof dt === 'string') {
    const t = dt.trim();
    // match YYYY-MM-DD
    const mDate = /^\d{4}-\d{2}-\d{2}$/.test(t);
    if (mDate) return `${t} 00:00:00`;
    // match YYYY-MM-DD HH:mm or HH:mm:ss
    const mDateTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(t);
    if (mDateTime) {
      return t.length === 16 ? `${t}:00` : t; // ensure seconds
    }
    // ISO string with T/Z
    if (t.includes('T')) {
      const d = new Date(t);
      if (isNaN(d.getTime())) return null;
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
    }
    // fallback parse
    const d = new Date(t);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
  }
  // Date object input
  if (dt instanceof Date) {
    if (isNaN(dt.getTime())) return null;
    const yyyy = dt.getFullYear();
    const MM = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    const HH = pad(dt.getHours());
    const mm = pad(dt.getMinutes());
    const ss = pad(dt.getSeconds());
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
  }
  return null;
};

const normalizeRow = (row) => {
  if (!row) return row;
  const r = { ...row };
  if (r.content === undefined && r.story_content !== undefined) {
    r.content = r.story_content;
  }
  if (r.next_follow_up === undefined && r.follow_up_time !== undefined) {
    r.next_follow_up = r.follow_up_time;
  }
  return r;
};

class StorylineService {
  static _columnMap = null;

  static async ensureColumnMap() {
    if (this._columnMap) return this._columnMap;
    const [cols] = await db.query('SHOW COLUMNS FROM storylines');
    const names = cols.map((c) => c.Field);
    const hasContent = names.includes('content');
    const hasStoryContent = names.includes('story_content');
    const hasNextFollowUp = names.includes('next_follow_up');
    const hasFollowUpTime = names.includes('follow_up_time');
    this._columnMap = {
      contentColumn: hasContent ? 'content' : (hasStoryContent ? 'story_content' : 'content'),
      nextFollowUpColumn: hasNextFollowUp ? 'next_follow_up' : (hasFollowUpTime ? 'follow_up_time' : 'next_follow_up')
    };
    return this._columnMap;
  }
  // 获取项目的故事线列表
  static async getStorylines(projectId, userId, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'event_time', sortOrder = 'DESC' } = options;
      const offset = (page - 1) * limit;

      // 检查用户是否有权限访问该项目
      const [projects] = await db.query(
        'SELECT id FROM projects WHERE id = ?',
        [projectId]
      );
      
      if (projects.length === 0) {
        throw new Error('项目不存在');
      }

      let whereClause = 'WHERE s.project_id = ?';
      const queryParams = [parseInt(projectId)];

      // 验证排序字段和顺序
      const validSortFields = ['event_time', 'created_at', 'title'];
      const validSortOrders = ['ASC', 'DESC'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'event_time';
      const safeSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'DESC';

      // 使用简单的查询，不使用参数化查询来避免问题
      const query = `
        SELECT 
          s.*,
          u.username as created_by_name
        FROM storylines s
        LEFT JOIN users u ON s.created_by = u.id
        WHERE s.project_id = ${parseInt(projectId)}
        ORDER BY s.${safeSortBy} ${safeSortOrder}
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      console.log('SQL查询:', query);
      const [rows] = await db.query(query);
      const normalizedRows = Array.isArray(rows) ? rows.map(normalizeRow) : [];

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM storylines s
        WHERE s.project_id = ${parseInt(projectId)}
      `;
      const [countResult] = await db.query(countQuery);

      return {
        storylines: normalizedRows,
        total: countResult[0].total,
        page,
        limit,
        totalPages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('获取故事线失败:', error);
      throw new Error(error.message || '获取故事线失败');
    }
  }

  // 创建故事线
  static async createStoryline(projectId, storylineData, userId) {
    try {
      // 检查项目权限
      const [projects] = await db.query(
        'SELECT id FROM projects WHERE id = ?',
        [projectId]
      );
      
      if (projects.length === 0) {
        throw new Error('项目不存在');
      }

      const {
        title,
        content = '',
        event_time,
        stakeholder_ids = ''
      } = storylineData;

      const { contentColumn } = await this.ensureColumnMap();

      // 验证并规范化stakeholder_ids为JSON
      let stakeholderIdArray = [];
      if (stakeholder_ids) {
        if (Array.isArray(stakeholder_ids)) {
          stakeholderIdArray = stakeholder_ids;
        } else if (typeof stakeholder_ids === 'string') {
          const t = stakeholder_ids.trim();
          if (t.startsWith('[')) {
            try { const parsed = JSON.parse(t); if (Array.isArray(parsed)) stakeholderIdArray = parsed; } catch {}
          } else {
            stakeholderIdArray = t.split(',').map(s => s.trim()).filter(Boolean);
          }
        }

        stakeholderIdArray = stakeholderIdArray.map(id => parseInt(id, 10)).filter(Number.isFinite);

        if (stakeholderIdArray.length > 0) {
          const placeholders = stakeholderIdArray.map(() => '?').join(',');
          const [stakeholders] = await db.query(
            `SELECT id FROM stakeholders WHERE id IN (${placeholders}) AND project_id = ?`,
            [...stakeholderIdArray, projectId]
          );
          if (stakeholders.length !== stakeholderIdArray.length) {
            throw new Error('部分干系人不存在或不属于该项目');
          }
        }
      }
      const processedStakeholderIds = stakeholderIdArray.length > 0 ? JSON.stringify(stakeholderIdArray) : null;
      const eventTimeFormatted = formatDateTimeForMySQL(event_time);

      // 调试日志：打印将要插入的字段与值
      console.log('[Storylines][Create] INSERT fields:', {
        project_id: projectId,
        title,
        content,
        event_time: eventTimeFormatted,
        stakeholder_ids: processedStakeholderIds,
        created_by: userId
      });

      let sql;
      let params;
      if (eventTimeFormatted) {
        const stakeHolderValueFragment = processedStakeholderIds === null ? 'NULL' : '?';
        sql = `INSERT INTO storylines (
          project_id, title, ${contentColumn}, event_time, stakeholder_ids,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ${stakeHolderValueFragment}, ?, NOW(), NOW())`;
        params = processedStakeholderIds === null
          ? [projectId, title, content, eventTimeFormatted, userId]
          : [projectId, title, content, eventTimeFormatted, processedStakeholderIds, userId];
      } else {
        const stakeHolderValueFragment = processedStakeholderIds === null ? 'NULL' : '?';
        sql = `INSERT INTO storylines (
          project_id, title, ${contentColumn}, event_time, stakeholder_ids,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, NOW(), ${stakeHolderValueFragment}, ?, NOW(), NOW())`;
        params = processedStakeholderIds === null
          ? [projectId, title, content, userId]
          : [projectId, title, content, processedStakeholderIds, userId];
      }
      console.log('[Storylines][Create] SQL:', sql);
      console.log('[Storylines][Create] Params:', params);
      const undefinedIndex = params.findIndex(v => v === undefined);
      if (undefinedIndex !== -1) {
        console.error('[Storylines][Create] 参数包含 undefined:', {
          index: undefinedIndex,
          sql,
          params,
          derived: { projectId, title, content, eventTimeFormatted, processedStakeholderIds, userId }
        });
      }
      const [result] = await db.query(sql, params);

      return await this.getStorylineById(result.insertId);
    } catch (error) {
      console.error('创建故事线失败:', error);
      if (error && error.sql) {
        console.error('SQL语句:', error.sql);
      }
      const msg = `${error.message || '创建故事线失败'}${sql ? ` | SQL: ${sql}` : ''}`;
      throw new Error(msg);
    }
  }

  // 获取故事线详情
  static async getStorylineById(id) {
    try {
      const query = `
        SELECT 
          s.*,
          u.username as created_by_name,
          p.name as project_name
        FROM storylines s
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.id = ?
      `;
      
      const [rows] = await db.query(query, [id]);
      
      if (rows.length === 0) {
        throw new Error('故事线不存在');
      }

      const storyline = normalizeRow(rows[0]);

      // 获取关联的干系人信息(JSON存储，兼容逗号分隔旧数据)
      if (storyline.stakeholder_ids) {
        let stakeholderIds = [];
        try {
          const parsed = typeof storyline.stakeholder_ids === 'string'
            ? JSON.parse(storyline.stakeholder_ids)
            : storyline.stakeholder_ids;
          if (Array.isArray(parsed)) {
            stakeholderIds = parsed.map(id => parseInt(id, 10)).filter(Number.isFinite);
          }
        } catch (e) {
          stakeholderIds = String(storyline.stakeholder_ids).split(',').map(s => parseInt(s, 10)).filter(Number.isFinite);
        }

        if (stakeholderIds.length > 0) {
          const [stakeholders] = await db.query(
            `SELECT * FROM stakeholders WHERE id IN (${stakeholderIds.map(() => '?').join(',')})`,
            stakeholderIds
          );
          storyline.stakeholders = stakeholders;
        }
      }
      
      return storyline;
    } catch (error) {
      console.error('获取故事线详情失败:', error);
      throw new Error('获取故事线详情失败');
    }
  }

  // 更新故事线
  static async updateStoryline(id, updates, userId) {
    try {
      // 检查权限
      const [storylines] = await db.query(
        `SELECT s.id
         FROM storylines s
         WHERE s.id = ?`,
        [id]
      );
      
      if (storylines.length === 0) {
        throw new Error('故事线不存在');
      }

      const { contentColumn, nextFollowUpColumn } = await this.ensureColumnMap();
      const updateFields = [];
      const updateValues = [];

      const allowedFields = ['title', 'content', 'event_time', 'stakeholder_ids', 'next_follow_up', 'expected_outcome'];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          if (field === 'stakeholder_ids') {
            let arr = updates[field];
            if (typeof arr === 'string') {
              const t = arr.trim();
              if (t.startsWith('[')) { try { arr = JSON.parse(t); } catch {} }
              else { arr = t.split(',').map(s => s.trim()).filter(Boolean); }
            }
            if (Array.isArray(arr)) {
              arr = JSON.stringify(arr.map(id => parseInt(id, 10)).filter(Number.isFinite));
            }
            updateFields.push(`${field} = ?`);
            updateValues.push(arr);
          } else if (field === 'content') {
            updateFields.push(`${contentColumn} = ?`);
            updateValues.push(updates[field]);
          } else if (field === 'next_follow_up') {
            updateFields.push(`${nextFollowUpColumn} = ?`);
            updateValues.push(formatDateTimeForMySQL(updates[field]));
          } else if (field === 'event_time') {
            updateFields.push(`${field} = ?`);
            updateValues.push(formatDateTimeForMySQL(updates[field]));
          } else {
            updateFields.push(`${field} = ?`);
            updateValues.push(updates[field]);
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('没有可更新的字段');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await db.query(
        `UPDATE storylines SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.getStorylineById(id);
    } catch (error) {
      console.error('更新故事线失败:', error);
      throw new Error(error.message || '更新故事线失败');
    }
  }

  // 删除故事线
  static async deleteStoryline(id, userId) {
    try {
      // 检查权限
      const [storylines] = await db.query(
        `SELECT s.id
         FROM storylines s
         WHERE s.id = ?`,
        [id]
      );
      
      if (storylines.length === 0) {
        throw new Error('故事线不存在');
      }

      await db.query('DELETE FROM storylines WHERE id = ?', [id]);
      
      return { success: true, message: '故事线删除成功' };
    } catch (error) {
      console.error('删除故事线失败:', error);
      throw new Error(error.message || '删除故事线失败');
    }
  }

  // 获取即将到期的跟进事项
  static async getUpcomingFollowups(userId, days = 7) {
    try {
      const { nextFollowUpColumn } = await this.ensureColumnMap();
      const query = `
        SELECT 
          s.*,
          p.name as project_name,
          u.username as created_by_name
        FROM storylines s
        JOIN projects p ON s.project_id = p.id
        LEFT JOIN users u ON s.created_by = u.id
        WHERE p.owner_id = ? 
          AND s.${nextFollowUpColumn} IS NOT NULL
          AND s.${nextFollowUpColumn} <= DATE_ADD(NOW(), INTERVAL ? DAY)
        ORDER BY s.${nextFollowUpColumn} ASC
      `;
      
      const [rows] = await db.query(query, [userId, days]);
      return Array.isArray(rows) ? rows.map(normalizeRow) : [];
    } catch (error) {
      console.error('获取即将到期的跟进事项失败:', error);
      throw new Error('获取即将到期的跟进事项失败');
    }
  }
}

module.exports = { StorylineService };
