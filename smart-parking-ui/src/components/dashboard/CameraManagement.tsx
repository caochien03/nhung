import React, { useState, useEffect } from "react";
import { Camera, Wifi, WifiOff, AlertCircle, RefreshCw } from "lucide-react";
import { cameraAPI } from "../../services/api";
import toast from "react-hot-toast";

interface Camera {
  _id: string;
  name: string;
  location: "entrance" | "exit";
  status: "online" | "offline" | "error" | "maintenance";
  lastImage?: string;
  lastLicensePlate?: string;
  lastUpdate: string;
  ipAddress?: string;
  port?: number;
}

const CameraManagement: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const response = await cameraAPI.getCameras();
      if (response.success && response.data) {
        setCameras(response.data);
      }
    } catch (error) {
      console.error("Error loading cameras:", error);
      toast.error("Không thể tải thông tin camera");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCamera = async (cameraId: string) => {
    setRefreshing(cameraId);
    try {
      // Simulate camera refresh by updating status
      const response = await cameraAPI.updateCameraStatus(cameraId, {
        status: "online",
        notes: "Manual refresh by staff",
      });

      if (response.success) {
        toast.success("Camera đã được làm mới");
        loadCameras(); // Reload to get updated status
      } else {
        toast.error("Không thể làm mới camera");
      }
    } catch (error) {
      console.error("Error refreshing camera:", error);
      toast.error("Có lỗi xảy ra khi làm mới camera");
    } finally {
      setRefreshing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <Wifi className="h-5 w-5 text-green-600" />;
      case "offline":
        return <WifiOff className="h-5 w-5 text-gray-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "maintenance":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Camera className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800";
      case "offline":
        return "bg-gray-100 text-gray-800";
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
      case "online":
        return "Hoạt động";
      case "offline":
        return "Ngoại tuyến";
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
        <h3 className="text-lg font-semibold text-gray-900">Quản lý Camera</h3>
        <button
          onClick={loadCameras}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map((camera) => (
          <div
            key={camera._id}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(camera.status)}
                <div>
                  <h4 className="font-medium text-gray-900">{camera.name}</h4>
                  <p className="text-sm text-gray-600 capitalize">
                    {camera.location === "entrance" ? "Cổng vào" : "Cổng ra"}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(camera.status)}`}>
                {getStatusText(camera.status)}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IP Address:</span>
                <span className="font-medium">{camera.ipAddress || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Port:</span>
                <span className="font-medium">{camera.port || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cập nhật cuối:</span>
                <span className="font-medium">
                  {new Date(camera.lastUpdate).toLocaleTimeString("vi-VN")}
                </span>
              </div>
              {camera.lastLicensePlate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Biển số cuối:</span>
                  <span className="font-medium">{camera.lastLicensePlate}</span>
                </div>
              )}
            </div>

            {/* Camera Preview */}
            {camera.lastImage && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Hình ảnh cuối:</p>
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <img
                    src={`data:image/jpeg;base64,${camera.lastImage}`}
                    alt={`${camera.name} preview`}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                      Live
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => handleRefreshCamera(camera._id)}
                disabled={refreshing === camera._id}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {refreshing === camera._id ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Đang làm mới...
                  </div>
                ) : (
                  "Làm mới"
                )}
              </button>
              <button
                disabled={camera.status === "offline" || camera.status === "error"}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Chụp ảnh
              </button>
            </div>
          </div>
        ))}
      </div>

      {cameras.length === 0 && (
        <div className="text-center py-8">
          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Không có camera nào được cấu hình</p>
        </div>
      )}
    </div>
  );
};

export default CameraManagement; 