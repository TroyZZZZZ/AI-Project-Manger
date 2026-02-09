-- 为project_stories表添加跟进功能字段（与API保持一致）
ALTER TABLE project_stories 
ADD COLUMN IF NOT EXISTS next_reminder_date DATE NULL AFTER updated_at;

-- 创建故事状态日志表（字段与API使用一致）

-- 创建跟进记录表（字段与API使用一致）
CREATE TABLE IF NOT EXISTS follow_up_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  content TEXT NOT NULL,
  follow_up_type VARCHAR(50),
  contact_person VARCHAR(100),
  contact_method VARCHAR(50),
  result VARCHAR(50),
  next_action TEXT,
  action_date DATE,
  next_follow_up_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES project_stories(id) ON DELETE CASCADE,
  INDEX idx_story_id (story_id),
  INDEX idx_action_date (action_date),
  INDEX idx_next_follow_up_date (next_follow_up_date)
);

-- 为性能优化创建索引
CREATE INDEX idx_stories_next_reminder_date ON project_stories(next_reminder_date);
