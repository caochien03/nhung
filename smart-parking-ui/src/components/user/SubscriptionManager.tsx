import React, { useState, useEffect } from "react";
import { Calendar, Check, CreditCard, Clock, X, AlertCircle } from "lucide-react";
import { Subscription } from "../../types";
import { subscriptionsAPI } from "../../services/api";
import { toast } from "react-hot-toast";

interface SubscriptionManagerProps {
  onSubscriptionUpdated?: () => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onSubscriptionUpdated }) => {
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [paymentMethod, setPaymentMethod] = useState<"balance" | "qr">("balance");
  const [purchasing, setPurchasing] = useState(false);
  const [extending, setExtending] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extensionType, setExtensionType] = useState<"monthly" | "quarterly" | "yearly">("monthly");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load active subscription
      const activeResponse = await subscriptionsAPI.getActiveSubscription();
      if (activeResponse.success && activeResponse.data) {
        setActiveSubscription(activeResponse.data);
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
      setPurchasing(true);
      
      const response = await subscriptionsAPI.createSubscription({
        type: selectedPlan,
        paymentMethod,
        vehicleLimit: 1,
      });

      if (response.success) {
        if (paymentMethod === "balance") {
          toast.success("Đăng ký vé tháng thành công!");
          setShowPurchaseModal(false);
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

  const handleCancel = async () => {
    if (!activeSubscription) return;
    
    if (window.confirm("Bạn có chắc chắn muốn hủy vé tháng?")) {
      try {
        const response = await subscriptionsAPI.cancelSubscription(activeSubscription._id || activeSubscription.id!);
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

  const handleExtend = async () => {
    if (!activeSubscription) return;
    
    try {
      setExtending(true);
      
      const response = await subscriptionsAPI.extendSubscription({
        subscriptionId: activeSubscription._id || activeSubscription.id!,
        extensionType
      });

      if (response.success) {
        toast.success(`Gia hạn vé tháng thành công! Thêm ${extensionType === "monthly" ? "1 tháng" : extensionType === "quarterly" ? "3 tháng" : "12 tháng"}`);
        setShowExtendModal(false);
        loadData();
        onSubscriptionUpdated?.();
      }
    } catch (error: any) {
      console.error("Extend error:", error);
      toast.error(error.response?.data?.message || "Không thể gia hạn vé tháng");
    } finally {
      setExtending(false);
    }
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
          <p className="mt-4 text-gray-600">Đang tải thông tin vé tháng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Subscription */}
      {activeSubscription ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Vé tháng đang hoạt động
                </h3>
                <p className="text-gray-600">
                  Gói {activeSubscription.type === "monthly" ? "1 tháng" : 
                       activeSubscription.type === "quarterly" ? "3 tháng" : "12 tháng"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {getRemainingDays(activeSubscription.endDate)} ngày
              </div>
              <div className="text-sm text-gray-600">còn lại</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Ngày bắt đầu</p>
              <p className="font-medium">
                {new Date(activeSubscription.startDate).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ngày hết hạn</p>
              <p className="font-medium">
                {new Date(activeSubscription.endDate).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="flex space-x-2">
              <button
                onClick={() => setShowExtendModal(true)}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-400 rounded-lg transition-colors"
              >
                Gia hạn
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-lg transition-colors"
              >
                Hủy vé tháng
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800">
                Bạn chưa có vé tháng
              </h3>
              <p className="text-yellow-700">
                Đăng ký vé tháng để tiết kiệm chi phí gửi xe
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      {!activeSubscription && pricing && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Các gói vé tháng
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(pricing.features).map(([key, plan]: [string, any]) => (
              <div
                key={key}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPlan === key 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedPlan(key as any)}
              >
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {plan.duration}
                  </h4>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {plan.price.toLocaleString()}
                    </span>
                    <span className="text-gray-600"> VND</span>
                  </div>
                  {plan.savings > 0 && (
                    <div className="mt-1 text-sm text-green-600">
                      Tiết kiệm {plan.savings.toLocaleString()} VND
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-600">
                    Giới hạn {plan.vehicleLimit} xe
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Đăng ký vé tháng
            </button>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Xác nhận đăng ký</h3>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span>Gói đã chọn:</span>
                  <span className="font-medium">
                    {pricing?.features[selectedPlan]?.duration}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Giá:</span>
                  <span className="font-bold text-blue-600">
                    {pricing?.features[selectedPlan]?.price.toLocaleString()} VND
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phương thức thanh toán
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="balance"
                      checked={paymentMethod === "balance"}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    <span>Số dư tài khoản</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="qr"
                      checked={paymentMethod === "qr"}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    <span>Quét mã QR</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  disabled={purchasing}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {purchasing ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extend Subscription Modal */}
      {showExtendModal && pricing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Gia hạn vé tháng</h3>
              <button
                onClick={() => setShowExtendModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn gói gia hạn
                </label>
                <div className="space-y-2">
                  {Object.entries(pricing.features).map(([key, plan]: [string, any]) => (
                    <label key={key} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        value={key}
                        checked={extensionType === key}
                        onChange={(e) => setExtensionType(e.target.value as any)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{plan.duration}</span>
                          <span className="font-bold text-blue-600">
                            {plan.price.toLocaleString()} VND
                          </span>
                        </div>
                        {plan.savings > 0 && (
                          <div className="text-sm text-green-600">
                            Tiết kiệm {plan.savings.toLocaleString()} VND
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span>Số tiền cần thanh toán:</span>
                  <span className="font-bold text-blue-600">
                    {pricing.features[extensionType]?.price.toLocaleString()} VND
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowExtendModal(false)}
                  disabled={extending}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleExtend}
                  disabled={extending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {extending ? "Đang xử lý..." : "Xác nhận gia hạn"}
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
