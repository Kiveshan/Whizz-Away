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
            <table className="container-table1">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Container Number</th>
                  <th>Weight (if Import)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>1245</td>
                  <td>150,000</td>
                </tr>
                <tr className="even-row">
                  <td>2</td>
                  <td>1258</td>
                  <td>145,000</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>1254</td>
                  <td>150,789</td>
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
