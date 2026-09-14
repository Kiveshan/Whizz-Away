import { pool } from "../../config/database.js"

// Shipment type 5 is the internal add-on instruction type, not a real shipment.
export const getIncompleteInstructions = async (from, to) => {
  const sql = `
    SELECT
      m.m1key,
      c.client,
      m."ksmFileRef" AS ksm_file_ref,
      m."clientFileRef" AS client_file_ref,
      m.booking_ref,
      s.shipmenttype AS shipment_type,
      m.pickup,
      m.dropoff,
      m.status,
      TO_CHAR(m.created_at, 'YYYY-MM-DD') AS created_at,
      (CURRENT_DATE - m.created_at::date) AS days_open
    FROM public.m1_controller m
    JOIN public.m5_client c ON m.client = c.m5clientkey
    LEFT JOIN public.shipment s ON m.shipment_type = s.shipkey
    WHERE LOWER(TRIM(COALESCE(m.status, ''))) <> 'completed'
      AND m.created_at >= $1::date
      AND m.created_at < ($2::date + 1)
      AND m.shipment_type IS DISTINCT FROM 5
    ORDER BY m.created_at ASC, m.m1key ASC
  `
  const { rows } = await pool.query(sql, [from, to])
  return rows
}
