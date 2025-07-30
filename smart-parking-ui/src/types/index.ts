// Types for Smart Parking System

export interface User {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  phone: string;
  role: "admin" | "staff" | "user";
  licensePlates?: string[];
  balance: number;
  isActive?: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingRecord {
  id: string;
  rfid: string;
  licensePlate: string;
  timeIn: Date;
  timeOut?: Date;
  fee?: number;
  cameraIndex: number;
  status: "active" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod?: "qr" | "cash" | "balance";
  imageUrl?: string;
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  userId: string;
  vehicleType: "car" | "truck" | "bus";
  isRegistered: boolean;
  registrationDate: Date;
}

export interface Payment {
  id: string;
  parkingRecordId: string;
  amount: number;
  method: "qr" | "cash" | "balance";
  status: "pending" | "completed" | "failed";
  qrCode?: string;
  createdAt: Date;
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
