import React, { useState, useEffect } from "react";
import { Car, DollarSign, Users, Clock } from "lucide-react";
import DashboardOverview from "../../components/dashboard/DashboardOverview";
import CameraMonitor from "../../components/dashboard/CameraMonitor";
import PaymentManager from "../../components/dashboard/PaymentManager";
import { DashboardStats, ParkingRecord } from "../../types";
import { mockAPI } from "../../services/mockAPI";
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

  useEffect(() => {
    loadDashboardData();
    setupWebSocket();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, parkingsResponse] = await Promise.all([
        mockAPI.dashboard.getStats(),
        mockAPI.parking.getActiveRecords(),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (parkingsResponse.success && parkingsResponse.data) {
        setActiveParkings(parkingsResponse.data);
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
      setActiveParkings(prev => [data, ...prev]);
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
      setActiveParkings(prev => prev.filter(p => p.id !== selectedParking.id));
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Monitoring */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CameraMonitor cameraIndex={1} title="Camera vào" />
            <CameraMonitor cameraIndex={2} title="Camera ra" />
          </div>
        </div>

        {/* Payment Management */}
        <div className="space-y-6">
          {/* Active Parkings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Xe đang đỗ</h3>
            <div className="space-y-3">
              {activeParkings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Không có xe nào đang đỗ</p>
              ) : (
                activeParkings.map((parking) => (
                  <div
                    key={parking.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedParking?.id === parking.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedParking(parking)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{parking.licensePlate}</p>
                        <p className="text-sm text-gray-600">
                          Vào: {parking.timeIn.toLocaleTimeString("vi-VN", { hour12: false })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">ID: {parking.id.slice(-6)}</p>
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
    </div>
  );
};

export default StaffDashboard;
