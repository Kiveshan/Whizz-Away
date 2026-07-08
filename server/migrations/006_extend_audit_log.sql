-- Migration: Extend audit_log for general business-entity auditing
-- Adds an entity_type discriminator so the same table can record invoice,
-- payment, rate, instruction and credit-note events alongside the existing
-- employee events (PASSWORD_CHANGE, EMPLOYEE_CREATION).

-- Ensure the table exists on fresh environments (no-op where it already does).
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id SERIAL PRIMARY KEY,
    action_type TEXT NOT NULL,
    admin_id INTEGER,
    target_employee_id INTEGER,
    target_employee_name TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details TEXT,
    user_agent TEXT
);

-- What kind of entity the event concerns (payment, invoice, client_rate,
-- driver_rate, credit_note, instruction, employee, ...).
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_type TEXT;

-- The audit views/queries filter by time and action.
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log (action_type);

-- Verify
SELECT COUNT(*) AS existing_audit_rows FROM audit_log;
