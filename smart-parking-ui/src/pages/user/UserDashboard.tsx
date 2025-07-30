import React, { useState, useEffect } from "react";
import { Car, Clock, CreditCard, FileText, User } from "lucide-react";
import { User as UserType, ParkingRecord, Vehicle } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [parkingHistory, setParkingHistory] = useState<ParkingRecord[]>([]);
  const [activeParking, setActiveParking] = useState<ParkingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    // Simulate loading user data
    setTimeout(() => {
      setVehicles([
        {
          id: "1",
          licensePlate: "30A-12345",
          userId: user?.id || "",
          vehicleType: "car",
          isRegistered: true,
          registrationDate: new Date("2024-01-15"),
        },
        {
          id: "2",
          licensePlate: "30B-67890",
          userId: user?.id || "",
          vehicleType: "car",
          isRegistered: true,
          registrationDate: new Date("2024-02-20"),
        },
      ]);

      setParkingHistory([
        {
          id: "1",
          rfid: "RFID001",
          licensePlate: "30A-12345",
          timeIn: new Date("2024-03-15T08:30:00"),
          timeOut: new Date("2024-03-15T17:45:00"),
          fee: 95000,
          cameraIndex: 1,
          status: "completed",
          paymentStatus: "paid",
          paymentMethod: "balance",
        },
        {
          id: "2",
          rfid: "RFID002",
          licensePlate: "30B-67890",
          timeIn: new Date("2024-03-14T09:15:00"),
          timeOut: new Date("2024-03-14T18:30:00"),
          fee: 105000,
          cameraIndex: 1,
          status: "completed",
          paymentStatus: "paid",
          paymentMethod: "qr",
        },
      ]);

      setActiveParking({
        id: "3",
        rfid: "RFID003",
        licensePlate: "30A-12345",
        timeIn: new Date("2024-03-16T10:00:00"),
        cameraIndex: 1,
        status: "active",
        paymentStatus: "pending",
      });

      setLoading(false);
    }, 1000);
  };

  const formatDuration = (timeIn: Date | string, timeOut: Date | string) => {
    const timeInDate = new Date(timeIn);
    const timeOutDate = new Date(timeOut);
    const duration = timeOutDate.getTime() - timeInDate.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Đang gửi xe</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeParking ? "1" : "0"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Vehicles */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Xe của tôi</h3>
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4">
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
            <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors">
              + Thêm xe mới
            </button>
          </div>
        </div>

        {/* Active Parking */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Đang gửi xe</h3>
          {activeParking ? (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900">{activeParking.licensePlate}</h4>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Đang gửi
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-blue-700">
                  <span className="font-medium">Giờ vào:</span> {new Date(activeParking.timeIn).toLocaleTimeString("vi-VN", { hour12: false })}
                </p>
                <p className="text-blue-700">
                  <span className="font-medium">Ngày:</span> {new Date(activeParking.timeIn).toLocaleDateString("vi-VN")}
                </p>
                <p className="text-blue-700">
                  <span className="font-medium">ID:</span> {activeParking.id.slice(-6)}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Xem chi tiết
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Không có xe nào đang gửi</p>
            </div>
          )}
        </div>
      </div>

      {/* Parking History */}
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
                <tr key={record.id} className="hover:bg-gray-50">
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
    </div>
  );
};

export default UserDashboard;
