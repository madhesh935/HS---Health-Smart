
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CreatePatient } from './pages/CreatePatient';
import { PatientLogin } from './pages/PatientLogin';
import { PatientHome } from './pages/PatientHome';
import { HospitalPatientDashboard } from './pages/HospitalPatientDashboard';

const ProtectedRoute = ({ children, type }: { children?: React.ReactNode, type: 'hospital' | 'patient' }) => {
  const active = sessionStorage.getItem(type === 'hospital' ? 'activeHospital' : 'activePatient');
  if (!active) return <Navigate to={type === 'hospital' ? '/login' : '/patient/login'} replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute type="hospital"><Dashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/create-patient" 
          element={<ProtectedRoute type="hospital"><CreatePatient /></ProtectedRoute>} 
        />
        <Route 
          path="/hospital/patient/:id" 
          element={<ProtectedRoute type="hospital"><HospitalPatientDashboard /></ProtectedRoute>} 
        />
        <Route path="/patient/login" element={<PatientLogin />} />
        <Route 
          path="/patient/home" 
          element={<ProtectedRoute type="patient"><PatientHome /></ProtectedRoute>} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
