import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Car, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  Camera,
  CreditCard,
  FileText,
  Home
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case "admin":
        return [
          { path: "/admin/dashboard", label: "Dashboard", icon: Home },
          { path: "/admin/users", label: "Quản lý người dùng", icon: Users },
          { path: "/admin/vehicles", label: "Quản lý xe", icon: Car },
          { path: "/admin/parking", label: "Quản lý bãi xe", icon: BarChart3 },
          { path: "/admin/reports", label: "Báo cáo", icon: FileText },
          { path: "/admin/settings", label: "Cài đặt", icon: Settings },
        ];
      case "staff":
        return [
          { path: "/staff/dashboard", label: "Dashboard", icon: Home },
          { path: "/staff/cameras", label: "Camera", icon: Camera },
          { path: "/staff/payments", label: "Thanh toán", icon: CreditCard },
          { path: "/staff/parking", label: "Bãi xe", icon: Car },
        ];
      case "user":
        return [
          { path: "/user/dashboard", label: "Dashboard", icon: Home },
          { path: "/user/vehicles", label: "Xe của tôi", icon: Car },
          { path: "/user/history", label: "Lịch sử", icon: FileText },
          { path: "/user/profile", label: "Hồ sơ", icon: User },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <Car className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Smart Parking</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        {user && (
          <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Sidebar;
