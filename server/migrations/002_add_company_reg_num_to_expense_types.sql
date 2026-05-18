-- Add company_reg_num to expense_types for multi-tenant isolation
ALTER TABLE expense_types ADD COLUMN IF NOT EXISTS company_reg_num integer;

-- Replace the global unique constraint with a per-tenant one
ALTER TABLE expense_types DROP CONSTRAINT IF EXISTS expense_types_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS expense_types_expense_company_key ON expense_types(expense, company_reg_num);
