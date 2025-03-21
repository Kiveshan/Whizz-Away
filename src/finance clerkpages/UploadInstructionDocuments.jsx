import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import '../finance clerkpages/css/UploadInstructionDocuments.css';

const UploadInstructionDocuments = () => {
    const navigate = useNavigate()
  const [documents, setDocuments] = useState([
    { name: 'Delivery Note Driver 1', type: 'Delivery Note', date: '14/01/2020', file: null },
    { name: 'Delivery Note Driver 2', type: 'Delivery Note', date: '27/06/2022', file: null },
  ]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Instruction Document',);

  const handleRemove = (index) => {
    const newDocs = [...documents];
    newDocs.splice(index, 1);
    setDocuments(newDocs);
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!selectedFile || !docName) {
      alert('Please select a file and enter a document name');
      return;
    }

    const newDocument = {
      name: docName,
      type: docType,
      date: new Date().toLocaleDateString('en-GB'),
      file: selectedFile
    };

    setDocuments([...documents, newDocument]);
    setDocName('');
    setSelectedFile(null);
    document.getElementById('fileInput').value = '';
  };

  const handleCancel = () => {
    setDocName('');
    setSelectedFile(null);
    document.getElementById('fileInput').value = '';
  };

return (
    <div className="instruction-container">
        <div className="">
            <button className="back-button" onClick={() => navigate("/instructions")}>
                Back
            </button>
        </div>

        <div className="steps">
            {[1, 2, 3, 4, 5, 6].map((leg) => (
                <button key={leg} className="step-btn">Leg {leg}</button>
            ))}
            <button className="step-btn document-btn">Document</button>
        </div>

        <div className="upload-section">
            <h3>Documentation for Instruction/Instruction Completion</h3>
            <div className="upload-box">
                <p>{selectedFile ? selectedFile.name : 'Drop files here'}</p>
                <p>Supported format: PNG, JPG OR <span 
                    className="browse-link"
                    onClick={() => document.getElementById('fileInput').click()}
                >
                    Browse files
                </span></p>
                <input 
                    type="file" 
                    id="fileInput"
                    style={{ display: 'none' }}
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                />
            </div>

            <div className="form">
                <input 
                    type="text" 
                    placeholder="Document Name" 
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                />
                <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)} 
                    placeholder="Document type" 
                >
                    <option>Instruction Document</option>
                    <option>Delivary Note</option>
                    <option>Deli43Svary Note</option>
                </select>
                <div className="form-actions">
                    <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
                    <button className="upload-btn" onClick={handleUpload}>Upload</button>
                </div>
            </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <table className="document-table" style={{ textAlign: 'center' }}>
                <thead>
                    <tr>
                        <th>Document Name</th>
                        <th>Document Type</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {documents.map((doc, index) => (
                        <tr key={index}>
                            <td>{doc.name}</td>
                            <td>{doc.type}</td>
                            <td>{doc.date}</td>
                            <td>
                                <button onClick={() => handleRemove(index)} className="remove-btn">Remove</button>
                                <button 
                                    className="view-btn" 
                                    onClick={() => doc.file && window.open(URL.createObjectURL(doc.file))}
                                    disabled={!doc.file}
                                >
                                    View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <button className="finish-btn">Finish Instruction</button>
    </div>
);
};

export default UploadInstructionDocuments;