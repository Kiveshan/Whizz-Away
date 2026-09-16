import { useEffect, useMemo, useState } from "react"
import Select from "react-select"
import api from "../../api.js"

const formatLabel = (addon) => {
  const amount =
    addon.amount != null ? `R${Number(addon.amount).toFixed(2)}` : ""
  const date = addon.date
    ? new Date(addon.date).toLocaleDateString("en-ZA")
    : ""
  return [addon.invoice_number, amount, date].filter(Boolean).join(" — ")
}

/**
 * Picker for linking an add-on instruction to an existing add-on invoice.
 * Fetches the add-on invoices for the given client that are not yet linked to
 * any instruction. When `instructionId` is supplied (edit mode), the invoice
 * currently linked to that instruction is included so it stays selectable.
 *
 * Renders nothing structural beyond a labelled <select>; the parent decides
 * placement. The selected value is the add_ons.addon_id (as a string), stored
 * on formData.addon_id.
 */
export function AddonInvoicePicker({
  clientId,
  instructionId,
  value,
  onChange,
  disabled = false,
  error,
}) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let cancelled = false

    if (!clientId) {
      setOptions([])
      return
    }

    const fetchUnlinked = async () => {
      setLoading(true)
      setLoadError("")
      try {
        const params = instructionId ? { instructionId } : {}
        const res = await api.get(`/api/addons/unlinked/client/${clientId}`, {
          params,
        })
        if (!cancelled) {
          setOptions(res.data?.data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.message || "Failed to load add-on invoices"
          )
          setOptions([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchUnlinked()
    return () => {
      cancelled = true
    }
  }, [clientId, instructionId])

  // Ordered by invoice number (natural sort so INV-9 comes before INV-10)
  const selectOptions = useMemo(
    () =>
      [...options]
        .sort((a, b) =>
          String(a.invoice_number ?? "").localeCompare(
            String(b.invoice_number ?? ""),
            undefined,
            { numeric: true, sensitivity: "base" }
          )
        )
        .map((addon) => ({
          value: String(addon.addon_id),
          label: formatLabel(addon),
        })),
    [options]
  )

  const selectedOption =
    selectOptions.find((opt) => opt.value === String(value)) || null

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "32px",
      height: "32px",
      fontSize: "0.8rem",
      borderColor: error ? "#d32f2f" : state.isFocused ? base.borderColor : "#ced4da",
      boxShadow: "none",
    }),
    valueContainer: (base) => ({ ...base, height: "30px", padding: "0 6px" }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    indicatorsContainer: (base) => ({ ...base, height: "30px" }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({ ...base, padding: "4px" }),
    clearIndicator: (base) => ({ ...base, padding: "4px" }),
    menu: (base) => ({ ...base, fontSize: "0.8rem", minWidth: "260px" }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  }

  const hintStyle = {
    fontSize: "0.68rem",
    lineHeight: 1.2,
    marginTop: "2px",
  }

  return (
    <div
      className="controller-instructions-form-field"
      style={{ flex: "1 1 160px", maxWidth: "220px" }}
    >
      <label style={{ fontSize: "0.78rem" }}>
        Add-On Invoice <span style={{ color: "#d32f2f" }}>*</span>
      </label>
      <div className="controller-instructions-input-wrapper">
        <Select
          inputId="addon_id"
          name="addon_id"
          options={selectOptions}
          value={selectedOption}
          onChange={(opt) => onChange(opt ? opt.value : "")}
          isDisabled={disabled || loading || !clientId}
          isLoading={loading}
          isClearable
          isSearchable
          placeholder={
            loading
              ? "Loading…"
              : !clientId
                ? "Select a client first"
                : "Search invoice"
          }
          noOptionsMessage={() => "No matching invoices"}
          styles={selectStyles}
          menuPortalTarget={document.body}
          aria-invalid={!!error}
        />
      </div>
      {loadError && (
        <div style={{ ...hintStyle, color: "#d32f2f" }}>{loadError}</div>
      )}
      {!loading && clientId && options.length === 0 && !loadError && (
        <div style={{ ...hintStyle, color: "#b26a00" }}>
          No unlinked invoices — create one first.
        </div>
      )}
      {error && <div style={{ ...hintStyle, color: "#d32f2f" }}>{error}</div>}
    </div>
  )
}
