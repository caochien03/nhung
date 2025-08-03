import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { User } from "../types";
import { authAPI } from "../services/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: Partial<User>) => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
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
  
  // Rate limiting for checkAuth function
  const lastAuthCheckRef = useRef(0);
  const AUTH_CHECK_COOLDOWN = 5000; // 5 seconds cooldown between auth checks

  const checkAuth = useCallback(async () => {
    const now = Date.now();
    
    // Rate limiting - don't check auth too frequently
    if (now - lastAuthCheckRef.current < AUTH_CHECK_COOLDOWN) {
      return;
    }
    
    lastAuthCheckRef.current = now;
    
    try {
      const token = localStorage.getItem("token");
      if (token) {
        
        // Check if token is expired before making request
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Date.now() / 1000;
          
          if (payload.exp && payload.exp < now) {
            localStorage.removeItem("token");
            setUser(null);
            setLoading(false);
            return;
          }
        } catch (e) {
          localStorage.removeItem("token");
          setUser(null);
          setLoading(false);
          return;
        }
        
        const response = await authAPI.getCurrentUser();
        if (response.success && response.data) {
          // Check if server provided a new token
          if ((response as any).newToken) {
            localStorage.setItem("token", (response as any).newToken);
          }
          
          // Ensure user object has both _id and id for compatibility
          const user = response.data;
          if (user._id && !user.id) {
            user.id = user._id;
          }
          setUser(user);
        } else {
          localStorage.removeItem("token");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error: any) {
      // Handle different types of errors
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          localStorage.removeItem("token");
          setUser(null);
        } else if (status >= 500) {
          // Keep existing user state if it's a server error
        } else {
          localStorage.removeItem("token");
          setUser(null);
        }
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        // Keep existing user state if it's just a network error
      } else {
        localStorage.removeItem("token");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [AUTH_CHECK_COOLDOWN]);

  useEffect(() => {
    checkAuth();
    
    // Set up periodic token validation every 30 minutes
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Date.now() / 1000;
          
          // Check if token will expire in the next 2 hours
          if (payload.exp && (payload.exp - now) < 7200) {
            checkAuth();
          }
        } catch (e) {
          localStorage.removeItem("token");
          setUser(null);
        }
      }
    }, 30 * 60 * 1000); // Check every 30 minutes
    
    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password });
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        localStorage.setItem("token", token);
        
        // Ensure user object has both _id and id for compatibility
        if (user._id && !user.id) {
          user.id = user._id;
        }
        setUser(user);
        return true;
      } else {
        return false;
      }
    } catch (error) {
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
      return false;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await authAPI.refreshToken();
      
      if (response.success && response.data) {
        localStorage.setItem("token", response.data.token);
        
        // Ensure user object has both _id and id for compatibility
        const user = response.data.user;
        if (user._id && !user.id) {
          user.id = user._id;
        }
        setUser(user);
        return true;
      } else {
        localStorage.removeItem("token");
        setUser(null);
        return false;
      }
    } catch (error) {
      localStorage.removeItem("token");
      setUser(null);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
