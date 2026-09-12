import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BatchesPage from './pages/BatchesPage';
import AdminsPage from './pages/AdminsPage';
import SettingsPage from './pages/SettingsPage';
import PublicRedirect from './pages/PublicRedirect';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public Redirection & QR Code Scan Routes */}
          <Route path="/r/:code" element={<PublicRedirect />} />
          <Route path="/tag/:code" element={<PublicRedirect />} />

          {/* Authenticated Dashboard Pages */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/batches" element={<BatchesPage />} />

            {/* Super Admin Protected Pages */}
            <Route
              path="/admins"
              element={
                <ProtectedRoute requireSuperAdmin={true}>
                  <AdminsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requireSuperAdmin={true}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Root dynamic short-slug handler (e.g. customcliq.com/CC-9X7K2P) */}
          <Route path="/:code" element={<PublicRedirect />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
