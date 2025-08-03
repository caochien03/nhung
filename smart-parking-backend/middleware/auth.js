const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      console.log("❌ No token provided");
      return res.status(401).json({ 
        success: false, 
        message: "Access token required" 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    // Only log when DEBUG_AUTH is enabled
    if (process.env.DEBUG_AUTH === 'true') {
      console.log("🔍 JWT payload:", { 
        userId: decoded.userId || decoded.id, 
        timeRemaining: decoded.exp ? `${Math.floor((decoded.exp - Date.now()/1000)/3600)}h` : 'unknown'
      });
    }
    
    // Support both userId and id for backwards compatibility
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      console.log("❌ Invalid token payload - no userId");
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token payload" 
      });
    }
    
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      console.log("❌ User not found:", userId);
      return res.status(401).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (!user.isActive) {
      console.log("❌ User not active:", userId);
      return res.status(401).json({ 
        success: false, 
        message: "User account is inactive" 
      });
    }

    // Only log successful auth when DEBUG_AUTH is enabled
    if (process.env.DEBUG_AUTH === 'true') {
      console.log("✅ Auth successful for user:", user.username);
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error.message);
    if (error.name === "JsonWebTokenError") {
      console.log("❌ Invalid token format");
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token" 
      });
    }
    if (error.name === "TokenExpiredError") {
      console.log("❌ Token expired at:", new Date(error.expiredAt));
      return res.status(401).json({ 
        success: false, 
        message: "Token expired" 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: "Authentication error" 
    });
  }
};

// Middleware to check role permissions
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Insufficient permissions" 
      });
    }

    next();
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ 
    userId,
    id: userId, // Add both for compatibility
    iat: Math.floor(Date.now() / 1000)
  }, JWT_SECRET, { 
    expiresIn: "7d" // Increase to 7 days to reduce frequency
  }); 
};

module.exports = {
  authenticateToken,
  authorizeRole,
  generateToken,
}; 