import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch pending users from the backend
    axios.get('http://localhost:5000/api/users/pending')
      .then(response => {
        setUsers(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("There was an error fetching the users!", error);
        setLoading(false);
      });
  }, []);

  const handleApprove = (userId) => {
    // Approve user by updating their roleid to 1
    axios.put(`http://localhost:5000/api/users/approve/${userId}`)
      .then(response => {
        console.log(response.data.message);
        setUsers(users.filter(user => user.userid !== userId)); // Remove approved user from the list
      })
      .catch(error => {
        console.error("There was an error approving the user!", error);
      });
  };

  const handleReject = (userId) => {
    // Reject the user (you can implement further logic here)
    setUsers(users.filter(user => user.userid !== userId)); // Remove rejected user from the list
    console.log(`User with ID ${userId} rejected.`);
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.userid}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <button onClick={() => handleApprove(user.userid)}>Approve</button>
                  <button onClick={() => handleReject(user.userid)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDashboard;
