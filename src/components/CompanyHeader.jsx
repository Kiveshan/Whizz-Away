import "../pages/Creditors/purchaseOrder/css/PO.css";

const CompanyHeader = ({ subtitle }) => {
  return (
    <>
      <div className="po-header">
        <div className="po-header-left">
          <div className="po-title-container">
            <h1 className="po-title">KSM Carriers</h1>
            {subtitle && <h2 className="po-subtitle">{subtitle}</h2>}
          </div>
        </div>
      </div>

      <div className="company-details">
        <div className="company-address">
          Cluster Box 24230
          <br />
          Broadlands
          <br />
          Mount Edgecombe
          <br />
          4156
        </div>
        <div className="company-contact">
          Tel: 031 459 0406
          <br />
          Cell: 076 834 2900
          <br />
          E-mail: operations@ksmcarriers.co.za
        </div>
      </div>

      <div className="company-registration">
        VAT Reg No: 4130274923
        <br />
        Reg: 2019/302835/07
      </div>
    </>
  );
};

export default CompanyHeader;