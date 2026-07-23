/**
 * InstructionBanners — amber read-only banner, red break-bulk set-rate
 * warning banner, and green success banner for the update instruction form.
 *
 * @param {object}       props
 * @param {boolean}      props.isReadOnly
 * @param {string}       props.status
 * @param {boolean}      props.showSetRateWarning
 * @param {number|null}  props.historicalSetRate
 * @param {number}       props.setRateValue
 * @param {string}       [props.successMessage]  Shown as a dismiss-free green banner when set
 */
export function InstructionBanners({
  isReadOnly,
  status,
  showSetRateWarning,
  historicalSetRate,
  setRateValue,
  successMessage,
}) {
  return (
    <>
      {successMessage && (
        <div
          style={{
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            padding: "12px",
            marginBottom: "20px",
            textAlign: "center",
            color: "#155724",
            fontWeight: "bold",
          }}
        >
          {successMessage}
        </div>
      )}
      {isReadOnly && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "4px",
            padding: "12px",
            marginBottom: "20px",
            textAlign: "center",
            color: "#856404",
            fontWeight: "bold",
          }}
        >
          ⚠️ This instruction is {status} and is in read-only mode
        </div>
      )}
      {showSetRateWarning && !isReadOnly && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            padding: "12px",
            marginBottom: "20px",
            textAlign: "center",
            color: "#721c24",
            fontWeight: "bold",
          }}
        >
          ⚠️ Break Bulk Set Rate Warning: The historical rate (R
          {historicalSetRate?.toFixed(2)}) differs from the current client rate
          (R{setRateValue?.toFixed(2)}). Saving will update the historical rate
          to the current rate.
        </div>
      )}
    </>
  );
}
