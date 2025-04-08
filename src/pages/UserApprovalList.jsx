"use client"

import { useState, useEffect } from "react"
import UserDetailView from "./UserDetailView"
import "../css/UserApprovalList.css"

function UserApprovalList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  // Add this improved error handling to the fetchPendingUsers function
  
 const fetchPendingUsers = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/admin/pending-users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error response:", errorData);
      throw new Error(errorData.message || `Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetched users:", data);
    setUsers(data);
  } catch (err) {
    console.error("Error in fetchPendingUsers:", err);
    setError(err.message || "Failed to fetch pending users");
  } finally {
    setLoading(false);
  }
}

  const handleViewUser = (user) => {
    setSelectedUser(user)
  }

  const handleBackToList = () => {
    setSelectedUser(null)
    fetchPendingUsers() // Refresh the list after approval/rejection
  }

  if (loading) return <div className="loading">Loading users...</div>
  if (error) return <div className="error">Error: {error}</div>

  if (selectedUser) {
    return <UserDetailView user={selectedUser} onBack={handleBackToList} />
  }

  return (
    <div className="user-approval-list">
      <h2>User Approval Queue</h2>

      {users.length === 0 ? (
        <div className="no-users">No users pending approval</div>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Surname</th>
              <th>Email</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.userid}>
                <td>{user.userid}</td>
                <td>{user.name}</td>
                <td>{user.surname}</td>
                <td>{user.email}</td>
                <td>{new Date(user.dateofreg).toLocaleDateString()}</td>
                <td>
                  <button className="view-button" onClick={() => handleViewUser(user)}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default UserApprovalList

