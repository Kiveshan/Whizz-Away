"use client"

const ClientTable = ({ clients, loading, error, onEdit, onToggleStatus, onAdd }) => {
  if (loading) {
    return <div className="loading">Loading clients...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <>
      <div className="manage-clients-table1">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Representative</th>
              <th>Email</th>
              <th>Edit</th>
              <th>Enable / Disable</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.m5clientkey}>
                <td>{client.client}</td>
                <td>{client.representative}</td>
                <td>{client.email}</td>
                <td>
                  <button className="manage-view-button" onClick={() => onEdit(client.m5clientkey)}>
                    Edit
                  </button>
                </td>
                <td>
                  <button
                    className={client.status ? "manage-delete-button" : "manage-enable-button"}
                    onClick={() => onToggleStatus(client.m5clientkey, client.status)}
                  >
                    {client.status ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="manage-add-client-button" onClick={onAdd}>
        Add Client
      </button>
    </>
  )
}

export default ClientTable
