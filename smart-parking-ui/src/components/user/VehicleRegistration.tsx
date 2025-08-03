import React, { useState } from "react";
import { Car, Plus, X } from "lucide-react";
import { usersAPI } from "../../services/api";
import toast from "react-hot-toast";

interface VehicleRegistrationProps {
  onVehicleAdded: () => void;
  onClose: () => void;
}

const VehicleRegistration: React.FC<VehicleRegistrationProps> = ({
  onVehicleAdded,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    licensePlate: "",
    vehicleType: "car",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.licensePlate.trim()) {
      toast.error("Vui lòng nhập biển số xe");
      return;
    }

    setLoading(true);
    try {
      const response = await usersAPI.registerVehicle({
        licensePlate: formData.licensePlate.toUpperCase(),
        vehicleType: formData.vehicleType,
      });

      if (response.success) {
        toast.success("Đăng ký xe thành công!");
        onVehicleAdded();
        onClose();
      } else {
        toast.error(response.message || "Đăng ký xe thất bại");
      }
    } catch (error: any) {
      console.error("Register vehicle error:", error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi đăng ký xe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Đăng ký xe mới</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* License Plate */}
          <div>
            <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-2">
              Biển số xe
            </label>
            <input
              type="text"
              id="licensePlate"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="VD: 30A-12345"
              required
            />
          </div>

          {/* Vehicle Type */}
          <div>
            <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-2">
              Loại xe
            </label>
            <select
              id="vehicleType"
              name="vehicleType"
              value={formData.vehicleType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="car">Ô tô</option>
              <option value="truck">Xe tải</option>
              <option value="bus">Xe buýt</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang đăng ký...
                </div>
              ) : (
                "Đăng ký"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleRegistration; 