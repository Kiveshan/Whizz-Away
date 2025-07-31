import { pool } from "../../config/database.js"

const getCompanyByUserId = async (userId) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query(
      `
      SELECT 
        userid,
        companyname,
        company_reg_num,
        cell_num2,
        vat_reg_num,
        account_num,
        name_of_acc,
        bank,
        branch,
        branch_code,
        address,
        suburb,
        swift_code,
        cluster_box
      FROM usertable
      WHERE userid = $1
    `,
      [userId]
    )
    if (!result.rows.length) {
      return { success: false, message: "Company not found for this user" }
    }
    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error fetching company for user ${userId}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

const updateCompany = async (userId, companyData) => {
  let client
  try {
    client = await pool.connect()
    const checkResult = await client.query("SELECT * FROM usertable WHERE userid = $1", [userId])
    if (!checkResult.rows.length) {
      return { success: false, message: "Company not found for this user" }
    }

    const {
      companyname,
      company_reg_num,
      cell_num2,
      vat_reg_num,
      account_num,
      name_of_acc,
      bank,
      branch,
      branch_code,
      address,
      suburb,
      swift_code,
      cluster_box,
    } = companyData

    // Validate required fields
    if (!companyname || !company_reg_num) {
      throw new Error("Company name and registration number are required")
    }

    const updateFields = []
    const queryParams = []
    let paramCounter = 1

    if (companyname !== undefined) {
      updateFields.push(`companyname = $${paramCounter}`)
      queryParams.push(companyname)
      paramCounter++
    }
    if (company_reg_num !== undefined) {
      updateFields.push(`company_reg_num = $${paramCounter}`)
      queryParams.push(company_reg_num)
      paramCounter++
    }
    if (cell_num2 !== undefined) {
      updateFields.push(`cell_num2 = $${paramCounter}`)
      queryParams.push(cell_num2 || null)
      paramCounter++
    }
    if (vat_reg_num !== undefined) {
      updateFields.push(`vat_reg_num = $${paramCounter}`)
      queryParams.push(vat_reg_num || null)
      paramCounter++
    }
    if (account_num !== undefined) {
      updateFields.push(`account_num = $${paramCounter}`)
      queryParams.push(account_num || null)
      paramCounter++
    }
    if (name_of_acc !== undefined) {
      updateFields.push(`name_of_acc = $${paramCounter}`)
      queryParams.push(name_of_acc || null)
      paramCounter++
    }
    if (bank !== undefined) {
      updateFields.push(`bank = $${paramCounter}`)
      queryParams.push(bank || null)
      paramCounter++
    }
    if (branch !== undefined) {
      updateFields.push(`branch = $${paramCounter}`)
      queryParams.push(branch || null)
      paramCounter++
    }
    if (branch_code !== undefined) {
      updateFields.push(`branch_code = $${paramCounter}`)
      queryParams.push(branch_code || null)
      paramCounter++
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCounter}`)
      queryParams.push(address || null)
      paramCounter++
    }
    if (suburb !== undefined) {
      updateFields.push(`suburb = $${paramCounter}`)
      queryParams.push(suburb || null)
      paramCounter++
    }
    if (swift_code !== undefined) {
      updateFields.push(`swift_code = $${paramCounter}`)
      queryParams.push(swift_code || null)
      paramCounter++
    }
    if (cluster_box !== undefined) {
      updateFields.push(`cluster_box = $${paramCounter}`)
      queryParams.push(cluster_box || null)
      paramCounter++
    }

    if (updateFields.length === 0) {
      return { success: false, message: "No fields to update" }
    }

    queryParams.push(userId)

    const updateQuery = `
      UPDATE usertable 
      SET ${updateFields.join(", ")} 
      WHERE userid = $${paramCounter} 
      RETURNING *
    `

    const result = await client.query(updateQuery, queryParams)
    return { success: true, data: result.rows[0] }
  } catch (err) {
    console.error(`Error updating company for user ${userId}:`, err)
    throw err
  } finally {
    if (client) client.release()
  }
}

export { getCompanyByUserId, updateCompany }