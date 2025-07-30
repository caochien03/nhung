const axios = require("axios");

const API_BASE_URL = "http://localhost:8080/api";

// Test API endpoints
async function testAPI() {
  console.log("🧪 Testing Smart Parking API...\n");

  try {
    // Test 1: Health check
    console.log("1. Testing health check...");
    const healthResponse = await axios.get("http://localhost:8080/health");
    console.log("✅ Health check:", healthResponse.data);

    // Test 2: Login
    console.log("\n2. Testing login...");
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: "admin",
      password: "admin123"
    });
    console.log("✅ Login successful:", loginResponse.data.success);
    
    const token = loginResponse.data.data.token;
    console.log("Token received:", token ? "✅" : "❌");

    // Test 3: Get current user
    console.log("\n3. Testing get current user...");
    const userResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ User data:", userResponse.data.data.username);

    // Test 4: Get dashboard stats
    console.log("\n4. Testing dashboard stats...");
    const statsResponse = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Dashboard stats:", statsResponse.data.success);

    // Test 5: Get parking records
    console.log("\n5. Testing parking records...");
    const parkingResponse = await axios.get(`${API_BASE_URL}/parking`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Parking records:", parkingResponse.data.success);

    // Test 6: Get active records
    console.log("\n6. Testing active records...");
    const activeResponse = await axios.get(`${API_BASE_URL}/parking/active`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Active records:", activeResponse.data.success);

    console.log("\n🎉 All API tests passed!");

  } catch (error) {
    console.error("❌ API test failed:", error.response?.data || error.message);
  }
}

// Run tests
testAPI(); 