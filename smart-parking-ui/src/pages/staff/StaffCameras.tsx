import React from "react";
import CameraManagement from "../../components/dashboard/CameraManagement";

const StaffCameras: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Camera</h1>
        <p className="text-gray-600">Giám sát và điều khiển camera hệ thống</p>
      </div>

      {/* Camera Management */}
      <CameraManagement />
    </div>
  );
};

export default StaffCameras; 