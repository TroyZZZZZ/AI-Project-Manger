-- 修正跟进相关表结构以匹配API

-- 1) 扩展follow_up_records以支持更多信息
ALTER TABLE follow_up_records 
  ADD COLUMN follow_up_type VARCHAR(50) NULL AFTER content,
  ADD COLUMN contact_person VARCHAR(100) NULL AFTER follow_up_type,
  ADD COLUMN contact_method VARCHAR(50) NULL AFTER contact_person,
  ADD COLUMN result VARCHAR(50) NULL AFTER contact_method,
  ADD COLUMN next_action TEXT NULL AFTER result,
  ADD COLUMN next_follow_up_date DATE NULL AFTER action_date,
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- 补充索引
CREATE INDEX idx_follow_up_records_next_follow_up_date ON follow_up_records(next_follow_up_date);
