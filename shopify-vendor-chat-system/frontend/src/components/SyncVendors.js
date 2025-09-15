import React, { useState } from 'react';
import axios from 'axios';

const SyncVendors = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSync = async () => {
    if (!file) return setError("Please select a CSV file");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target.result;
        const res = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/sync-vendors`,
          csvContent,
          {
            headers: {
              'Content-Type': 'text/csv'
            }
          }
        );
        setMessage(`✅ Synced! Added ${res.data.added} new vendors. Total: ${res.data.total}`);
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Sync failed');
        setMessage('');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h3>🔄 Sync Vendors from Shipturtle CSV</h3>
      <div className="card p-4">
        <p>1. Go to Shipturtle Dashboard → Vendors → Export → Download CSV.</p>
        <p>2. Upload it here to auto-add/update vendors in chat system.</p>
        <div className="mb-3">
          <input
            type="file"
            className="form-control"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>
        <button
          className="btn btn-primary w-100"
          onClick={handleSync}
          disabled={!file}
        >
          Sync Vendors
        </button>
        {message && <div className="alert alert-success mt-3">{message}</div>}
        {error && <div className="alert alert-danger mt-3">{error}</div>}
      </div>
    </div>
  );
};

export default SyncVendors;