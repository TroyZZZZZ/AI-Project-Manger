-- 创建用户表
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
  INDEX idx_status (status),
  INDEX idx_role (role)
);

-- 创建刷新令牌表
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建密码重置令牌表
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建项目表
CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id INT NOT NULL,
  status ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planning',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  progress DECIMAL(5,2) DEFAULT 0.00,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_owner_id (owner_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建项目成员表
CREATE TABLE IF NOT EXISTS project_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin', 'manager', 'member', 'viewer') DEFAULT 'member',
  joined_at DATETIME NOT NULL,
  UNIQUE KEY unique_project_user (project_id, user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role (role),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  project_id INT NOT NULL,
  creator_id INT NOT NULL,
  assignee_id INT,
  parent_task_id INT,
  status ENUM('todo', 'in_progress', 'review', 'done', 'cancelled') DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  due_date DATETIME,
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2),
  progress DECIMAL(5,2) DEFAULT 0.00,
  tags JSON,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_project_id (project_id),
  INDEX idx_creator_id (creator_id),
  INDEX idx_assignee_id (assignee_id),
  INDEX idx_parent_task_id (parent_task_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_due_date (due_date),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 创建任务依赖表
CREATE TABLE IF NOT EXISTS task_dependencies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
  created_at DATETIME NOT NULL,
  UNIQUE KEY unique_dependency (task_id, depends_on_task_id),
  INDEX idx_task_id (task_id),
  INDEX idx_depends_on_task_id (depends_on_task_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 创建任务评论表
CREATE TABLE IF NOT EXISTS task_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id INT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  INDEX idx_parent_comment_id (parent_comment_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES task_comments(id) ON DELETE CASCADE
);

-- 创建任务历史记录表
CREATE TABLE IF NOT EXISTS task_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  field_name VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  created_at DATETIME NOT NULL,
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建文件表
CREATE TABLE IF NOT EXISTS files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500),
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  category ENUM('document', 'image', 'video', 'audio', 'other') DEFAULT 'other',
  description TEXT,
  uploader_id INT NOT NULL,
  project_id INT,
  task_id INT,
  is_public BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_uploader_id (uploader_id),
  INDEX idx_project_id (project_id),
  INDEX idx_task_id (task_id),
  INDEX idx_category (category),
  INDEX idx_mime_type (mime_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
  category ENUM('system', 'project', 'task', 'comment', 'mention') DEFAULT 'system',
  related_id INT,
  related_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_category (category),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_setting_key (setting_key),
  INDEX idx_is_public (is_public)
);

-- 创建活动日志表
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource_type (resource_type),
  INDEX idx_resource_id (resource_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 插入默认管理员用户
INSERT INTO users (username, email, password, role, status, created_at, updated_at) 
VALUES (
  'admin',
  'admin@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9w5KS', -- 密码: admin123
  'admin',
  'active',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE id=id;

-- 插入系统默认设置
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public, created_at, updated_at) VALUES
('site_name', '项目管理系统', 'string', '网站名称', true, NOW(), NOW()),
('site_description', '高效的项目管理解决方案', 'string', '网站描述', true, NOW(), NOW()),
('max_file_size', '10485760', 'number', '最大文件上传大小（字节）', false, NOW(), NOW()),
('allowed_file_types', '["jpg","jpeg","png","gif","pdf","doc","docx","xls","xlsx","ppt","pptx","txt","zip","rar"]', 'json', '允许上传的文件类型', false, NOW(), NOW()),
('email_notifications', 'true', 'boolean', '是否启用邮件通知', false, NOW(), NOW()),
('registration_enabled', 'true', 'boolean', '是否允许用户注册', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_at=NOW();