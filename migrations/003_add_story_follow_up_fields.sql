-- 添加故事跟进功能相关的数据库字段和表

-- 1. 在stories表中添加下次提醒日期字段
ALTER TABLE project_stories 
ADD COLUMN IF NOT EXISTS next_reminder_date DATE;

-- 2. 创建跟进记录表
CREATE TABLE IF NOT EXISTS follow_up_records (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    action_date DATE NOT NULL,
    follow_up_type VARCHAR(50) DEFAULT 'general',
    contact_person VARCHAR(100),
    contact_method VARCHAR(50),
    result VARCHAR(20) DEFAULT 'pending',
    next_action TEXT,
    next_follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES project_stories(id) ON DELETE CASCADE
);

-- 3. 为性能优化创建索引
CREATE INDEX IF NOT EXISTS idx_stories_next_reminder_date ON project_stories(next_reminder_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_records_story_id ON follow_up_records(story_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_records_action_date ON follow_up_records(action_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_records_next_follow_up_date ON follow_up_records(next_follow_up_date);

-- 4. 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_follow_up_records_updated_at ON follow_up_records;
CREATE TRIGGER update_follow_up_records_updated_at
    BEFORE UPDATE ON follow_up_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
