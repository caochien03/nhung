import axios from "axios";
import { 
  User, 
  ParkingRecord, 
  Vehicle, 
  Payment, 
  Subscription,
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

  // Get pending payments (for staff confirmation)
  getPendingPayments: (): Promise<ApiResponse<ParkingRecord[]>> =>
    api.get("/parking/pending-payments"),
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

  // Confirm payment and open gate
  confirmPayment: (data: { recordId: string; paymentMethod: string; confirmedBy: string }): Promise<ApiResponse<any>> => {
    console.log('Calling confirmPayment API with data:', data);
    return api.post("/esp32/confirm-payment", data);
  },
};

// Barrie API
export const barrieAPI = {
  // Get all barries
  getBarries: (): Promise<ApiResponse<any[]>> =>
    api.get("/barrie"),

  // Get barrie by ID
  getBarrieById: (id: string): Promise<ApiResponse<any>> =>
    api.get(`/barrie/${id}`),

  // Control barrie
  controlBarrie: (id: string, data: { action: "open" | "close"; reason?: string }): Promise<ApiResponse<any>> =>
    api.post(`/barrie/${id}/control`, data),

  // Get barrie status
  getBarrieStatus: (): Promise<ApiResponse<any[]>> =>
    api.get("/barrie/status/all"),
};

// Camera API
export const cameraAPI = {
  // Get all cameras
  getCameras: (): Promise<ApiResponse<any[]>> =>
    api.get("/camera"),

  // Get camera by ID
  getCameraById: (id: string): Promise<ApiResponse<any>> =>
    api.get(`/camera/${id}`),

  // Update camera status
  updateCameraStatus: (id: string, data: { status?: string; lastImage?: string; notes?: string }): Promise<ApiResponse<any>> =>
    api.put(`/camera/${id}/status`, data),

  // Capture image
  captureImage: (id: string, data: { imageData: string; licensePlate?: string }): Promise<ApiResponse<any>> =>
    api.post(`/camera/${id}/capture`, data),

  // Get camera status
  getCameraStatus: (): Promise<ApiResponse<any[]>> =>
    api.get("/camera/status/all"),
};

// Users API
export const usersAPI = {
  // Get all users (admin only)
  getUsers: (params?: any): Promise<ApiResponse<User[]>> =>
    api.get("/users", { params }),

  // Get user by ID (admin only)
  getUserById: (id: string): Promise<ApiResponse<User>> =>
    api.get(`/users/${id}`),

  // Update user (admin only)
  updateUser: (id: string, data: Partial<User>): Promise<ApiResponse<User>> =>
    api.put(`/users/${id}`, data),

  // Delete user (admin only)
  deleteUser: (id: string): Promise<ApiResponse<void>> =>
    api.delete(`/users/${id}`),

  // Update user balance (admin only)
  updateUserBalance: (id: string, data: { amount: number; operation: "add" | "subtract" }): Promise<ApiResponse<any>> =>
    api.put(`/users/${id}/balance`, data),

  // User-specific APIs
  // Get user's vehicles
  getUserVehicles: (): Promise<ApiResponse<Vehicle[]>> =>
    api.get("/users/vehicles"),

  // Register new vehicle
  registerVehicle: (data: { licensePlate: string; vehicleType: string }): Promise<ApiResponse<Vehicle>> =>
    api.post("/users/vehicles", data),

  // Remove vehicle
  removeVehicle: (vehicleId: string): Promise<ApiResponse<any>> =>
    api.delete(`/users/vehicles/${vehicleId}`),

  // Get user's parking history
  getUserParkingHistory: (params?: any): Promise<ApiResponse<ParkingRecord[]>> =>
    api.get("/users/parking/history", { params }),

  // Get user's active parking
  getUserActiveParking: (): Promise<ApiResponse<ParkingRecord>> =>
    api.get("/users/parking/active"),

  // Get user's payment history
  getUserPaymentHistory: (params?: any): Promise<ApiResponse<Payment[]>> =>
    api.get("/users/payments/history", { params }),

  // Get user dashboard stats
  getUserDashboardStats: (): Promise<ApiResponse<any>> =>
    api.get("/users/dashboard/stats"),
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

// Subscriptions API
export const subscriptionsAPI = {
  // Get active subscription
  getActiveSubscription: (): Promise<ApiResponse<Subscription>> =>
    api.get("/subscriptions/active"),

  // Get subscription history
  getSubscriptionHistory: (params?: any): Promise<ApiResponse<Subscription[]>> =>
    api.get("/subscriptions/history", { params }),

  // Get subscription pricing
  getSubscriptionPricing: (): Promise<ApiResponse<any>> =>
    api.get("/subscriptions/pricing"),

  // Create new subscription
  createSubscription: (data: { 
    type: "monthly" | "quarterly" | "yearly"; 
    paymentMethod: "balance" | "qr"; 
    vehicleLimit?: number 
  }): Promise<ApiResponse<any>> =>
    api.post("/subscriptions/create", data),

  // Complete subscription payment
  completeSubscriptionPayment: (data: { subscriptionId: string; transactionId: string }): Promise<ApiResponse<Subscription>> =>
    api.post("/subscriptions/complete-payment", data),

  // Cancel subscription
  cancelSubscription: (id: string): Promise<ApiResponse<void>> =>
    api.put(`/subscriptions/${id}/cancel`),

  // Admin: Get all subscriptions
  getAllSubscriptions: (params?: any): Promise<ApiResponse<Subscription[]>> =>
    api.get("/subscriptions", { params }),
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
