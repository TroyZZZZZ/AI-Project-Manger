-- 个人项目管理系统数据库初始化脚本
-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS project_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE project_management;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  role ENUM('admin', 'manager', 'member') DEFAULT 'member',
  last_login DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- 刷新令牌表
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  owner_id INT NOT NULL,
  parent_id INT NULL,
  project_level INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_owner_id (owner_id)
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS project_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner', 'manager', 'member', 'viewer') DEFAULT 'member',
  joined_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_user (project_id, user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_user_id (user_id)
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assignee_id INT,
  reporter_id INT NOT NULL,
  parent_task_id INT,
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2),
  start_date DATE,
  due_date DATE,
  completed_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  INDEX idx_project_id (project_id),
  INDEX idx_assignee_id (assignee_id),
  INDEX idx_reporter_id (reporter_id),
  INDEX idx_due_date (due_date)
);

-- 任务依赖表
CREATE TABLE IF NOT EXISTS task_dependencies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
  created_at DATETIME NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_dependency (task_id, depends_on_task_id),
  INDEX idx_task_id (task_id),
  INDEX idx_depends_on_task_id (depends_on_task_id)
);

-- 时间线事件表
CREATE TABLE IF NOT EXISTS timeline_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  event_type ENUM('project', 'task', 'milestone', 'deadline', 'stakeholder', 'comment') NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  date DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_date (date)
);

-- 提醒表
CREATE TABLE IF NOT EXISTS reminders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT,
  task_id INT,
  type ENUM('task', 'project', 'meeting', 'deadline', 'milestone', 'review', 'custom') NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  remind_at DATETIME NOT NULL,
  recipients JSON,
  created_by INT NOT NULL,
  sent_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_task_id (task_id),
  INDEX idx_remind_at (remind_at),
  INDEX idx_created_by (created_by)
);

-- 文件附件表
CREATE TABLE IF NOT EXISTS attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT,
  task_id INT,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_task_id (task_id),
  INDEX idx_uploaded_by (uploaded_by)
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT,
  task_id INT,
  content TEXT NOT NULL,
  author_id INT NOT NULL,
  parent_comment_id INT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_task_id (task_id),
  INDEX idx_author_id (author_id)
);

-- 工作日志表
CREATE TABLE IF NOT EXISTS work_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  task_id INT,
  user_id INT NOT NULL,
  description TEXT,
  hours_spent DECIMAL(8,2) NOT NULL,
  work_date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  INDEX idx_work_date (work_date)
);

-- 里程碑表
CREATE TABLE IF NOT EXISTS milestones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completion_date DATE,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_due_date (due_date)
);

-- 插入默认用户
INSERT IGNORE INTO users (id, username, email, password, role, created_at, updated_at) VALUES 
(1, 'user', 'user@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx/LbDhm', 'member', NOW(), NOW());
-- 默认密码是: admin123

-- 插入示例项目
INSERT IGNORE INTO projects (id, name, description, start_date, end_date, budget, progress, owner_id, created_at, updated_at) VALUES 
(1, '个人项目管理系统', '一个功能完整的项目管理系统', '2024-01-01', '2024-12-31', 50000.00, 65.5, 1, NOW(), NOW());

-- 插入项目成员
INSERT IGNORE INTO project_members (project_id, user_id, role, joined_at) VALUES 
(1, 1, 'owner', NOW());

-- 插入示例任务
INSERT IGNORE INTO tasks (id, project_id, title, description, assignee_id, reporter_id, estimated_hours, start_date, due_date, created_at, updated_at) VALUES 
(1, 1, '系统架构设计', '设计系统整体架构和技术选型', 1, 1, 40.0, '2024-01-01', '2024-01-15', NOW(), NOW()),
(2, 1, '数据库设计', '设计数据库表结构和关系', 1, 1, 24.0, '2024-01-16', '2024-01-25', NOW(), NOW()),
(3, 1, '前端界面开发', '开发用户界面和交互功能', 1, 1, 80.0, '2024-01-26', '2024-03-15', NOW(), NOW()),
(4, 1, '后端API开发', '开发后端接口和业务逻辑', 1, 1, 60.0, '2024-02-01', '2024-03-01', NOW(), NOW()),
(5, 1, '系统测试', '进行系统功能测试和性能测试', 1, 1, 32.0, '2024-03-16', '2024-03-31', NOW(), NOW());

-- 插入示例里程碑
INSERT IGNORE INTO milestones (id, project_id, title, description, due_date, created_by, created_at, updated_at) VALUES 
(1, 1, '系统设计完成', '完成系统架构和数据库设计', '2024-01-25', 1, NOW(), NOW()),
(2, 1, '开发阶段完成', '完成前后端开发工作', '2024-03-15', 1, NOW(), NOW()),
(3, 1, '系统上线', '完成测试并正式上线', '2024-03-31', 1, NOW(), NOW());

-- 插入示例时间线事件
INSERT IGNORE INTO timeline_events (project_id, user_id, event_type, title, description, date, created_at, updated_at) VALUES 
(1, 1, 'project', '项目启动', '个人项目管理系统项目正式启动', '2024-01-01 09:00:00', NOW(), NOW()),
(1, 1, 'milestone', '设计阶段完成', '系统架构和数据库设计已完成', '2024-01-25 18:00:00', NOW(), NOW()),
(1, 1, 'task', '开始前端开发', '开始进行用户界面开发工作', '2024-01-26 09:00:00', NOW(), NOW());

-- 插入示例工作日志
INSERT IGNORE INTO work_logs (project_id, task_id, user_id, description, hours_spent, work_date, created_at, updated_at) VALUES 
(1, 1, 1, '完成系统架构设计文档', 8.0, '2024-01-01', NOW(), NOW()),
(1, 1, 1, '技术选型调研和确定', 6.0, '2024-01-02', NOW(), NOW()),
(1, 2, 1, '设计用户表和项目表结构', 4.0, '2024-01-16', NOW(), NOW()),
(1, 2, 1, '设计任务表和关联表结构', 4.0, '2024-01-17', NOW(), NOW());

-- 创建视图：项目统计
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  p.id,
  p.name,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT pm.user_id) as team_size,
  COALESCE(SUM(wl.hours_spent), 0) as total_hours_spent,
  COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN work_logs wl ON p.id = wl.project_id
GROUP BY p.id, p.name;



-- 干系人表
CREATE TABLE IF NOT EXISTS stakeholders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type ENUM('external_supplier', 'internal_employee') NOT NULL,
  position VARCHAR(100),
  company VARCHAR(200),
  contact_info JSON,
  project_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_type (type)
);

-- 故事线表
CREATE TABLE IF NOT EXISTS storylines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  story_content TEXT NOT NULL,
  event_time DATETIME NOT NULL,
  stakeholder_ids JSON,
  follow_up_time DATETIME,
  follow_up_items TEXT,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_event_time (event_time),
  INDEX idx_created_by (created_by)
);

COMMIT;
