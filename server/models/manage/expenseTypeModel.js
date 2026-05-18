import { query } from "../../config/database.js"

export const getAllExpenseTypes = async (page = 1, limit = 50, search = "", company_reg_num) => {
  try {
    const offset = (page - 1) * limit

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM expense_types WHERE company_reg_num = $1 AND ($2 = '' OR expense ILIKE '%' || $2 || '%')`
    const countResult = await query(countQuery, [company_reg_num, search])
    const totalItems = Number.parseInt(countResult.rows[0].total)

    // Get expense types
    const expenseTypesQuery = `
      SELECT
        id,
        expense
      FROM expense_types
      WHERE company_reg_num = $3
      AND ($4 = '' OR expense ILIKE '%' || $4 || '%')
      ORDER BY expense ASC
      LIMIT $1 OFFSET $2
    `

    const params = [limit, offset, company_reg_num, search]
    const expenseTypesResult = await query(expenseTypesQuery, params)

    const totalPages = Math.ceil(totalItems / limit)

    return {
      expenseTypes: expenseTypesResult.rows,
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    }
  } catch (error) {
    console.error("Error in getAllExpenseTypes:", error)
    throw error
  }
}

export const getExpenseTypeById = async (id, company_reg_num) => {
  try {
    const result = await query(
      `SELECT
        id,
        expense
      FROM expense_types
      WHERE id = $1
      AND company_reg_num = $2`,
      [id, company_reg_num],
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error("Error in getExpenseTypeById:", error)
    throw error
  }
}

export const createExpenseType = async (expenseTypeData, company_reg_num) => {
  try {
    const { expense } = expenseTypeData

    const result = await query(
      `INSERT INTO expense_types (expense, company_reg_num)
      VALUES ($1, $2)
      RETURNING id, expense`,
      [expense, company_reg_num],
    )

    return result.rows[0]
  } catch (error) {
    console.error("Error in createExpenseType:", error)
    throw error
  }
}

export const updateExpenseType = async (id, expenseTypeData, company_reg_num) => {
  try {
    const { expense } = expenseTypeData

    const result = await query(
      `UPDATE expense_types SET expense = $1
      WHERE id = $2
      AND company_reg_num = $3
      RETURNING id, expense`,
      [expense, id, company_reg_num],
    )

    if (result.rowCount === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error("Error in updateExpenseType:", error)
    throw error
  }
}

export const deleteExpenseType = async (id, company_reg_num) => {
  try {
    const result = await query("DELETE FROM expense_types WHERE id = $1 AND company_reg_num = $2", [id, company_reg_num])
    return result.rowCount > 0
  } catch (error) {
    console.error("Error in deleteExpenseType:", error)
    throw error
  }
}

export const getSimpleExpenseTypes = async (company_reg_num) => {
  try {
    console.log("Getting simple expense types for dropdown")

    const expenseTypesQuery = `
      SELECT id, expense
      FROM expense_types
      WHERE company_reg_num = $1
      ORDER BY expense ASC
    `
    const result = await query(expenseTypesQuery, [company_reg_num])

    console.log(`Found ${result.rows.length} expense types for dropdown`)
    return result.rows
  } catch (error) {
    console.error("Error getting simple expense types:", error)
    throw error
  }
}
