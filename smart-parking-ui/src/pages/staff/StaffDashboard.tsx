import React, { useState, useEffect, useRef } from "react";
import { Car, DollarSign, Users, Clock, Camera, Lock, CreditCard, Calendar } from "lucide-react";
import DashboardOverview from "../../components/dashboard/DashboardOverview";
import CameraMonitor from "../../components/dashboard/CameraMonitor";
import PaymentManager from "../../components/dashboard/PaymentManager";
import PaymentConfirmation from "../../components/dashboard/PaymentConfirmation";
import PaymentPopup from "../../components/dashboard/PaymentPopup";
import PaymentDebugger from "../../components/debug/PaymentDebugger";
import BarrieControl from "../../components/dashboard/BarrieControl";
import CameraManagement from "../../components/dashboard/CameraManagement";
import SubscriptionStatsPanel from "../../components/dashboard/SubscriptionStatsPanel";
import { DashboardStats, ParkingRecord, User } from "../../types";
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
  const [activeTab, setActiveTab] = useState<"overview" | "cameras" | "barrie" | "payments" | "confirm-payments" | "subscriptions">("overview");
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  
  // Camera refs để gọi auto capture
  const camera1Ref = useRef<any>(null);
  const camera2Ref = useRef<any>(null);

  useEffect(() => {
    loadDashboardData();
    setupWebSocket();
    
    // Kết nối WebSocket với debug
    console.log("Đang kết nối WebSocket...");
    wsService.connect("ws://localhost:8080");
    
    // Test WebSocket connection sau 2 giây
    setTimeout(() => {
      console.log("Test WebSocket listeners:", wsService);
    }, 2000);

    // Auto refresh data mỗi 30 giây
    const refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, parkingsResponse, pendingPaymentsResponse] = await Promise.all([
        dashboardAPI.getStats(),
        parkingAPI.getActiveRecords(),
        parkingAPI.getPendingPayments(),
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

      if (pendingPaymentsResponse.success && pendingPaymentsResponse.data) {
        setPendingPaymentsCount(pendingPaymentsResponse.data.length);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    console.log("Setting up WebSocket listeners...");
    
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

    // Listen for payment required notifications
    wsService.subscribe("payment_required", (data: any) => {
      console.log("🔔 New payment required in StaffDashboard:", data);
      setPendingPaymentsCount(prev => prev + 1);
      
      // Auto switch to confirm-payments tab if currently on overview
      if (activeTab === "overview") {
        setActiveTab("confirm-payments");
      }
    });

    // Listen for payment completed notifications  
    wsService.subscribe("payment_completed", (data: any) => {
      console.log("✅ Payment completed in StaffDashboard:", data);
      setPendingPaymentsCount(prev => Math.max(0, prev - 1));
    });

    // Listen for auto capture requests from ESP32
    wsService.subscribe("auto_capture", (message: any) => {
      console.log("🎯 Nhận WebSocket auto_capture:", message);
      const { uid, cameraIndex } = message;
      
      console.log("📹 Camera refs status:", {
        camera1Available: !!camera1Ref.current,
        camera2Available: !!camera2Ref.current,
        requestedCamera: cameraIndex
      });
      
      // ESP32 mapping: RFID #1 → cameraIndex=1 (VÀO), RFID #2 → cameraIndex=2 (RA)
      // Backend logic: cameraIndex=1 (VÀO), cameraIndex=2 (RA)
      // Frontend logic: Camera 1 = VÀO, Camera 2 = RA
      
      // Gọi auto capture từ camera tương ứng
      if (cameraIndex === 1 && camera1Ref.current) {
        console.log("✅ ESP32 RFID #1 (VÀO) → Camera 1 auto capture với UID:", uid);
        camera1Ref.current.autoCaptureFromWS(uid, 1);
      } else if (cameraIndex === 2 && camera2Ref.current) {
        console.log("✅ ESP32 RFID #2 (RA) → Camera 2 auto capture với UID:", uid);
        camera2Ref.current.autoCaptureFromWS(uid, 2);
      } else {
        console.log("❌ Camera ref không tồn tại hoặc cameraIndex không hợp lệ:", { 
          cameraIndex, 
          camera1Ref: !!camera1Ref.current, 
          camera2Ref: !!camera2Ref.current,
          activeTab 
        });
      }
    });
    
    console.log("✅ WebSocket listeners đã được setup");
  };

  const handlePaymentComplete = (payment: any) => {
    // Update stats and remove from active parkings
    setStats(prev => ({
      ...prev,
      todayRevenue: prev.todayRevenue + payment.amount,
    }));
    
    // Decrease pending payments count
    setPendingPaymentsCount(prev => Math.max(0, prev - 1));
    
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
            <button
              onClick={() => setActiveTab("confirm-payments")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "confirm-payments"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Xác nhận TT</span>
                {pendingPaymentsCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    {pendingPaymentsCount}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "subscriptions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Vé tháng</span>
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
                {/* Camera Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <h4 className="font-medium text-green-700">CỔNG VÀO</h4>
                      <span className="text-sm text-gray-500">RFID 1 | Camera #1</span>
                    </div>
                    <CameraMonitor 
                      ref={camera1Ref}
                      cameraIndex={0} 
                      logicIndex={1}
                      title="Camera Cổng Vào" 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <h4 className="font-medium text-red-700">CỔNG RA</h4>
                      <span className="text-sm text-gray-500">RFID 2 | Camera #2</span>
                    </div>
                    <CameraMonitor 
                      ref={camera2Ref}
                      cameraIndex={1} 
                      logicIndex={2}
                      title="Camera Cổng Ra" 
                    />
                  </div>
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
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium">{parking.licensePlate}</p>
                                {parking.isRegisteredUser && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                    Đăng ký
                                  </span>
                                )}
                                {parking.paymentType === "subscription" && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                    Vé tháng
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                Vào: {new Date(parking.timeIn).toLocaleTimeString("vi-VN", { hour12: false })}
                              </p>
                              {parking.currentDuration && (
                                <p className="text-xs text-gray-500">
                                  Đã đỗ: {parking.currentDuration}
                                </p>
                              )}
                              {parking.userId && typeof parking.userId === 'object' && 'username' in parking.userId && (
                                <p className="text-xs text-blue-600">
                                  User: {(parking.userId as User).username}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">ID: {parking.id ? parking.id.slice(-6) : parking._id ? parking._id.slice(-6) : 'N/A'}</p>
                              {parking.fee !== undefined && (
                                <div>
                                  <p className="font-medium text-green-600">
                                    {parking.fee.toLocaleString()} VND
                                  </p>
                                  {parking.feeType && (
                                    <p className="text-xs text-gray-500">
                                      {parking.feeType}
                                    </p>
                                  )}
                                </div>
                              )}
                              <p className="text-xs text-gray-400">
                                RFID: {parking.rfid}
                              </p>
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
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">{parking.licensePlate}</p>
                              {parking.isRegisteredUser && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                  Đăng ký
                                </span>
                              )}
                              {parking.paymentType === "subscription" && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                  Vé tháng
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Vào: {new Date(parking.timeIn).toLocaleTimeString("vi-VN", { hour12: false })}
                            </p>
                            {parking.currentDuration && (
                              <p className="text-xs text-gray-500">
                                Đã đỗ: {parking.currentDuration}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">ID: {parking.id ? parking.id.slice(-6) : parking._id ? parking._id.slice(-6) : 'N/A'}</p>
                            {parking.fee !== undefined && (
                              <div>
                                <p className="font-medium text-green-600">
                                  {parking.fee.toLocaleString()} VND
                                </p>
                                {parking.feeType && (
                                  <p className="text-xs text-gray-500">
                                    {parking.feeType}
                                  </p>
                                )}
                              </div>
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

          {/* Payment Confirmation Tab */}
          {activeTab === "confirm-payments" && (
            <div className="space-y-6">
              <PaymentConfirmation />
              
              {/* Debug section - Remove in production */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-600">Debug Tools (Development)</h3>
                <PaymentDebugger />
              </div>
            </div>
          )}

          {/* Subscription Stats Tab */}
          {activeTab === "subscriptions" && (
            <div className="space-y-6">
              <SubscriptionStatsPanel />
            </div>
          )}
        </div>
      </div>
      
      {/* Auto Payment Popup - Hovers over everything */}
      <PaymentPopup autoShow={true} />
    </div>
  );
};

export default StaffDashboard;
