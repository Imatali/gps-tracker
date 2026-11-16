-- Кадамжай ЖДПБ: production D1 permission schema migration
-- REVIEW ONLY: DO NOT EXECUTE before backup and checking existing schema.
-- Target DB: gps-tracker-permissions (NOT kadamjay-sessions)
-- Existing permission_requests rows and PIN/device_id remain unchanged.
ALTER TABLE permission_requests ADD COLUMN worker_id TEXT;
CREATE INDEX IF NOT EXISTS idx_permission_requests_worker_id ON permission_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON permission_requests(status);
-- Backfill worker_id only through server-verified PIN+device mapping.
-- Never infer worker_id from PIN alone. Do not erase legacy rows.
