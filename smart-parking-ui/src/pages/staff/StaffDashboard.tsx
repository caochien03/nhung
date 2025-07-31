import React, { useState, useEffect } from "react";
import { Car, DollarSign, Users, Clock, Camera, Lock } from "lucide-react";
import DashboardOverview from "../../components/dashboard/DashboardOverview";
import CameraMonitor from "../../components/dashboard/CameraMonitor";
import PaymentManager from "../../components/dashboard/PaymentManager";
import BarrieControl from "../../components/dashboard/BarrieControl";
import CameraManagement from "../../components/dashboard/CameraManagement";
import { DashboardStats, ParkingRecord } from "../../types";
import { dashboardAPI, parkingAPI } from "../../services/api";
import wsService from "../../services/websocket";

const StaffDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    todayRevenue: 0,
    activeParkings: 0,
    totalVehicles: 0,
    registeredUsers: 0,
    walkInUsers: 0,
  });
  const [activeParkings, setActiveParkings] = useState<ParkingRecord[]>([]);
  const [selectedParking, setSelectedParking] = useState<ParkingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "cameras" | "barrie" | "payments">("overview");

  useEffect(() => {
    loadDashboardData();
    setupWebSocket();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, parkingsResponse] = await Promise.all([
        dashboardAPI.getStats(),
        parkingAPI.getActiveRecords(),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (parkingsResponse.success && parkingsResponse.data) {
        // Convert date strings to Date objects for display
        const processedParkings = parkingsResponse.data.map((parking: any) => ({
          ...parking,
          timeIn: new Date(parking.timeIn),
          timeOut: parking.timeOut ? new Date(parking.timeOut) : undefined,
        }));
        setActiveParkings(processedParkings);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    // Listen for new parking records
    wsService.subscribe("new_parking", (data: ParkingRecord) => {
      const processedData = {
        ...data,
        timeIn: new Date(data.timeIn),
        timeOut: data.timeOut ? new Date(data.timeOut) : undefined,
      };
      setActiveParkings(prev => [processedData, ...prev]);
      setStats(prev => ({
        ...prev,
        activeParkings: prev.activeParkings + 1,
      }));
    });

    // Listen for completed parking records
    wsService.subscribe("parking_completed", (data: ParkingRecord) => {
      setActiveParkings(prev => prev.filter(p => p.id !== data.id));
      setStats(prev => ({
        ...prev,
        activeParkings: Math.max(0, prev.activeParkings - 1),
        totalRevenue: prev.totalRevenue + (data.fee || 0),
      }));
    });

    // Listen for payment updates
    wsService.subscribe("payment_received", (data: any) => {
      setStats(prev => ({
        ...prev,
        todayRevenue: prev.todayRevenue + data.amount,
      }));
    });
  };

  const handlePaymentComplete = (payment: any) => {
    // Update stats and remove from active parkings
    setStats(prev => ({
      ...prev,
      todayRevenue: prev.todayRevenue + payment.amount,
    }));
    
    if (selectedParking) {
      const parkingId = selectedParking.id || selectedParking._id;
      setActiveParkings(prev => prev.filter(p => (p.id || p._id) !== parkingId));
      setSelectedParking(null);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển nhân viên</h1>
        <p className="text-gray-600">Quản lý bãi xe và thanh toán</p>
      </div>

      {/* Stats Overview */}
      <DashboardOverview stats={stats} />

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab("cameras")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "cameras"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Camera className="h-4 w-4" />
                <span>Camera</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("barrie")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "barrie"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>Barie</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "payments"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Thanh toán</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Camera Monitoring */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CameraMonitor cameraIndex={1} title="Camera vào" />
                  <CameraMonitor cameraIndex={2} title="Camera ra" />
                </div>
              </div>

              {/* Active Parkings */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Xe đang đỗ</h3>
                  <div className="space-y-3">
                    {activeParkings.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Không có xe nào đang đỗ</p>
                    ) : (
                      activeParkings.map((parking) => (
                        <div
                          key={parking.id || parking._id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedParking?.id === parking.id || selectedParking?._id === parking._id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedParking(parking)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{parking.licensePlate}</p>
                              <p className="text-sm text-gray-600">
                                Vào: {new Date(parking.timeIn).toLocaleTimeString("vi-VN", { hour12: false })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">ID: {parking.id ? parking.id.slice(-6) : parking._id ? parking._id.slice(-6) : 'N/A'}</p>
                              {parking.fee && (
                                <p className="font-medium text-green-600">
                                  {parking.fee.toLocaleString()} VND
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Payment Manager */}
                {selectedParking && (
                  <PaymentManager
                    parkingRecord={selectedParking}
                    onPaymentComplete={handlePaymentComplete}
                  />
                )}
              </div>
            </div>
          )}

          {/* Cameras Tab */}
          {activeTab === "cameras" && (
            <CameraManagement />
          )}

          {/* Barrie Tab */}
          {activeTab === "barrie" && (
            <BarrieControl />
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quản lý thanh toán</h3>
                <div className="space-y-3">
                  {activeParkings.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Không có xe nào cần thanh toán</p>
                  ) : (
                    activeParkings.map((parking) => (
                      <div
                        key={parking.id || parking._id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedParking?.id === parking.id || selectedParking?._id === parking._id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedParking(parking)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{parking.licensePlate}</p>
                            <p className="text-sm text-gray-600">
                              Vào: {new Date(parking.timeIn).toLocaleTimeString("vi-VN", { hour12: false })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">ID: {parking.id ? parking.id.slice(-6) : parking._id ? parking._id.slice(-6) : 'N/A'}</p>
                            {parking.fee && (
                              <p className="font-medium text-green-600">
                                {parking.fee.toLocaleString()} VND
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedParking && (
                <PaymentManager
                  parkingRecord={selectedParking}
                  onPaymentComplete={handlePaymentComplete}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
