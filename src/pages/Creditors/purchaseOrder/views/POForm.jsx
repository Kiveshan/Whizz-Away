"use client"
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../css/PO.css";
import CompanyHeader from "../../../../components/CompanyHeader"

const POForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { categoryId, categoryName } = location.state || {};

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    supplier: "",
    date: new Date().toISOString().split("T")[0],
    attentionTo: "",
    receivedBy: "",
    regNo: "",
    subbie: "",
    description: "",
    quantity: "",
    unitPrice: "",
  });

  const [amount, setAmount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [vat, setVat] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (categoryId) {
      const fetchSuppliers = async () => {
        try {
          setLoading(true);
          const response = await axios.get(`http://localhost:5000/api/po-form/suppliers/${categoryId}`);
          setSuppliers(response.data);
          setError(null);
        } catch (err) {
          setError("Failed to load suppliers. Please try again.");
          console.error("Error fetching suppliers:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchSuppliers();
    }
  }, [categoryId]);

  useEffect(() => {
    const calculateAmounts = async () => {
      const qty = Number.parseFloat(formData.quantity) || 0;
      const price = Number.parseFloat(formData.unitPrice) || 0;

      if (qty > 0 && price > 0) {
        try {
          const response = await axios.post("http://localhost:5000/api/po-form/calculate", {
            quantity: qty,
            unitPrice: price,
          });

          const { amount, subtotal, vat, total } = response.data;
          setAmount(Number.parseFloat(amount));
          setSubtotal(Number.parseFloat(subtotal));
          setVat(Number.parseFloat(vat));
          setTotal(Number.parseFloat(total));
        } catch (err) {
          console.error("Error calculating amounts:", err);
        }
      } else {
        setAmount(0);
        setSubtotal(0);
        setVat(0);
        setTotal(0);
      }
    };

    calculateAmounts();
  }, [formData.quantity, formData.unitPrice]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if ((name === "quantity" || name === "unitPrice") && value < 0) {
    return;
  }
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleBack = () => {
    navigate("/Creditors/CreatePO");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier) {
      alert("Please select a supplier");
      return;
    }

    if (!formData.quantity || !formData.unitPrice || !formData.description) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5000/api/po-form/create", {
        expenseTypeId: categoryId,
        supplierId: formData.supplier,
        regNo: formData.regNo,
        attentionTo: formData.attentionTo,
        receivedBy: formData.receivedBy,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        description: formData.description,
        subbie: formData.subbie,
        date: formData.date,
        total,
      });
      navigate("/Creditors/CreditorsOther")
    } catch (err) {
      setError("Failed to create purchase order. Please try again.");
      console.error("Error creating purchase order:", err);
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="po-form-wrapper">
    <div className="po-form-container">
      <CompanyHeader />

      <button className="back-button" onClick={handleBack}>
        Back
      </button>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="supplier">Supplier</label>
              <select
                id="supplier"
                name="supplier"
                className="dropdown"
                value={formData.supplier}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.supplier}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                className="form-control"
                value={formData.date}
                onChange={handleInputChange}
                min={new Date().toISOString().split("T")[0]}  
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="attentionTo">Att</label>
              <input
                type="text"
                id="attentionTo"
                name="attentionTo"
                className="form-control"
                value={formData.attentionTo}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="receivedBy">Received by</label>
              <input
                type="text"
                id="receivedBy"
                name="receivedBy"
                className="form-control"
                value={formData.receivedBy}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="regNo">Ref/Reg No</label>
              <input
                type="text"
                id="regNo"
                name="regNo"
                className="form-control"
                value={formData.regNo}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="subbie">Subbie</label>
              <input
                type="text"
                id="subbie"
                name="subbie"
                className="form-control"
                value={formData.subbie}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        <div className="line-items">
          <table className="line-items-table">
            <thead>
              <tr>
                <th>Expense Type</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <input
                    type="text"
                    value={categoryName || ''}
                    readOnly
                  />
                </td>
                <td>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </td>
                <td>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                </td>
                <td>
                  <input
                    type="number"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleInputChange}
                    required
                  />
                </td>
                <td>
                  <input type="text" value={`R ${amount.toFixed(2)}`} readOnly />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="totals-section">
          <table className="totals-table">
            <tbody>
              <tr>
                <td className="label-cell">Sub-Total</td>
                <td className="amount-cell">
                  <input type="text" value={`R ${subtotal.toFixed(2)}`} readOnly />
                </td>
              </tr>
              <tr>
                <td className="label-cell">VAT(15%)</td>
                <td className="amount-cell">
                  <input type="text" value={`R ${vat.toFixed(2)}`} readOnly />
                </td>
              </tr>
              <tr>
                <td className="label-cell">Total</td>
                <td className="amount-cell">
                  <input type="text" value={`R ${total.toFixed(2)}`} readOnly />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="submit-section">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
    </div>
  );
};

export default POForm;
