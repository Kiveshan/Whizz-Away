"use client"

const EmployeeTable = ({ employees, loading, error, onEdit, onToggleStatus, onAdd }) => {
  if (loading) {
    return <div className="loading">Loading employees...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <>
      <div className="manage-employees-table1">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Employee No</th>
              <th>Role</th>
              <th>Actions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.userid}>
                <td>{`${employee.name} ${employee.surname}`}</td>
                <td>{employee.status ? "Active" : "Inactive"}</td>
                <td>{employee.employeenum}</td>
                <td>{employee.rolename}</td>
                <td>
                  <button className="manage-view-button" onClick={() => onEdit(employee.userid)}>
                    Edit
                  </button>
                </td>
                <td>
                  <button
                    className={employee.status ? "manage-delete-button" : "manage-enable-button"}
                    onClick={() => onToggleStatus(employee.userid, employee.status)}
                  >
                    {employee.status ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="manage-add-employee-button" onClick={onAdd}>
        Add Employee
      </button>
    </>
  )
}

export default EmployeeTable
