"use client"

const SubcontractorTable = ({ subcontractors, loading, error, onEdit, onToggleStatus, onAdd }) => {
  if (loading) {
    return <div className="loading">Loading subcontractors...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="manage-subcontractor-table1">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Truck Registration</th>
            <th>Company</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {subcontractors.map((sub) => (
            <tr key={sub.userid}>
              <td>{sub.contact_person}</td>
              <td>{sub.truckregnum}</td>
              <td>{sub.companyname}</td>
              <td>{sub.cellnum}</td>
              <td>{sub.email}</td>
              <td>{sub.status ? "Active" : "Inactive"}</td>
              <td>
                <button className="manage-edit-button" onClick={() => onEdit(sub.userid)}>
                  Edit
                </button>
              </td>
              <td>
                <button
                  className={sub.status ? "manage-delete-button" : "manage-enable-button"}
                  onClick={() => onToggleStatus(sub.userid, sub.status)}
                >
                  {sub.status ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <center>
        <button className="manage-add-subcontractor-button" onClick={onAdd}>
          Add Subcontractor
        </button>
      </center>
    </div>
  )
}

export default SubcontractorTable
