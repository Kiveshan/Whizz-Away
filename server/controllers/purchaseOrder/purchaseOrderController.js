import {
  getPurchaseOrders,
  getExpenseTypes,
  getStatements,
  getSupplierSummary,
  getSuppliersByExpenseType,
  calculatePurchaseOrder,
  createPurchaseOrder,
  createMultiplePurchaseOrders, // New function
  getPurchaseOrderList,
} from "../../models/purchaseOrder/purchaseOrderModel.js"

export const getPurchaseOrdersHandler = async (req, res) => {
  try {
    const purchaseOrders = await getPurchaseOrders()
    res.json(purchaseOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export const getExpenseTypesHandler = async (req, res) => {
  try {
    console.log("Fetching expense types from database...")
    const expenseTypes = await getExpenseTypes()
    console.log(`Found ${expenseTypes.length} expense types`)
    res.json(expenseTypes)
  } catch (error) {
    console.error("Error fetching expense types:", error)
    res.status(500).json({
      error: "Failed to fetch expense types",
      message: error.message,
    })
  }
}

export const getStatementsHandler = async (req, res) => {
  try {
    const { supplierId, fromDate, toDate } = req.query
    console.log("Received request for /api/statements with params:", {
      supplierId,
      fromDate,
      toDate,
    })

    const statements = await getStatements(supplierId, fromDate, toDate)
    console.log("Query result:", statements.length, "rows found")

    res.json(statements)
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch statement data: ${error.message}` })
  }
}

export const getSupplierSummaryHandler = async (req, res) => {
  try {
    const { year, month } = req.query
    console.log("Fetching supplier statements with params:", { year, month })

    const summary = await getSupplierSummary(year, month)
    console.log("Supplier summary result:", summary.length, "supplier-month combinations found")

    res.json(summary)
  } catch (error) {
    console.error("Error fetching supplier statements:", error)
    res.status(500).json({ error: `Failed to fetch supplier statements: ${error.message}` })
  }
}

export const getSuppliersByExpenseTypeHandler = async (req, res) => {
  try {
    const { expenseTypeId } = req.params
    const suppliers = await getSuppliersByExpenseType(expenseTypeId)
    res.json(suppliers)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    res.status(500).json({ error: "Failed to fetch suppliers" })
  }
}

export const calculatePurchaseOrderHandler = (req, res) => {
  try {
    const { quantity, unitPrice } = req.body
    const result = calculatePurchaseOrder(quantity, unitPrice)
    res.json(result)
  } catch (error) {
    console.error("Error calculating amounts:", error)
    res.status(500).json({ error: "Failed to calculate amounts" })
  }
}

export const createPurchaseOrderHandler = async (req, res) => {
  try {
    const {
      expenseTypeId,
      supplierId,
      regNo,
      attentionTo,
      receivedBy,
      quantity,
      unitPrice,
      description,
      subbie,
      date,
      total,
    } = req.body

    const result = await createPurchaseOrder({
      expenseTypeId,
      supplierId,
      regNo,
      attentionTo,
      receivedBy,
      quantity,
      unitPrice,
      description,
      subbie,
      date,
      total,
    })

    res.status(201).json({
      success: true,
      poId: result.poId,
      poNum: result.poNum,
    })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    res.status(500).json({ error: "Failed to create purchase order" })
  }
}

// New handler for multiple line items
export const createMultiplePurchaseOrdersHandler = async (req, res) => {
  try {
    const { supplier, date, attentionTo, receivedBy, regNo, subbie, lineItems, totals } = req.body

    const result = await createMultiplePurchaseOrders({
      supplierId: supplier,
      date,
      attentionTo,
      receivedBy,
      regNo,
      subbie,
      lineItems,
      totals,
    })

    res.status(201).json({
      success: true,
      poNum: result.poNum,
      itemCount: result.itemCount,
    })
  } catch (error) {
    console.error("Error creating multiple purchase orders:", error)
    res.status(500).json({ error: "Failed to create purchase order" })
  }
}

export const getPurchaseOrderListHandler = async (req, res) => {
  try {
    const { supplierId, expenseTypeId, fromDate, toDate, poId, ponum } = req.query // ADD: ponum to query params

    const purchaseOrders = await getPurchaseOrderList(supplierId, expenseTypeId, fromDate, toDate, poId, ponum)

    res.json(purchaseOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    res.status(500).json({ error: "Failed to fetch purchase orders" })
  }
}
