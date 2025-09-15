import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SyncVendors from './components/SyncVendors';
import AdminAddVendor from './components/AdminAddVendor';
import SuperUserDashboard from './components/SuperUserDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/sync-vendors" element={<SyncVendors />} />
        <Route path="/dashboard/admin" element={<AdminAddVendor />} />
        <Route path="/super-admin" element={<SuperUserDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;