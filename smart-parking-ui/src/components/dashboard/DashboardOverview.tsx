import React from "react";
import { Car, Users, DollarSign, Clock } from "lucide-react";
import { DashboardStats } from "../../types";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  change?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, change }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">{change}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

interface DashboardOverviewProps {
  stats: DashboardStats;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ stats }) => {
  // **TÍNH TOÁN CAPACITY DISPLAY**
  const capacityInfo = stats.parkingCapacity;
  const capacityColor = capacityInfo?.isFull 
    ? "bg-red-500" 
    : capacityInfo?.status === "ALMOST_FULL" 
    ? "bg-yellow-500" 
    : "bg-green-500";
  
  const capacityStatus = capacityInfo?.isFull
    ? "🚨 FULL"
    : capacityInfo?.status === "ALMOST_FULL"
    ? "⚠️ Gần đầy"
    : "✅ Còn chỗ";

  const cards = [
    {
      title: "Doanh thu hôm nay",
      value: `${stats.todayRevenue.toLocaleString()} VND`,
      icon: DollarSign,
      color: "bg-green-500",
      change: `Tổng: ${stats.totalRevenue.toLocaleString()} VND`,
    },
    {
      title: capacityInfo ? `Bãi đỗ xe (${capacityInfo.current}/${capacityInfo.maximum})` : "Xe đang đỗ",
      value: capacityInfo ? `${capacityInfo.available} chỗ trống` : stats.activeParkings,
      icon: Car,
      color: capacityColor,
      change: capacityInfo ? `${capacityStatus} - ${capacityInfo.occupancyRate}% đầy` : "Đang hoạt động",
    },
    {
      title: "Xe vào hôm nay",
      value: stats.totalVehicles,
      icon: Users,
      color: "bg-purple-500",
      change: `Khách vãng lai: ${stats.walkInUsers}`,
    },
    {
      title: "Users đăng ký",
      value: stats.registeredUsers,
      icon: Clock,
      color: "bg-orange-500",
      change: "Tài khoản hoạt động",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <StatsCard key={index} {...card} />
      ))}
    </div>
  );
};

export default DashboardOverview;
