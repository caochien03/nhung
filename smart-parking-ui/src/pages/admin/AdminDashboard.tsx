import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { DashboardStats, Revenue } from "../../types";
import { dashboardAPI } from "../../services/api";
import DashboardOverview from "../../components/dashboard/DashboardOverview";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    todayRevenue: 0,
    activeParkings: 0,
    totalVehicles: 0,
    registeredUsers: 0,
    walkInUsers: 0,
  });
  const [revenueData, setRevenueData] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, revenueResponse] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRevenue("week"),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (revenueResponse.success && revenueResponse.data) {
        setRevenueData(revenueResponse.data);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sample data for charts (replace with real data)
  const weeklyRevenue = [
    { day: "T2", revenue: 1200000, registered: 45, walkIn: 23 },
    { day: "T3", revenue: 1500000, registered: 52, walkIn: 28 },
    { day: "T4", revenue: 1800000, registered: 48, walkIn: 35 },
    { day: "T5", revenue: 2200000, registered: 61, walkIn: 42 },
    { day: "T6", revenue: 2500000, registered: 58, walkIn: 38 },
    { day: "T7", revenue: 2800000, registered: 65, walkIn: 45 },
    { day: "CN", revenue: 2000000, registered: 42, walkIn: 30 },
  ];

  const vehicleTypeData = [
    { name: "Ô tô", value: 75, color: "#3B82F6" },
    { name: "Xe tải", value: 15, color: "#10B981" },
    { name: "Xe buýt", value: 10, color: "#F59E0B" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển quản trị</h1>
        <p className="text-gray-600">Tổng quan hệ thống Smart Parking</p>
      </div>

      {/* Stats Overview */}
      <DashboardOverview stats={stats} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Revenue Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Doanh thu tuần</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => [`${value.toLocaleString()} VND`, "Doanh thu"]}
                labelFormatter={(label) => `Ngày ${label}`}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#3B82F6" name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle Type Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố loại xe</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vehicleTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {vehicleTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} xe`, "Số lượng"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Registration Trend */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Xu hướng đăng ký</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="registered" stroke="#3B82F6" name="Đăng ký" />
              <Line type="monotone" dataKey="walkIn" stroke="#10B981" name="Khách vãng lai" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái hệ thống</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-800">Camera vào</p>
                <p className="text-sm text-green-600">Hoạt động bình thường</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-800">Camera ra</p>
                <p className="text-sm text-green-600">Hoạt động bình thường</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-800">Barie vào</p>
                <p className="text-sm text-green-600">Đóng</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-800">Barie ra</p>
                <p className="text-sm text-green-600">Đóng</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-800">OCR Service</p>
                <p className="text-sm text-green-600">Hoạt động bình thường</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-semibold">��</span>
              </div>
              <p className="text-sm font-medium">Xuất báo cáo</p>
            </div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
            <div className="text-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 font-semibold">👥</span>
              </div>
              <p className="text-sm font-medium">Quản lý người dùng</p>
            </div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <div className="text-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-600 font-semibold">⚙️</span>
              </div>
              <p className="text-sm font-medium">Cài đặt hệ thống</p>
            </div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
            <div className="text-center">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-orange-600 font-semibold">🔧</span>
              </div>
              <p className="text-sm font-medium">Bảo trì</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
