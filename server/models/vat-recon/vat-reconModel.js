import { pool } from "../../config/database.js"

export const getOutputVat = async (month, year, company_reg_num) => {
    const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ].indexOf(month) + 1

    const query = `
        SELECT
            c.m5clientkey,
            c.client AS client_name,
            SUM(m.total_cost) AS total_cost,
            COALESCE(m.vat, 15) AS vat_rate
        FROM m1_controller m
        JOIN m5_client c ON m.client = c.m5clientkey
        WHERE EXTRACT(MONTH FROM m.created_at) = $1
        AND EXTRACT(YEAR FROM m.created_at) = $2
        AND m.company_reg_num = $3
        AND m.total_cost IS NOT NULL
        AND m.total_cost > 0
        GROUP BY c.m5clientkey, c.client, COALESCE(m.vat, 15)
        ORDER BY c.client
    `

    try {
        const result = await pool.query(query, [monthIndex, year, company_reg_num])
        return result.rows.map((row) => ({
            clientId: row.m5clientkey,
            clientName: row.client_name,
            totalCost: parseFloat(row.total_cost) || 0,
            vatRate: parseFloat(row.vat_rate) || 15,
        }))
    } catch (error) {
        console.error("Error fetching output VAT:", error)
        throw error
    }
}

export const getInputVat = async (month, year, company_reg_num) => {
    const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ].indexOf(month) + 1

    const query = `
        SELECT
            po.date,
            et.expense AS expense_type,
            po.total,
            po.vat
        FROM purchase_orders po
        JOIN expense_types et ON po.expense_type_id = et.id
        WHERE EXTRACT(MONTH FROM po.date) = $1
        AND EXTRACT(YEAR FROM po.date) = $2
        AND po.company_reg_num = $3
        AND po.vat IS NOT NULL
        AND po.vat > 0
        ORDER BY po.date, et.expense
    `

    try {
        const result = await pool.query(query, [monthIndex, year, company_reg_num])
        return result.rows.map((row) => ({
            date: row.date ? new Date(row.date).toISOString().split("T")[0] : null,
            expenseType: row.expense_type,
            total: parseFloat(row.total) || 0,
            vat: parseFloat(row.vat) || 0,
        }))
    } catch (error) {
        console.error("Error fetching input VAT:", error)
        throw error
    }
}
