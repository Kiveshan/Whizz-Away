"use client"

import { useState, useEffect } from "react"
import { FaSave, FaTimes, FaSpinner } from "react-icons/fa"

const ExpenseTypeForm = ({
  expenseType = {},
  loading = false,
  isEditing = false,
  onSubmit = () => {},
  onCancel = () => {},
  onChange = () => {},
}) => {
  const [formData, setFormData] = useState({
    expense: "",
    ...expenseType,
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    console.log("ExpenseTypeForm received expense type data:", expenseType)
    if (expenseType && Object.keys(expenseType).length > 0) {
      setFormData({
        expense: expenseType.expense || "",
      })
    }
  }, [expenseType])

  const handleInputChange = (field, value) => {
    console.log(`Field ${field} changed to:`, value)
    setFormData((prev) => ({ ...prev, [field]: value }))
    onChange(field, value)

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Required fields validation
    if (!formData.expense?.trim()) {
      newErrors.expense = "Expense type name is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("Form submitted with data:", formData)
    console.log("Is editing:", isEditing)

    if (!validateForm()) {
      console.log("Form validation failed:", errors)
      return
    }

    try {
      console.log("Calling onSubmit with form data...")
      const success = await onSubmit(formData)
      console.log("onSubmit result:", success)

      if (success) {
        console.log("Form submission successful")
      } else {
        console.log("Form submission failed")
      }
    } catch (error) {
      console.error("Error in form submission:", error)
    }
  }

  const handleCancel = () => {
    console.log("Form cancelled")
    setFormData({
      expense: "",
    })
    setErrors({})
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? "Edit Expense Type" : "Add New Expense Type"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="expense" className="block text-sm font-medium text-gray-700 mb-1">
              Expense Type Name *
            </label>
            <input
              type="text"
              id="expense"
              value={formData.expense}
              onChange={(e) => handleInputChange("expense", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.expense ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter expense type name"
              disabled={loading}
            />
            {errors.expense && <p className="text-red-500 text-sm mt-1">{errors.expense}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>{isEditing ? "Updating..." : "Adding..."}</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>{isEditing ? "Update" : "Add"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpenseTypeForm
