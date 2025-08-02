// Types for Smart Parking System

export interface User {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  phone?: string;
  password?: string; // For registration
  role: "admin" | "staff" | "user";
  licensePlates?: string[];
  balance: number;
  isActive?: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingRecord {
  id?: string;
  _id?: string;
  rfid: string;
  licensePlate: string;
  userId?: string;
  timeIn: Date | string;
  timeOut?: Date | string;
  fee?: number;
  originalFee?: number;
  subscriptionDiscount?: number;
  subscriptionId?: string;
  paymentType?: "hourly" | "subscription" | "mixed";
  cameraIndex: number;
  status: "active" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod?: "qr" | "cash" | "balance" | "subscription";
  imageUrl?: string;
  isRegisteredUser?: boolean;
  notes?: string;
}

export interface Vehicle {
  id?: string;
  _id?: string;
  licensePlate: string;
  userId: string;
  vehicleType: "car" | "truck" | "bus";
  isRegistered: boolean;
  registrationDate: Date | string;
}

export interface Payment {
  id?: string;
  _id?: string;
  parkingRecordId: string;
  amount: number;
  method: "qr" | "cash" | "balance" | "subscription";
  status: "pending" | "completed" | "failed";
  qrCode?: string;
  createdAt: Date;
}

export interface Subscription {
  id?: string;
  _id?: string;
  userId: string;
  type: "monthly" | "quarterly" | "yearly";
  startDate: Date | string;
  endDate: Date | string;
  price: number;
  status: "active" | "expired" | "cancelled" | "pending";
  vehicleLimit: number;
  paymentStatus: "pending" | "paid" | "failed";
  paymentId?: string;
  autoRenew: boolean;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Revenue {
  date: string;
  totalRevenue: number;
  registeredUsers: number;
  walkInUsers: number;
  totalVehicles: number;
}

export interface CameraFeed {
  id: number;
  name: string;
  status: "online" | "offline";
  lastImage?: string;
  lastUpdate: Date;
}

export interface BarrieControl {
  id: number;
  name: string;
  status: "open" | "closed" | "error";
  lastAction: Date;
}

export interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  activeParkings: number;
  totalVehicles: number;
  registeredUsers: number;
  walkInUsers: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
