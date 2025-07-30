import React, { useState, useEffect } from "react";
import { Camera, Play, Pause, RotateCcw } from "lucide-react";
import { CameraFeed } from "../../types";
import wsService from "../../services/websocket";

interface CameraMonitorProps {
  cameraIndex: number;
  title: string;
}

const CameraMonitor: React.FC<CameraMonitorProps> = ({ cameraIndex, title }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"online" | "offline">("offline");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Subscribe to camera events
    wsService.subscribe("camera_update", handleCameraUpdate);
    wsService.subscribe("auto_capture", handleAutoCapture);

    return () => {
      wsService.unsubscribe("camera_update", handleCameraUpdate);
      wsService.unsubscribe("auto_capture", handleAutoCapture);
    };
  }, []);

  const handleCameraUpdate = (data: any) => {
    if (data.cameraIndex === cameraIndex) {
      setLastImage(data.imageData);
      setStatus(data.status);
      setLastUpdate(new Date());
    }
  };

  const handleAutoCapture = (data: any) => {
    if (data.cameraIndex === cameraIndex) {
      setLastImage(data.imageData);
      setLastUpdate(new Date());
    }
  };

  const toggleStream = () => {
    setIsStreaming(!isStreaming);
    // Here you would implement actual camera stream control
  };

  const refreshImage = () => {
    // Request fresh image from camera
    wsService.send({
      type: "request_image",
      data: { cameraIndex },
      timestamp: new Date(),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Camera className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === "online" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {status === "online" ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Camera Feed */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
        {lastImage ? (
          <img
            src={`data:image/jpeg;base64,${lastImage}`}
            alt={`Camera ${cameraIndex}`}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Không có hình ảnh</p>
            </div>
          </div>
        )}

        {/* Overlay Controls */}
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button
            onClick={toggleStream}
            className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
          >
            {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={refreshImage}
            className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Camera Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Camera ID</p>
          <p className="font-medium">{cameraIndex}</p>
        </div>
        <div>
          <p className="text-gray-600">Cập nhật cuối</p>
          <p className="font-medium">
            {lastUpdate ? lastUpdate.toLocaleTimeString("vi-VN") : "Chưa có"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CameraMonitor;
