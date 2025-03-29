import "../css/containerdetails.css";
import { useNavigate } from "react-router-dom";
import "../css/components.css";

const ContainerDetailsPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <button className="back-button" onClick={() => navigate(-1)}> Back</button>
      <div className="container-details-wrapper">
        <div className="content">
          <div className="add-container-section">
            {/* <button className="add-container-button">Add Container</button> */}
          </div>

          <br />

          <div className="container-table-wrapper">
            <table className="container-table1" >
              <thead style={{ width: "250px" }}>
                <tr>
                  <th>#</th>
                  <th>Container Number</th>
                  <th>Trailer Size</th>
                  <th>Weight (if Import)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td><input type="text" defaultValue="1245" /></td>
                  <td>12m</td> {/* Static text for trailer size */}
                  <td><input type="number" defaultValue="150000" /></td>
                </tr>
                <tr className="even-row">
                  <td>2</td>
                  <td><input type="text" defaultValue="1258"  /></td>
                  <td>6m</td> {/* Static text for trailer size */}
                  <td><input type="number" defaultValue="145000" /></td>
                </tr>
                <tr>
                  <td>3</td>
                  <td><input type="text" defaultValue="1254" /></td>
                  <td>6m</td> {/* Static text for trailer size */}
                  <td><input type="number" defaultValue="150789" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="submit-section">
            <button className="submit-button">Submit</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContainerDetailsPage;
