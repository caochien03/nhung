import axios from "axios";
import { 
  User, 
  ParkingRecord, 
  Vehicle, 
  Payment, 
  Revenue, 
  DashboardStats,
  ApiResponse 
} from "../types";

const API_BASE_URL = "http://localhost:8080/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.data);
    return response.data;
  },
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Parking Records API
export const parkingAPI = {
  // Get all parking records
  getRecords: (): Promise<ApiResponse<ParkingRecord[]>> =>
    api.get("/parking"),

  // Create new parking record
  createRecord: (data: Partial<ParkingRecord>): Promise<ApiResponse<ParkingRecord>> =>
    api.post("/parking", data),

  // Get active parking records
  getActiveRecords: (): Promise<ApiResponse<ParkingRecord[]>> =>
    api.get("/parking/active"),

  // Complete parking record (vehicle exit)
  completeRecord: (id: string, data: { timeOut: Date; fee: number }): Promise<ApiResponse<ParkingRecord>> =>
    api.put(`/parking/${id}/complete`, data),
};

// ESP32 API
export const esp32API = {
  // Receive UID from ESP32
  receiveUID: (data: { uid: string; cameraIndex: number }): Promise<ApiResponse<any>> =>
    api.post("/esp32/uid", data),

  // Auto capture with image
  autoCapture: (data: { uid: string; cameraIndex: number; imageData: string }): Promise<ApiResponse<any>> =>
    api.post("/esp32/auto-capture", data),

  // Manual barrie control
  controlBarrie: (data: { barrieId: number; action: "open" | "close" }): Promise<ApiResponse<any>> =>
    api.post("/esp32/barrie", data),
};

// Users API
export const usersAPI = {
  // Get all users
  getUsers: (): Promise<ApiResponse<User[]>> =>
    api.get("/users"),

  // Create user
  createUser: (data: Partial<User>): Promise<ApiResponse<User>> =>
    api.post("/users", data),

  // Update user
  updateUser: (id: string, data: Partial<User>): Promise<ApiResponse<User>> =>
    api.put(`/users/${id}`, data),

  // Delete user
  deleteUser: (id: string): Promise<ApiResponse<void>> =>
    api.delete(`/users/${id}`),

  // Register vehicle
  registerVehicle: (userId: string, licensePlate: string): Promise<ApiResponse<Vehicle>> =>
    api.post(`/users/${userId}/vehicles`, { licensePlate }),
};

// Payments API
export const paymentsAPI = {
  // Create payment
  createPayment: (data: Partial<Payment>): Promise<ApiResponse<Payment>> =>
    api.post("/payments", data),

  // Get payment by parking record
  getPaymentByRecord: (parkingRecordId: string): Promise<ApiResponse<Payment>> =>
    api.get(`/payments/record/${parkingRecordId}`),

  // Generate QR code for payment
  generateQR: (amount: number): Promise<ApiResponse<{ qrCode: string }>> =>
    api.post("/payments/qr", { amount }),
};

// Dashboard API
export const dashboardAPI = {
  // Get dashboard stats
  getStats: (): Promise<ApiResponse<DashboardStats>> =>
    api.get("/dashboard/stats"),

  // Get revenue data
  getRevenue: (period: "day" | "week" | "month"): Promise<ApiResponse<Revenue[]>> =>
    api.get(`/dashboard/revenue?period=${period}`),

  // Get today revenue
  getTodayRevenue: (): Promise<ApiResponse<{ total: number; breakdown: any }>> =>
    api.get("/dashboard/revenue/today"),
};

// Auth API
export const authAPI = {
  // Login
  login: (credentials: { username: string; password: string }): Promise<ApiResponse<{ token: string; user: User }>> =>
    api.post("/auth/login", credentials),

  // Register
  register: (data: Partial<User>): Promise<ApiResponse<User>> =>
    api.post("/auth/register", data),

  // Get current user
  getCurrentUser: (): Promise<ApiResponse<User>> =>
    api.get("/auth/me"),
};

export default api;
