import React, { useState, useEffect } from "react";
import { Lock, Unlock, AlertCircle, CheckCircle } from "lucide-react";
import { barrieAPI } from "../../services/api";
import toast from "react-hot-toast";

interface Barrie {
  _id: string;
  name: string;
  location: "entrance" | "exit";
  status: "open" | "closed" | "error" | "maintenance";
  lastAction: string;
  lastActionReason?: string;
}

const BarrieControl: React.FC = () => {
  const [barries, setBarries] = useState<Barrie[]>([]);
  const [loading, setLoading] = useState(true);
  const [controlling, setControlling] = useState<string | null>(null);

  useEffect(() => {
    loadBarries();
  }, []);

  const loadBarries = async () => {
    try {
      const response = await barrieAPI.getBarries();
      if (response.success && response.data) {
        setBarries(response.data);
      }
    } catch (error) {
      console.error("Error loading barries:", error);
      toast.error("Không thể tải thông tin barie");
    } finally {
      setLoading(false);
    }
  };

  const handleBarrieControl = async (barrieId: string, action: "open" | "close") => {
    setControlling(barrieId);
    try {
      const response = await barrieAPI.controlBarrie(barrieId, {
        action,
        reason: `Manual control by staff - ${action}`,
      });

      if (response.success) {
        toast.success(`Barie đã được ${action === "open" ? "mở" : "đóng"}`);
        loadBarries(); // Reload to get updated status
      } else {
        toast.error("Không thể điều khiển barie");
      }
    } catch (error) {
      console.error("Error controlling barrie:", error);
      toast.error("Có lỗi xảy ra khi điều khiển barie");
    } finally {
      setControlling(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Unlock className="h-5 w-5 text-green-600" />;
      case "closed":
        return <Lock className="h-5 w-5 text-blue-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "maintenance":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Lock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-blue-100 text-blue-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Đang mở";
      case "closed":
        return "Đang đóng";
      case "error":
        return "Lỗi";
      case "maintenance":
        return "Bảo trì";
      default:
        return "Không xác định";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Điều khiển Barie</h3>
        <button
          onClick={loadBarries}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Làm mới
        </button>
      </div>

      <div className="space-y-4">
        {barries.map((barrie) => (
          <div
            key={barrie._id}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(barrie.status)}
                <div>
                  <h4 className="font-medium text-gray-900">{barrie.name}</h4>
                  <p className="text-sm text-gray-600 capitalize">
                    {barrie.location === "entrance" ? "Cổng vào" : "Cổng ra"}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(barrie.status)}`}>
                {getStatusText(barrie.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Hành động cuối</p>
                <p className="text-sm font-medium">
                  {new Date(barrie.lastAction).toLocaleString("vi-VN")}
                </p>
              </div>
              {barrie.lastActionReason && (
                <div>
                  <p className="text-xs text-gray-500">Lý do</p>
                  <p className="text-sm font-medium">{barrie.lastActionReason}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleBarrieControl(barrie._id, "open")}
                disabled={controlling === barrie._id || barrie.status === "error" || barrie.status === "maintenance"}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {controlling === barrie._id ? "Đang xử lý..." : "Mở Barie"}
              </button>
              <button
                onClick={() => handleBarrieControl(barrie._id, "close")}
                disabled={controlling === barrie._id || barrie.status === "error" || barrie.status === "maintenance"}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {controlling === barrie._id ? "Đang xử lý..." : "Đóng Barie"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {barries.length === 0 && (
        <div className="text-center py-8">
          <Lock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Không có barie nào được cấu hình</p>
        </div>
      )}
    </div>
  );
};

export default BarrieControl; 