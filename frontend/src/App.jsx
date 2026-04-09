import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import CommandHub from './pages/CommandHub';
import ModulePage from './pages/ModulePage';
import ComingSoon from './pages/ComingSoon';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import { AuthProvider } from './context/AuthContext';
import { StatusProvider } from './context/StatusContext';
import StatusModal from './components/common/StatusModal';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './App.css';

function App() {
  return (
    <StatusProvider>
      <StatusModal />
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Login />} />

              {/* Protected Routes */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/hub" element={<ProtectedRoute><CommandHub /></ProtectedRoute>} />
              <Route path="/module/:moduleName" element={<ProtectedRoute><ModulePage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

              {/* Placeholders */}
              <Route path="/dashboard" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
              <Route path="/coming-soon" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </StatusProvider>
  );
}

export default App;
