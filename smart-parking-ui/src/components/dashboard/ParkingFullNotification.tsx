import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Car } from "lucide-react";

interface ParkingFullNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  currentCapacity: number;
  maxCapacity: number;
}

const ParkingFullNotification: React.FC<ParkingFullNotificationProps> = ({
  isVisible,
  onClose,
  currentCapacity,
  maxCapacity
}) => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      // Auto hide after 10 seconds
      const timer = setTimeout(() => {
        setShouldShow(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      shouldShow ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-red-600 text-white rounded-lg shadow-2xl p-6 max-w-sm animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">🚨 BÃI ĐỖ XE ĐÃ ĐẦY!</h3>
              <p className="text-sm opacity-90 mt-1">
                Không thể cho thêm xe vào bãi
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShouldShow(false);
              setTimeout(onClose, 300);
            }}
            className="text-white hover:text-red-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-red-700 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5" />
              <span className="font-medium">Tình trạng:</span>
            </div>
            <span className="text-xl font-bold">
              {currentCapacity}/{maxCapacity}
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-red-800 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentCapacity / maxCapacity) * 100}%` }}
              />
            </div>
            <p className="text-xs text-center mt-1 opacity-75">
              100% chỗ đỗ đã được sử dụng
            </p>
          </div>
        </div>

        <div className="mt-4 text-xs opacity-75 text-center">
          Thông báo này sẽ tự động ẩn sau 10 giây
        </div>
      </div>
    </div>
  );
};

export default ParkingFullNotification;
