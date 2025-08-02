import React, { useState, useEffect } from "react";
import { CreditCard, QrCode, CheckCircle, AlertCircle } from "lucide-react";
import { ParkingRecord, Payment } from "../../types";
import { paymentsAPI } from "../../services/api";

interface PaymentManagerProps {
  parkingRecord: ParkingRecord;
  onPaymentComplete: (payment: Payment) => void;
}

const PaymentManager: React.FC<PaymentManagerProps> = ({ parkingRecord, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "cash" | "balance">("qr");
  const [qrCode, setQrCode] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed" | "failed">("pending");

  useEffect(() => {
    if (paymentMethod === "qr" && parkingRecord.fee) {
      generateQRCode();
    }
  }, [paymentMethod, parkingRecord.fee]);

  const generateQRCode = async () => {
    try {
      const response = await paymentsAPI.generateQR(parkingRecord.fee!);
      if (response.success && response.data) {
        setQrCode(response.data.qrCode);
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handlePayment = async (method: "qr" | "cash" | "balance") => {
    setIsProcessing(true);
    try {
      const paymentData = {
        parkingRecordId: parkingRecord.id,
        amount: parkingRecord.fee!,
        method,
        status: "completed" as const,
      };

      const response = await paymentsAPI.createPayment(paymentData);
      if (response.success && response.data) {
        setPaymentStatus("completed");
        onPaymentComplete(response.data);
      } else {
        setPaymentStatus("failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("failed");
    } finally {
      setIsProcessing(false);
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

  if (!parkingRecord.fee) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa tính phí</h3>
          <p className="text-gray-600">Vui lòng chờ hệ thống tính phí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Thanh toán</h3>
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-600">ID: {parkingRecord.id}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600">Biển số xe</p>
          <p className="font-medium">{parkingRecord.licensePlate}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Thời gian đỗ</p>
          <p className="font-medium">
            {parkingRecord.timeOut 
              ? formatDuration(parkingRecord.timeIn, parkingRecord.timeOut)
              : "Đang đỗ"
            }
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Giờ vào</p>
          <p className="font-medium">
            {new Date(parkingRecord.timeIn).toLocaleTimeString("vi-VN", { hour12: false })}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Giờ ra</p>
          <p className="font-medium">
            {parkingRecord.timeOut 
              ? new Date(parkingRecord.timeOut).toLocaleTimeString("vi-VN", { hour12: false })
              : "Chưa ra"
            }
          </p>
        </div>
      </div>

      {/* Payment Amount */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-blue-600 mb-1">Tổng tiền cần thanh toán</p>
          <p className="text-3xl font-bold text-blue-900">
            {parkingRecord.fee.toLocaleString()} VND
          </p>
          {parkingRecord.feeType && (
            <p className="text-sm text-blue-600 mt-1">
              Loại phí: {parkingRecord.feeType}
            </p>
          )}
          {parkingRecord.originalFee && parkingRecord.originalFee !== parkingRecord.fee && (
            <p className="text-xs text-gray-500 mt-1">
              Phí gốc: {parkingRecord.originalFee.toLocaleString()} VND
            </p>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Phương thức thanh toán</h4>
        
        {/* QR Payment */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <QrCode className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">QR Code</p>
                <p className="text-sm text-gray-600">Quét mã QR để thanh toán</p>
              </div>
            </div>
            <button
              onClick={() => handlePayment("qr")}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isProcessing ? "Đang xử lý..." : "Thanh toán QR"}
            </button>
          </div>
          {qrCode && (
            <div className="mt-4 text-center">
              <img src={qrCode} alt="QR Code" className="mx-auto w-32 h-32" />
            </div>
          )}
        </div>

        {/* Cash Payment */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Tiền mặt</p>
                <p className="text-sm text-gray-600">Thanh toán bằng tiền mặt</p>
              </div>
            </div>
            <button
              onClick={() => handlePayment("cash")}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? "Đang xử lý..." : "Đã nhận tiền"}
            </button>
          </div>
        </div>

        {/* Balance Payment */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">Số dư tài khoản</p>
                <p className="text-sm text-gray-600">Trừ từ số dư</p>
              </div>
            </div>
            <button
              onClick={() => handlePayment("balance")}
              disabled={isProcessing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isProcessing ? "Đang xử lý..." : "Thanh toán"}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      {paymentStatus === "completed" && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">Thanh toán thành công!</p>
          </div>
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="mt-6 p-4 bg-red-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">Thanh toán thất bại!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManager;
