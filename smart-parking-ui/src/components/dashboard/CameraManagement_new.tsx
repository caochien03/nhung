import React, { useState } from "react";
import { Camera, AlertCircle, RefreshCw } from "lucide-react";
import { useCamera } from "../../hooks/useCamera";
import CameraMonitor from "./CameraMonitor";

const CameraManagement: React.FC = () => {
  const { cameras, loading, error, enumerateCameras } = useCamera();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await enumerateCameras();
    setRefreshing(false);
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Camera có sẵn trong hệ thống</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {cameras.map((camera, index) => (
            <div
              key={camera.deviceId}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Camera className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{camera.label}</h4>
                    <p className="text-sm text-gray-600">Camera {index + 1}</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Có sẵn
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Device ID:</span>
                  <span className="font-mono text-xs">{camera.deviceId.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Group ID:</span>
                  <span className="font-mono text-xs">{camera.groupId.slice(0, 16)}...</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cameras.length === 0 && (
          <div className="text-center py-8">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Không tìm thấy camera nào</p>
            <p className="text-sm text-gray-400 mt-2">
              Hãy kiểm tra kết nối camera và quyền truy cập của trình duyệt
            </p>
          </div>
        )}
      </div>

      {/* Live Camera Views */}
      {cameras.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Camera Live View</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cameras.slice(0, 4).map((camera, index) => (
              <CameraMonitor
                key={camera.deviceId}
                cameraIndex={index}
                title={`${camera.label} (Camera ${index + 1})`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraManagement;
