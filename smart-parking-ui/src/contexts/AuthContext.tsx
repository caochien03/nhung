import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";
import { authAPI } from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const response = await authAPI.getCurrentUser();
        if (response.success && response.data) {
          // Ensure user object has both _id and id for compatibility
          const user = response.data;
          if (user._id && !user.id) {
            user.id = user._id;
          }
          setUser(user);
        } else {
          localStorage.removeItem("token");
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log("Attempting login with:", username);
      const response = await authAPI.login({ username, password });
      console.log("Login response:", response);
      
      if (response && response.success && response.data) {
        console.log("Login successful, setting token and user");
        localStorage.setItem("token", response.data.token);
        // Ensure user object has both _id and id for compatibility
        const user = response.data.user;
        if (user._id && !user.id) {
          user.id = user._id;
        }
        console.log("Setting user:", user);
        setUser(user);
        return true;
      } else {
        console.log("Login failed - invalid response:", response);
        return false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const register = async (userData: Partial<User>): Promise<boolean> => {
    try {
      const response = await authAPI.register(userData);
      if (response.success && response.data) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
