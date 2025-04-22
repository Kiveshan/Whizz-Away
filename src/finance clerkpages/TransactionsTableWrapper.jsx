"use client"

// TransactionsTableWrapper.jsx
const TransactionsTableWrapper = ({ children, className }) => {
  return (
    <div className={`transactions-wrapper ${className || ""}`}>
      <style jsx>{`
        .transactions-wrapper {
          overflow-x: auto;
          max-width: 100%;
        }
        
        @media print {
          .transactions-wrapper {
            overflow: visible;
            page-break-inside: auto;
          }
        }
      `}</style>
      {children}
    </div>
  )
}

export default TransactionsTableWrapper
