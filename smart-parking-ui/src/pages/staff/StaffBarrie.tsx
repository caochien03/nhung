import React from "react";
import BarrieControl from "../../components/dashboard/BarrieControl";

const StaffBarrie: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Điều khiển Barie</h1>
        <p className="text-gray-600">Mở/đóng barie và giám sát trạng thái</p>
      </div>

      {/* Barrie Control */}
      <BarrieControl />
    </div>
  );
};

export default StaffBarrie; 