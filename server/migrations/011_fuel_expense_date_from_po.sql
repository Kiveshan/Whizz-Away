BEGIN;

-- Fuel costs were being bucketed by expenses_m2.slipuploaddate, which is stamped
-- with the server clock when the slip is uploaded, not when the fuel was bought.
-- Slips are captured in batches, so a PO dated in August whose slip was filed on
-- 1 September landed in September's analytics while the creditors statement
-- (which reads purchase_orders.date) correctly showed it in August.
--
-- The accounting date already exists on purchase_orders.date, so read it there
-- rather than storing a second copy. slipuploaddate keeps its real meaning:
-- when the paperwork was captured.

-- A fuel PO is one line item for one truck (POForm hides "Add Item" for fuel).
-- Nothing in the schema enforced that, and if it ever broke, the join below
-- would fan out and double-count fuel. Make the rule structural.
CREATE UNIQUE INDEX purchase_orders_fuel_single_line
  ON purchase_orders (ponum) WHERE expense_type_id = 5;

-- expenses_m2.orderno holds the ponum as free text; index it so the join
-- underpinning every fuel analytics query is not a repeated sequential scan.
CREATE INDEX IF NOT EXISTS expenses_m2_orderno_text_idx
  ON expenses_m2 ((orderno::text));

-- LEFT JOIN, not INNER: every expense currently reaches a PO, but if one ever
-- does not it must still appear rather than silently vanish -- it falls back to
-- slipuploaddate, i.e. its old behaviour.
--
-- Deliberately not filtered by type: callers that want only fuel already say so
-- (WHERE type = 'fuel'), and the truck expense list wants every type. Filtering
-- here would silently drop rows from that list if a new expense type is added.
CREATE OR REPLACE VIEW expenses_with_po_v AS
SELECT
  e.*,
  COALESCE(po.date, e.slipuploaddate) AS expense_date,
  po.ponum,
  po.invoice_number,
  po.slip_s3key AS po_slip_s3key
FROM expenses_m2 e
LEFT JOIN purchase_orders po ON e.orderno::text = po.ponum;

COMMIT;
