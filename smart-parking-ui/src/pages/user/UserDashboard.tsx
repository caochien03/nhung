import React, { useState, useEffect } from "react";
import { Car, Clock, CreditCard, FileText, User, Plus, Calendar } from "lucide-react";
import { User as UserType, ParkingRecord, Vehicle, Subscription } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { usersAPI, subscriptionsAPI } from "../../services/api";
import VehicleRegistration from "../../components/user/VehicleRegistration";
import SubscriptionManager from "../../components/user/SubscriptionManager";

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [parkingHistory, setParkingHistory] = useState<ParkingRecord[]>([]);
  const [activeParking, setActiveParking] = useState<ParkingRecord | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVehicleRegistration, setShowVehicleRegistration] = useState(false);
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load user's vehicles
      const vehiclesResponse = await usersAPI.getUserVehicles();
      if (vehiclesResponse.success && vehiclesResponse.data) {
        setVehicles(vehiclesResponse.data);
      }

      // Load user's parking history
      const historyResponse = await usersAPI.getUserParkingHistory();
      if (historyResponse.success && historyResponse.data) {
        setParkingHistory(historyResponse.data);
      }

      // Load user's active parking
      const activeResponse = await usersAPI.getUserActiveParking();
      if (activeResponse.success && activeResponse.data) {
        setActiveParking(activeResponse.data);
      }

      // Load user's active subscription
      const subscriptionResponse = await subscriptionsAPI.getActiveSubscription();
      if (subscriptionResponse.success && subscriptionResponse.data) {
        setActiveSubscription(subscriptionResponse.data);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (timeIn: Date | string, timeOut: Date | string) => {
    const timeInDate = new Date(timeIn);
    const timeOutDate = new Date(timeOut);
    const duration = timeOutDate.getTime() - timeInDate.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleVehicleAdded = () => {
    loadUserData();
  };

  const handleSubscriptionUpdated = () => {
    loadUserData();
  };

  const getRemainingDays = (endDate: Date | string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển người dùng</h1>
        <p className="text-gray-600">Quản lý xe và lịch sử gửi xe</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.username}</h2>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-gray-500">Số dư: {user?.balance?.toLocaleString()} VND</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
            {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Xe đã đăng ký</p>
              <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lần gửi xe</p>
              <p className="text-2xl font-bold text-gray-900">{parkingHistory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng chi tiêu</p>
              <p className="text-2xl font-bold text-gray-900">
                {parkingHistory.reduce((sum, record) => sum + (record.fee || 0), 0).toLocaleString()} VND
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vé tháng</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeSubscription ? `${getRemainingDays(activeSubscription.endDate)} ngày` : "Chưa có"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Vehicles */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Xe của tôi</h3>
            <button
              onClick={() => setShowVehicleRegistration(true)}
              className="flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Thêm xe
            </button>
          </div>
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id || vehicle._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{vehicle.licensePlate}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {vehicle.vehicleType} • Đăng ký: {new Date(vehicle.registrationDate).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      vehicle.isRegistered 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {vehicle.isRegistered ? "Đã đăng ký" : "Chờ đăng ký"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => setShowVehicleRegistration(true)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              + Thêm xe mới
            </button>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vé tháng</h3>
            <button
              onClick={() => setShowSubscriptionManager(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Quản lý
            </button>
          </div>
          
          {activeSubscription ? (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900">
                  Gói {activeSubscription.type === "monthly" ? "1 tháng" : 
                       activeSubscription.type === "quarterly" ? "3 tháng" : "12 tháng"}
                </h4>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Đang hoạt động
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-blue-700">
                  <span className="font-medium">Còn lại:</span> {getRemainingDays(activeSubscription.endDate)} ngày
                </p>
                <p className="text-blue-700">
                  <span className="font-medium">Hết hạn:</span> {new Date(activeSubscription.endDate).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200">
                <button 
                  onClick={() => setShowSubscriptionManager(true)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Bạn chưa có vé tháng</p>
              <button
                onClick={() => setShowSubscriptionManager(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Đăng ký vé tháng
              </button>
            </div>
          )}
        </div>
      </div>      {/* Parking History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lịch sử gửi xe</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biển số
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giờ vào
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giờ ra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phí
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parkingHistory.map((record) => (
                <tr key={record.id || record._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.licensePlate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.timeIn).toLocaleTimeString("vi-VN", { hour12: false })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.timeOut 
                      ? new Date(record.timeOut).toLocaleTimeString("vi-VN", { hour12: false })
                      : "-"
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.timeOut 
                      ? formatDuration(record.timeIn, record.timeOut)
                      : "-"
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.fee ? `${record.fee.toLocaleString()} VND` : "-"}
                    {record.paymentType === "subscription" && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Vé tháng
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.paymentStatus === "paid" 
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {record.paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Registration Modal */}
      {showVehicleRegistration && (
        <VehicleRegistration
          onVehicleAdded={handleVehicleAdded}
          onClose={() => setShowVehicleRegistration(false)}
        />
      )}

      {/* Subscription Manager Modal */}
      {showSubscriptionManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Quản lý vé tháng</h2>
                <button
                  onClick={() => setShowSubscriptionManager(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SubscriptionManager onSubscriptionUpdated={handleSubscriptionUpdated} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
