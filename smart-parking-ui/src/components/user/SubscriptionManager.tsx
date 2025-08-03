import React, { useState, useEffect } from "react";
import { Calendar, Check, CreditCard, Clock, X, AlertCircle, Car, Plus } from "lucide-react";
import { Subscription, Vehicle } from "../../types";
import { subscriptionsAPI } from "../../services/api";
import { toast } from "react-hot-toast";

interface SubscriptionManagerProps {
  onSubscriptionUpdated?: () => void;
  selectedVehicle?: Vehicle | null;
  vehicles?: Vehicle[];
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ 
  onSubscriptionUpdated, 
  selectedVehicle,
  vehicles = [] 
}) => {
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [selectedLicensePlate, setSelectedLicensePlate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"balance" | "qr">("balance");
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadData();
    // Set selected vehicle if provided
    if (selectedVehicle) {
      setSelectedLicensePlate(selectedVehicle.licensePlate);
      setShowPurchaseModal(true);
    }
  }, [selectedVehicle]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all active subscriptions
      const activeResponse = await subscriptionsAPI.getAllActiveSubscriptions();
      if (activeResponse.success && activeResponse.data) {
        setActiveSubscriptions(activeResponse.data);
      }

      // Load pricing
      const pricingResponse = await subscriptionsAPI.getSubscriptionPricing();
      if (pricingResponse.success) {
        setPricing(pricingResponse.data);
      }
    } catch (error) {
      console.error("Error loading subscription data:", error);
      toast.error("Không thể tải thông tin vé tháng");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    try {
      if (!selectedLicensePlate) {
        toast.error("Vui lòng chọn biển số xe");
        return;
      }

      // Check if vehicle already has subscription
      const existingSubscription = activeSubscriptions.find(
        sub => sub.licensePlate === selectedLicensePlate
      );
      
      if (existingSubscription) {
        toast.error(`Xe ${selectedLicensePlate} đã có vé tháng`);
        return;
      }

      setPurchasing(true);
      
      const response = await subscriptionsAPI.createSubscription({
        type: selectedPlan,
        paymentMethod,
        vehicleLimit: 1,
        licensePlate: selectedLicensePlate,
      });

      if (response.success) {
        if (paymentMethod === "balance") {
          toast.success("Đăng ký vé tháng thành công!");
          setShowPurchaseModal(false);
          setSelectedLicensePlate("");
          loadData();
          onSubscriptionUpdated?.();
        } else {
          // QR payment
          toast.success("Vui lòng quét mã QR để thanh toán");
          // Handle QR code display here
        }
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.response?.data?.message || "Không thể đăng ký vé tháng");
    } finally {
      setPurchasing(false);
    }
  };

  const handleCancel = async (subscription: Subscription) => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy vé tháng cho xe ${subscription.licensePlate}?`)) {
      try {
        const response = await subscriptionsAPI.cancelSubscription(subscription._id || subscription.id!);
        if (response.success) {
          toast.success("Đã hủy vé tháng");
          loadData();
          onSubscriptionUpdated?.();
        }
      } catch (error) {
        console.error("Cancel error:", error);
        toast.error("Không thể hủy vé tháng");
      }
    }
  };

  const getRemainingDays = (endDate: Date | string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get available vehicles (without active subscription)
  const getAvailableVehicles = () => {
    return vehicles.filter(vehicle => 
      !activeSubscriptions.find(sub => sub.licensePlate === vehicle.licensePlate)
    );
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
      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vé tháng hiện có</h3>
          <div className="space-y-4">
            {activeSubscriptions.map((subscription) => (
              <div key={subscription._id || subscription.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Car className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-blue-900">{subscription.licensePlate}</h4>
                      <p className="text-sm text-blue-700">
                        Gói {subscription.type === "monthly" ? "1 tháng" : 
                             subscription.type === "quarterly" ? "3 tháng" : "12 tháng"}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Hoạt động
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">
                      <span className="font-medium">Còn lại:</span> {getRemainingDays(subscription.endDate)} ngày
                    </p>
                    <p className="text-blue-700">
                      <span className="font-medium">Bắt đầu:</span> {new Date(subscription.startDate).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      <span className="font-medium">Hết hạn:</span> {new Date(subscription.endDate).toLocaleDateString("vi-VN")}
                    </p>
                    <p className="text-blue-700">
                      <span className="font-medium">Giá:</span> {subscription.price.toLocaleString()} VND
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleCancel(subscription)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Hủy vé tháng
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase New Subscription */}
      {getAvailableVehicles().length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Đăng ký vé tháng mới</h3>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Mua vé tháng
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>Xe có thể đăng ký vé tháng:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {getAvailableVehicles().map((vehicle) => (
                <span 
                  key={vehicle.id || vehicle._id}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {vehicle.licensePlate}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No vehicles available */}
      {vehicles.length === 0 && (
        <div className="text-center py-8">
          <Car className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Bạn chưa có xe nào được đăng ký</p>
          <p className="text-sm text-gray-400">Vui lòng đăng ký xe trước khi mua vé tháng</p>
        </div>
      )}

      {/* All vehicles have subscriptions */}
      {vehicles.length > 0 && getAvailableVehicles().length === 0 && activeSubscriptions.length > 0 && (
        <div className="text-center py-8">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-500">Tất cả xe đã có vé tháng</p>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Đăng ký vé tháng</h3>
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedLicensePlate("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn xe
                </label>
                <select
                  value={selectedLicensePlate}
                  onChange={(e) => setSelectedLicensePlate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Chọn biển số xe</option>
                  {getAvailableVehicles().map((vehicle) => (
                    <option key={vehicle.id || vehicle._id} value={vehicle.licensePlate}>
                      {vehicle.licensePlate} ({vehicle.vehicleType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn gói
                </label>
                <div className="space-y-2">
                  {pricing && Object.entries(pricing.features).map(([key, plan]: [string, any]) => (
                    <label
                      key={key}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                        selectedPlan === key ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={key}
                        checked={selectedPlan === key}
                        onChange={(e) => setSelectedPlan(e.target.value as any)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{plan.duration}</div>
                        <div className="text-sm text-gray-600">{plan.price.toLocaleString()} VND</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phương thức thanh toán
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="balance"
                      checked={paymentMethod === "balance"}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    Số dư tài khoản
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="qr"
                      checked={paymentMethod === "qr"}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    QR Code
                  </label>
                </div>
              </div>

              {/* Price Summary */}
              {pricing && selectedPlan && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span>Tổng cần thanh toán:</span>
                    <span className="font-medium">
                      {pricing.features[selectedPlan]?.price.toLocaleString()} VND
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedLicensePlate("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={purchasing || !selectedLicensePlate}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? "Đang xử lý..." : "Đăng ký"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;