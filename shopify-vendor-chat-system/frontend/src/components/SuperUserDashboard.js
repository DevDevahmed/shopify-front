import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SuperUserDashboard = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    loadVendors();
    loadAllCustomers();
    loadAssignments();
  }, []);

  const loadVendors = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/vendors`);
      const data = await response.json();
      setVendors(data.vendors || []);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadAllCustomers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/customers`);
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/customer-vendor-assignments`);
      const data = await response.json();
      setAssignments(data.assignments || {});
    } catch (error) {
      console.error('Failed to load assignments:', error);
    }
  };

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
        
        let successMessage = `✅ Synced! Added ${res.data.added} new vendors. Total: ${res.data.total}`;
        
        if (res.data.newVendors && res.data.newVendors.length > 0) {
          successMessage += '\n\n🔑 New Vendor Passwords:\n';
          res.data.newVendors.forEach(vendor => {
            successMessage += `${vendor.name} (${vendor.email}): ${vendor.password}\n`;
          });
          successMessage += '\n⚠️ Please save these passwords securely and share them with the respective vendors!';
        }
        
        setMessage(successMessage);
        setError('');
        loadVendors(); // Refresh vendor list
      } catch (err) {
        setError(err.response?.data?.error || 'Sync failed');
        setMessage('');
      }
    };
    reader.readAsText(file);
  };

  const handleAssignCustomer = async () => {
    if (!selectedCustomer || !selectedVendor) {
      return setError('Please select both customer and vendor');
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/assign-customer-to-vendor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: selectedCustomer,
          vendorId: selectedVendor
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Customer assigned successfully!`);
        setError('');
        setSelectedCustomer('');
        setSelectedVendor('');
        loadAssignments(); // Refresh assignments
      } else {
        setError(data.error || 'Assignment failed');
      }
    } catch (error) {
      setError('Assignment failed: ' + error.message);
    }
  };

  return (
    <div className="container mt-5">
      <h2>🔧 Super User Dashboard</h2>
      
      {/* CSV Upload Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h4>📁 Upload Vendor CSV from Shipturtle</h4>
        </div>
        <div className="card-body">
          <div className="alert alert-info">
            <strong>Instructions:</strong>
            <ol>
              <li>Go to your Shipturtle Dashboard</li>
              <li>Navigate to Vendors section</li>
              <li>Click Export → Download CSV</li>
              <li>Upload the CSV file here</li>
            </ol>
            <p><strong>Expected CSV Format:</strong> ID, Email, Name</p>
          </div>
          
          <div className="mb-3">
            <input
              type="file"
              className="form-control"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={handleSync}
            disabled={!file}
          >
            🔄 Sync Vendors
          </button>
          
          {message && (
            <div className="alert alert-success mt-3" style={{ whiteSpace: 'pre-line' }}>
              {message}
            </div>
          )}
          {error && (
            <div className="alert alert-danger mt-3">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Customer Assignment Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h4>👥 Assign Customers to Vendors</h4>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-5">
              <label className="form-label">Select Customer:</label>
              <select 
                className="form-select"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="">Choose a customer...</option>
                {customers.map(customer => (
                  <option key={customer.uid} value={customer.uid}>
                    {customer.name} ({customer.metadata?.email || customer.uid})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-5">
              <label className="form-label">Select Vendor:</label>
              <select 
                className="form-select"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
              >
                <option value="">Choose a vendor...</option>
                {vendors.map(vendor => (
                  <option key={vendor.uid} value={vendor.uid}>
                    {vendor.name} ({vendor.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">&nbsp;</label>
              <button 
                className="btn btn-success d-block"
                onClick={handleAssignCustomer}
                disabled={!selectedCustomer || !selectedVendor}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Assignments */}
      <div className="card">
        <div className="card-header">
          <h4>📋 Current Customer-Vendor Assignments</h4>
        </div>
        <div className="card-body">
          {Object.keys(assignments).length === 0 ? (
            <p className="text-muted">No assignments yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Customer Name</th>
                    <th>Assigned Vendor</th>
                    <th>Vendor Name</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(assignments).map(([customerId, vendorId]) => {
                    const customer = customers.find(c => c.uid === customerId);
                    const vendor = vendors.find(v => v.uid === vendorId);
                    return (
                      <tr key={customerId}>
                        <td>{customerId}</td>
                        <td>{customer?.name || 'Unknown'}</td>
                        <td>{vendorId}</td>
                        <td>{vendor?.name || 'Unknown'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperUserDashboard;
