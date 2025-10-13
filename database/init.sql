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
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  last_login DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_status (status)
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
  status ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planning',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  progress INT DEFAULT 0,
  owner_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_owner_id (owner_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority)
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
  status ENUM('todo', 'in_progress', 'review', 'completed', 'cancelled') DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
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
  INDEX idx_status (status),
  INDEX idx_priority (priority),
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
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
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
  status ENUM('pending', 'sent', 'cancelled') DEFAULT 'pending',
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
  INDEX idx_status (status),
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
  status ENUM('pending', 'completed', 'overdue') DEFAULT 'pending',
  completion_date DATE,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_due_date (due_date),
  INDEX idx_status (status)
);

-- 插入默认管理员用户
INSERT IGNORE INTO users (id, username, email, password, role, status, created_at, updated_at) VALUES 
(1, 'admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx/LbDhm', 'admin', 'active', NOW(), NOW());
-- 默认密码是: admin123

-- 插入示例项目
INSERT IGNORE INTO projects (id, name, description, status, priority, start_date, end_date, budget, progress, owner_id, created_at, updated_at) VALUES 
(1, '个人项目管理系统', '基于阿里云的个人项目管理系统开发', 'active', 'high', '2024-01-01', '2024-12-31', 50000.00, 75, 1, NOW(), NOW());

-- 插入项目成员
INSERT IGNORE INTO project_members (project_id, user_id, role, joined_at) VALUES 
(1, 1, 'owner', NOW());

-- 插入示例任务
INSERT IGNORE INTO tasks (id, project_id, title, description, status, priority, assignee_id, reporter_id, estimated_hours, start_date, due_date, created_at, updated_at) VALUES 
(1, 1, '系统架构设计', '设计系统整体架构和技术选型', 'completed', 'high', 1, 1, 40.0, '2024-01-01', '2024-01-15', NOW(), NOW()),
(2, 1, '数据库设计', '设计数据库表结构和关系', 'completed', 'high', 1, 1, 24.0, '2024-01-16', '2024-01-25', NOW(), NOW()),
(3, 1, '前端界面开发', '开发用户界面和交互功能', 'in_progress', 'medium', 1, 1, 80.0, '2024-01-26', '2024-03-15', NOW(), NOW()),
(4, 1, '后端API开发', '开发后端接口和业务逻辑', 'in_progress', 'medium', 1, 1, 60.0, '2024-02-01', '2024-03-01', NOW(), NOW()),
(5, 1, '系统测试', '进行系统功能测试和性能测试', 'todo', 'medium', 1, 1, 32.0, '2024-03-16', '2024-03-31', NOW(), NOW());

-- 插入示例里程碑
INSERT IGNORE INTO milestones (id, project_id, title, description, due_date, status, created_by, created_at, updated_at) VALUES 
(1, 1, '系统设计完成', '完成系统架构和数据库设计', '2024-01-25', 'completed', 1, NOW(), NOW()),
(2, 1, '开发阶段完成', '完成前后端开发工作', '2024-03-15', 'pending', 1, NOW(), NOW()),
(3, 1, '系统上线', '完成测试并正式上线', '2024-03-31', 'pending', 1, NOW(), NOW());

-- 插入示例时间线事件
INSERT IGNORE INTO timeline_events (project_id, user_id, event_type, title, description, date, priority, status, created_at, updated_at) VALUES 
(1, 1, 'project', '项目启动', '个人项目管理系统项目正式启动', '2024-01-01 09:00:00', 'high', 'completed', NOW(), NOW()),
(1, 1, 'milestone', '设计阶段完成', '系统架构和数据库设计已完成', '2024-01-25 18:00:00', 'high', 'completed', NOW(), NOW()),
(1, 1, 'task', '开始前端开发', '开始进行用户界面开发工作', '2024-01-26 09:00:00', 'medium', 'active', NOW(), NOW());

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
  p.status,
  p.progress,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
  COUNT(DISTINCT pm.user_id) as team_size,
  COALESCE(SUM(wl.hours_spent), 0) as total_hours_spent,
  COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN work_logs wl ON p.id = wl.project_id
GROUP BY p.id, p.name, p.status, p.progress;

-- 创建视图：用户工作量统计
CREATE OR REPLACE VIEW user_workload_stats AS
SELECT 
  u.id,
  u.username,
  COUNT(DISTINCT t.id) as assigned_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as active_tasks,
  COALESCE(SUM(wl.hours_spent), 0) as total_hours_worked,
  COALESCE(AVG(wl.hours_spent), 0) as avg_daily_hours
FROM users u
LEFT JOIN tasks t ON u.id = t.assignee_id
LEFT JOIN work_logs wl ON u.id = wl.user_id
GROUP BY u.id, u.username;

COMMIT;