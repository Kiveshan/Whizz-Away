-- Migration: snapshot a client statement at the moment it is exported.
--
-- Why this table and NOT the "derive everything" approach used for
-- subcontractor statements (migration 012): a client statement's aging buckets
-- are computed from m1_controller.payment_status / paid_amount as they stand
-- WHEN THE JOB RUNS. Those columns carry no history, so re-deriving an old
-- statement today reports today's debt, not the debt that was outstanding then.
-- Measured against production: of 220 stored statements, 64 no longer reproduce,
-- the worst by R470,651, and the totals differ by R4.0m overall. `statements` and
-- `aging_analysis` therefore stay authoritative; this table records what was
-- actually sent.
--
-- Division of responsibility (same as the subcontractor side):
--   audit_log  -> WHO exported, WHEN, from where (one row per export action)
--   this table -> WHAT the document said (one row per distinct content version)
-- They join on content_hash, which the audit row carries in its metadata. The
-- payload is deliberately not stored in audit_log.metadata: the audit middleware
-- clips arrays at 20 entries and truncates at 8000 chars, which would silently
-- cut a statement's line items in half.

CREATE TABLE IF NOT EXISTS client_statement_exports (
    export_id          BIGSERIAL PRIMARY KEY,

    -- Identity. Unlike subcontractor statements, a client statement has a real
    -- stable key, so it is recorded directly. `period` is the month the
    -- statement COVERS -- statements.generation_date is the 1st of the month
    -- AFTER that, which every consumer currently has to correct for by hand.
    statement_key      INTEGER       NOT NULL,
    clientid           INTEGER       NOT NULL,
    period             DATE          NOT NULL,

    -- Frozen figures, exactly as rendered. Kept as separate columns rather than
    -- only inside the payload so the history panel and any later reporting can
    -- read them without unpacking JSON.
    opening_balance    NUMERIC(12,2) NOT NULL,
    invoiced_amount    NUMERIC(12,2) NOT NULL,
    payments_amount    NUMERIC(12,2) NOT NULL,
    credit_notes_amount NUMERIC(12,2) NOT NULL,
    insurance_amount   NUMERIC(12,2) NOT NULL,
    balance_due        NUMERIC(12,2) NOT NULL,

    -- The four aging buckets as they stood at export time. This is the half that
    -- cannot be reconstructed later, so it is the most important thing here.
    aging              JSONB         NOT NULL,

    -- invoices / addons / payments / credit_notes as rendered.
    line_items         JSONB         NOT NULL,
    line_item_count    INTEGER       NOT NULL,

    -- sha256 over the canonical payload (see models/statements/
    -- statementExportModel.js). Re-exporting content whose hash matches the
    -- latest snapshot reuses that row, so this table holds versions rather than
    -- one row per button press.
    content_hash       TEXT          NOT NULL,

    -- The rendered document in the operational S3 bucket. Nullable because the
    -- snapshot is written first and the client uploads the file it rendered
    -- immediately afterwards; a NULL key means that second step never landed.
    document_key       TEXT,
    document_format    TEXT          CHECK (document_format IN ('PDF', 'XLSX')),
    document_size      INTEGER,
    document_at        TIMESTAMPTZ,

    -- Actor, denormalised so the trail survives a user being renamed or deleted
    -- -- same convention as audit_log.actor_name (migration 010).
    exported_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    exported_by        INTEGER,
    exported_by_name   VARCHAR(255)
);

-- The history panel's only query shape: "every export of this statement,
-- newest first".
CREATE INDEX IF NOT EXISTS idx_client_stmt_exports_statement
    ON client_statement_exports (statement_key, exported_at DESC);

-- "everything ever sent to this client", for the period filters.
CREATE INDEX IF NOT EXISTS idx_client_stmt_exports_client_period
    ON client_statement_exports (clientid, period, exported_at DESC);

-- Checked on every export against the latest stored version.
CREATE INDEX IF NOT EXISTS idx_client_stmt_exports_hash
    ON client_statement_exports (content_hash);

-- "what did this person send, and when", for the audit report.
CREATE INDEX IF NOT EXISTS idx_client_stmt_exports_actor
    ON client_statement_exports (exported_by, exported_at);

-- Verify
SELECT COUNT(*) AS existing_client_export_rows FROM client_statement_exports;
