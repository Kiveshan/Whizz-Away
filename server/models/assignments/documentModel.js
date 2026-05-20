import { pool } from "../../config/database.js";

const getDocumentsByInstructionId = async (instructionId, company_reg_num) => {
  const queryText = `
    SELECT d.document_id, d.name, d.type, d.leg_number, d.s3key, d.upload_date
    FROM documents d
    JOIN m1_controller m ON d.m1key = m.m1key
    WHERE d.m1key = $1 AND m.company_reg_num = $2
  `;
  const result = await pool.query(queryText, [instructionId, company_reg_num]);
  return result.rows;
};

const insertDocument = async ({
  name,
  type,
  legNumber,
  s3Key,
  uploadDate,
  instructionId,
  company_reg_num,
}) => {
  const instructionResult = await pool.query(
    "SELECT client FROM m1_controller WHERE m1key = $1 AND company_reg_num = $2",
    [instructionId, company_reg_num]
  );
  const clientId =
    instructionResult.rows.length > 0 ? instructionResult.rows[0].client : 0;

  const query = `
    INSERT INTO documents (name, type, leg_number, s3key, upload_date, m1key, client, company_reg_num)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING document_id
  `;
  const values = [
    name,
    type,
    legNumber,
    s3Key,
    uploadDate,
    instructionId,
    clientId,
    company_reg_num,
  ];
  const result = await pool.query(query, values);
  return result.rows[0].document_id;
};

const getDocumentsByClientId = async (clientId, company_reg_num) => {
  const queryText = `
    SELECT d.document_id, d.name, d.type, d.leg_number, d.s3key, d.upload_date, d.m1key,
           m.fileref as instruction_reference
    FROM documents d
    JOIN m1_controller m ON d.m1key = m.m1key
    WHERE d.client = $1
    AND m.company_reg_num = $2
    ORDER BY d.upload_date DESC
  `;
  const result = await pool.query(queryText, [clientId, company_reg_num]);
  return result.rows;
};

const deleteDocument = async (documentId, s3, company_reg_num) => {
  const keyResult = await pool.query(
    "SELECT s3key FROM documents WHERE document_id = $1",
    [documentId]
  );
  if (keyResult.rows.length === 0) {
    return { success: false, message: "Document not found" };
  }

  const s3Key = keyResult.rows[0].s3key;
  await s3
    .deleteObject({
      Bucket: process.env.S3_BUCKET_NAME || "sherwyn-whizz-away",
      Key: s3Key,
    })
    .promise();

  console.log(`Deleted file from S3: ${s3Key}`);

  await pool.query(
    "DELETE FROM documents WHERE document_id = $1 AND company_reg_num = $2",
    [documentId, company_reg_num]
  );
  return { success: true };
};

export {
  getDocumentsByInstructionId,
  insertDocument,
  getDocumentsByClientId,
  deleteDocument,
};
