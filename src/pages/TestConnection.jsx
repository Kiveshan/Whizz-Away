"use client"

import { useState, useEffect } from "react"

function TestConnection() {
  const [status, setStatus] = useState("Testing connection...")
  const [details, setDetails] = useState("")

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test a simple endpoint first
        const response = await fetch("http://localhost:5000/test-connection")

        if (response.ok) {
          setStatus("Connection successful!")
          setDetails(`Server responded with status: ${response.status}`)

          // Now try the actual endpoint
          try {
            const adminResponse = await fetch("http://localhost:5000/admin/pending-users", {
              credentials: "include",
            })

            if (adminResponse.ok) {
              setDetails((prev) => `${prev}\nAdmin endpoint working. Status: ${adminResponse.status}`)
            } else {
              setDetails((prev) => `${prev}\nAdmin endpoint failed. Status: ${adminResponse.status}`)
              const errorText = await adminResponse.text()
              setDetails((prev) => `${prev}\nError: ${errorText}`)
            }
          } catch (adminErr) {
            setDetails((prev) => `${prev}\nAdmin endpoint error: ${adminErr.message}`)
          }
        } else {
          setStatus("Connection failed")
          setDetails(`Server responded with status: ${response.status}`)
        }
      } catch (err) {
        setStatus("Connection error")
        setDetails(`Error: ${err.message}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h2>API Connection Test</h2>
      <div
        style={{
          padding: "15px",
          backgroundColor: status.includes("successful") ? "#dff0d8" : "#f2dede",
          borderRadius: "4px",
          marginBottom: "15px",
        }}
      >
        <strong>Status:</strong> {status}
      </div>
      {details && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#f8f8f8",
            borderRadius: "4px",
            whiteSpace: "pre-line",
          }}
        >
          <strong>Details:</strong>
          <pre>{details}</pre>
        </div>
      )}
    </div>
  )
}

export default TestConnection

