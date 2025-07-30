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
  const cards = [
    {
      title: "Doanh thu hôm nay",
      value: `${stats.todayRevenue.toLocaleString()} VND`,
      icon: DollarSign,
      color: "bg-green-500",
      change: "+12% so với hôm qua",
    },
    {
      title: "Xe đang đỗ",
      value: stats.activeParkings,
      icon: Car,
      color: "bg-blue-500",
    },
    {
      title: "Tổng xe",
      value: stats.totalVehicles,
      icon: Users,
      color: "bg-purple-500",
    },
    {
      title: "Người dùng đăng ký",
      value: stats.registeredUsers,
      icon: Clock,
      color: "bg-orange-500",
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
