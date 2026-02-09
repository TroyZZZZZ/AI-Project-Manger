-- 为stories表添加跟进状态字段
ALTER TABLE stories 
ADD COLUMN next_reminder_date DATE;

-- 添加索引优化查询性能
CREATE INDEX idx_stories_next_reminder_date ON stories(next_reminder_date);

-- 创建跟进记录表
CREATE TABLE follow_up_records (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    follow_up_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引优化查询
CREATE INDEX idx_follow_up_records_story_id ON follow_up_records(story_id);
CREATE INDEX idx_follow_up_records_created_at ON follow_up_records(created_at);
