// Mock authentication service for development
import { User } from "../types";

// Mock users data
const mockUsers: User[] = [
  {
    id: "1",
    username: "admin",
    email: "admin@smartparking.com",
    phone: "0123456789",
    role: "admin",
    licensePlates: ["30A-12345", "30B-67890"],
    balance: 1000000,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    username: "staff",
    email: "staff@smartparking.com",
    phone: "0987654321",
    role: "staff",
    licensePlates: [],
    balance: 0,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "3",
    username: "user",
    email: "user@smartparking.com",
    phone: "0555666777",
    role: "user",
    licensePlates: ["30A-12345"],
    balance: 500000,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

// Mock authentication
export const mockAuthAPI = {
  login: async (credentials: { username: string; password: string }) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.username === credentials.username);
    
    if (user) {
      // Mock successful login
      const token = `mock_token_${user.id}_${Date.now()}`;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      
      return {
        success: true,
        data: {
          token,
          user,
        },
      };
    } else {
      // Mock failed login
      return {
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      };
    }
  },

  getCurrentUser: async () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        success: true,
        data: user,
      };
    }
    return {
      success: false,
      message: "Không tìm thấy thông tin người dùng",
    };
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  register: async (userData: Partial<User>) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful registration
    const newUser: User = {
      id: Date.now().toString(),
      username: userData.username || "",
      email: userData.email || "",
      phone: userData.phone || "",
      role: "user",
      licensePlates: [],
      balance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return {
      success: true,
      data: newUser,
    };
  },
};

// Mock API responses
export const mockAPI = {
  dashboard: {
    getStats: async () => ({
      success: true,
      data: {
        totalRevenue: 15000000,
        todayRevenue: 2500000,
        activeParkings: 8,
        totalVehicles: 45,
        registeredUsers: 120,
        walkInUsers: 25,
      },
    }),
    
    getRevenue: async () => ({
      success: true,
      data: [
        { date: "2024-03-01", totalRevenue: 1200000, registeredUsers: 45, walkInUsers: 23, totalVehicles: 68 },
        { date: "2024-03-02", totalRevenue: 1500000, registeredUsers: 52, walkInUsers: 28, totalVehicles: 80 },
        { date: "2024-03-03", totalRevenue: 1800000, registeredUsers: 48, walkInUsers: 35, totalVehicles: 83 },
        { date: "2024-03-04", totalRevenue: 2200000, registeredUsers: 61, walkInUsers: 42, totalVehicles: 103 },
        { date: "2024-03-05", totalRevenue: 2500000, registeredUsers: 58, walkInUsers: 38, totalVehicles: 96 },
        { date: "2024-03-06", totalRevenue: 2800000, registeredUsers: 65, walkInUsers: 45, totalVehicles: 110 },
        { date: "2024-03-07", totalRevenue: 2000000, registeredUsers: 42, walkInUsers: 30, totalVehicles: 72 },
      ],
    }),
  },
  
  parking: {
    getRecords: async () => ({
      success: true,
      data: [
        {
          id: "1",
          rfid: "RFID001",
          licensePlate: "30A-12345",
          timeIn: new Date("2024-03-15T08:30:00"),
          timeOut: new Date("2024-03-15T17:45:00"),
          fee: 95000,
          cameraIndex: 1,
          status: "completed",
          paymentStatus: "paid",
          paymentMethod: "balance",
        },
        {
          id: "2",
          rfid: "RFID002",
          licensePlate: "30B-67890",
          timeIn: new Date("2024-03-14T09:15:00"),
          timeOut: new Date("2024-03-14T18:30:00"),
          fee: 105000,
          cameraIndex: 1,
          status: "completed",
          paymentStatus: "paid",
          paymentMethod: "qr",
        },
      ],
    }),
    
    getActiveRecords: async () => ({
      success: true,
      data: [
        {
          id: "3",
          rfid: "RFID003",
          licensePlate: "30A-12345",
          timeIn: new Date("2024-03-16T10:00:00"),
          cameraIndex: 1,
          status: "active" as const,
          paymentStatus: "pending" as const,
        },
        {
          id: "4",
          rfid: "RFID004",
          licensePlate: "30C-11111",
          timeIn: new Date("2024-03-16T11:30:00"),
          cameraIndex: 1,
          status: "active" as const,
          paymentStatus: "pending" as const,
        },
      ],
    }),
  },
};
