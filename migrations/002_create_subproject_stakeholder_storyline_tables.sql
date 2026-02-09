-- 创建子项目表
CREATE TABLE IF NOT EXISTS subprojects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  parent_id INT NOT NULL,
  project_level INT DEFAULT 1,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  owner_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_owner_id (owner_id),
  INDEX idx_project_level (project_level),
  FOREIGN KEY (parent_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建利益相关者表
CREATE TABLE IF NOT EXISTS stakeholders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('internal', 'external', 'customer', 'vendor', 'partner') DEFAULT 'internal',
  role ENUM('sponsor', 'manager', 'team_member', 'client', 'user', 'advisor', 'other') DEFAULT 'other',
  contact_info JSON,
  influence_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  interest_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  communication_frequency ENUM('daily', 'weekly', 'monthly', 'quarterly', 'as_needed') DEFAULT 'as_needed',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_id (project_id),
  INDEX idx_type (type),
  INDEX idx_role (role),
  INDEX idx_influence_level (influence_level),
  INDEX idx_interest_level (interest_level),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 创建故事线记录表
CREATE TABLE IF NOT EXISTS storylines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  event_time DATETIME NOT NULL,
  stakeholder_ids JSON,
  next_follow_up DATETIME,
  expected_outcome TEXT,
  actual_outcome TEXT,
  tags JSON,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_id (project_id),
  INDEX idx_event_time (event_time),
  INDEX idx_next_follow_up (next_follow_up),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 更新项目表，添加子项目支持字段
ALTER TABLE projects 
ADD COLUMN parent_id INT DEFAULT NULL,
ADD COLUMN project_level INT DEFAULT 0,
ADD INDEX idx_parent_id (parent_id),
ADD INDEX idx_project_level (project_level);

-- 添加外键约束（如果parent_id不为空）
-- 注意：这个约束需要在有数据后谨慎添加
-- ALTER TABLE projects ADD FOREIGN KEY (parent_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 创建子项目任务关联表（可选，用于更复杂的任务管理）
CREATE TABLE IF NOT EXISTS subproject_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subproject_id INT NOT NULL,
  task_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_subproject_task (subproject_id, task_id),
  INDEX idx_subproject_id (subproject_id),
  INDEX idx_task_id (task_id),
  FOREIGN KEY (subproject_id) REFERENCES subprojects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 创建故事线附件表
CREATE TABLE IF NOT EXISTS storyline_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  storyline_id INT NOT NULL,
  file_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_storyline_id (storyline_id),
  INDEX idx_file_id (file_id),
  FOREIGN KEY (storyline_id) REFERENCES storylines(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 插入示例数据
INSERT IGNORE INTO stakeholders (project_id, name, type, role, contact_info, influence_level, interest_level, communication_frequency, notes) VALUES 
(1, '项目发起人', 'internal', 'sponsor', '{"email": "sponsor@company.com", "phone": "13800138000"}', 'critical', 'high', 'weekly', '项目的主要决策者和资源提供者'),
(1, '技术负责人', 'internal', 'manager', '{"email": "tech@company.com", "phone": "13800138001"}', 'high', 'high', 'daily', '负责技术架构和开发管理'),
(1, '最终用户代表', 'external', 'user', '{"email": "user@client.com", "phone": "13800138002"}', 'medium', 'critical', 'weekly', '代表最终用户需求和反馈');

INSERT IGNORE INTO storylines (project_id, title, content, event_time, stakeholder_ids, next_follow_up, expected_outcome, created_by) VALUES 
(1, '项目启动会议', '召开项目启动会议，明确项目目标、范围和关键里程碑。参与人员包括项目发起人、技术负责人和核心团队成员。', '2024-01-15 09:00:00', '[1, 2]', '2024-01-22 09:00:00', '所有参与者对项目目标达成一致，确定项目计划', 1),
(1, '需求调研会议', '与最终用户代表进行深入的需求调研，收集详细的功能需求和用户体验要求。', '2024-01-20 14:00:00', '[3]', '2024-01-27 14:00:00', '完成详细需求文档，确定核心功能优先级', 1);
