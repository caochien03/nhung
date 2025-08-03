import React, { useState, useEffect } from 'react';
import { subscriptionsAPI } from '../../services/api';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  AlertCircle,
  Calendar,
  DollarSign,
  Car,
  RefreshCw
} from 'lucide-react';

interface SubscriptionStats {
  totalActive: number;
  totalExpired: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  typeDistribution: Array<{ _id: string; count: number }>;
  expiringNext7Days: number;
  conversionRate: number;
}

const SubscriptionStatsPanel: React.FC = () => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subscriptionsAPI.getSubscriptionStats();
      if (response.success && response.data) {
        // Ensure all required fields exist with default values
        const statsData: SubscriptionStats = {
          totalActive: response.data.totalActive || 0,
          totalExpired: response.data.totalExpired || 0,
          monthlyRevenue: response.data.monthlyRevenue || 0,
          yearlyRevenue: response.data.yearlyRevenue || 0,
          typeDistribution: response.data.typeDistribution || [],
          expiringNext7Days: response.data.expiringNext7Days || 0,
          conversionRate: response.data.conversionRate || 0,
        };
        setStats(statsData);
      } else {
        setError('Không có dữ liệu thống kê');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải thống kê vé tháng');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly': return 'Tháng';
      case 'quarterly': return 'Quý';
      case 'yearly': return 'Năm';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Đang tải thống kê vé tháng...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Thống kê vé tháng</h3>
        <button
          onClick={loadStats}
          className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Làm mới
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Subscriptions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vé đang hoạt động</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalActive}</p>
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doanh thu tháng</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sắp hết hạn (7 ngày)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expiringNext7Days}</p>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tỷ lệ duy trì</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.conversionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Tổng quan doanh thu</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Doanh thu tháng này:</span>
              <span className="font-bold text-green-600">
                {formatCurrency(stats.monthlyRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Doanh thu năm nay:</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(stats.yearlyRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Trung bình tháng:</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(stats.yearlyRevenue / 12)}
              </span>
            </div>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Phân bố loại vé</h4>
          <div className="space-y-3">
            {stats.typeDistribution.map((item) => {
              const total = stats.typeDistribution.reduce((sum, t) => sum + t.count, 0);
              const percentage = total > 0 ? (item.count / total * 100) : 0;
              
              return (
                <div key={item._id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Car className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-700">{getTypeLabel(item._id)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      {item.count} ({percentage.toFixed(1)}%)
                    </span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stats.expiringNext7Days > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
            <span className="text-orange-800">
              <strong>{stats.expiringNext7Days}</strong> vé tháng sẽ hết hạn trong 7 ngày tới. 
              Hãy liên hệ khách hàng để gia hạn.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatsPanel;
