-- Migration: client statement export keys become text.
--
-- Client statements are now derived rather than stored, so a statement is
-- identified by "<clientId>-YYYY-MM" (e.g. "7-2026-08") instead of the
-- statements.statement_key serial that no longer exists. The column in
-- client_statement_exports has to widen to match.
--
-- Safe to run on a populated table: every existing integer key casts to its own
-- text form. The `clientid` and `period` columns already carry the real identity,
-- so older rows remain addressable either way.

ALTER TABLE client_statement_exports
    ALTER COLUMN statement_key TYPE TEXT USING statement_key::text;

-- Verify
SELECT COUNT(*) AS rows_with_text_keys FROM client_statement_exports;
