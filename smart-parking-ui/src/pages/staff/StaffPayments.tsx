import React, { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import PaymentManager from "../../components/dashboard/PaymentManager";
import { ParkingRecord } from "../../types";
import { parkingAPI } from "../../services/api";

const StaffPayments: React.FC = () => {
  const [activeParkings, setActiveParkings] = useState<ParkingRecord[]>([]);
  const [selectedParking, setSelectedParking] = useState<ParkingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveParkings();
  }, []);

  const loadActiveParkings = async () => {
    try {
      const response = await parkingAPI.getActiveRecords();
      if (response.success && response.data) {
        // Convert date strings to Date objects for display
        const processedParkings = response.data.map((parking: any) => ({
          ...parking,
          timeIn: new Date(parking.timeIn),
          timeOut: parking.timeOut ? new Date(parking.timeOut) : undefined,
        }));
        setActiveParkings(processedParkings);
      }
    } catch (error) {
      console.error("Error loading active parkings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = (payment: any) => {
    // Remove completed parking from list
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
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Thanh toán</h1>
        <p className="text-gray-600">Xử lý thanh toán cho xe đang đỗ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Parkings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Xe cần thanh toán</h3>
            <button
              onClick={loadActiveParkings}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Làm mới
            </button>
          </div>
          
          <div className="space-y-3">
            {activeParkings.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Không có xe nào cần thanh toán</p>
              </div>
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
        <div>
          {selectedParking ? (
            <PaymentManager
              parkingRecord={selectedParking}
              onPaymentComplete={handlePaymentComplete}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Chọn xe để xử lý thanh toán</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffPayments; 