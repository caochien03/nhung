import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffCameras from "./pages/staff/StaffCameras";
import StaffBarrie from "./pages/staff/StaffBarrie";
import StaffPayments from "./pages/staff/StaffPayments";
import UserDashboard from "./pages/user/UserDashboard";

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  console.log("ProtectedRoute: user =", user, "loading =", loading, "allowedRoles =", allowedRoles);

  if (loading) {
    console.log("ProtectedRoute: Still loading...");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log("ProtectedRoute: User role not allowed, redirecting");
    // Redirect to appropriate dashboard based on user role
    switch (user.role) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "staff":
        return <Navigate to="/staff/dashboard" replace />;
      case "user":
        return <Navigate to="/user/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  console.log("ProtectedRoute: Access granted");
  return <>{children}</>;
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Staff Routes */}
        <Route
          path="/staff/*"
          element={
            <ProtectedRoute allowedRoles={["staff"]}>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<StaffDashboard />} />
                  <Route path="cameras" element={<StaffCameras />} />
                  <Route path="barrie" element={<StaffBarrie />} />
                  <Route path="payments" element={<StaffPayments />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* User Routes */}
        <Route
          path="/user/*"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <Layout>
                <Routes>
                  <Route path="dashboard" element={<UserDashboard />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default Route - Redirect based on user role */}
        <Route
          path="/"
          element={
            user ? (
              (() => {
                const redirectPath = user.role === "admin"
                  ? "/admin/dashboard"
                  : user.role === "staff"
                  ? "/staff/dashboard"
                  : "/user/dashboard";
                console.log("Default route: User =", user.username, "Role =", user.role, "Redirecting to =", redirectPath);
                return <Navigate to={redirectPath} replace />;
              })()
            ) : (
              (() => {
                console.log("Default route: No user, redirecting to login");
                return <Navigate to="/login" replace />;
              })()
            )
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </AuthProvider>
  );
};

export default App;
