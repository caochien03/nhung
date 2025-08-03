#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>

// WiFi credentials
const char* ssid = "Hung 6G";
const char* password = "hung12081961";

// Backend server URL - Current Network
const char* serverUrl = "http://192.168.102.6:8080/api/esp32/uid";

// RFID pins for RC522 #1
#define RST_PIN_1    22
#define SS_PIN_1     5

// RFID pins for RC522 #2  
#define RST_PIN_2    21
#define SS_PIN_2     4

// Servo pins
#define SERVO_PIN_1  13
#define SERVO_PIN_2  12

// LED pin (now connected to Buzzer)
#define LED_PIN      14  // D14

// Ultrasonic sensor pins (HC-SR04)
#define TRIG_PIN     2   // GPIO 2
#define ECHO_PIN     15  // GPIO 15 (GPIO 4 was used for RFID #2, so changed to 15)

// LCD I2C pins
#define SDA_PIN      26
#define SCL_PIN      25

// Create RFID objects
MFRC522 rfid1(SS_PIN_1, RST_PIN_1);
MFRC522 rfid2(SS_PIN_2, RST_PIN_2);

// Create Servo objects
Servo servo1;
Servo servo2;

// Create LCD object
LiquidCrystal_I2C lcd(0x27, 16, 2); // Default I2C address 0x27, 16 chars, 2 lines

// Variables to store RFID data
String lastCard1 = "";
String lastCard2 = "";
unsigned long lastReadTime1 = 0;
unsigned long lastReadTime2 = 0;
const unsigned long READ_DELAY = 2000; // 2 seconds delay between reads

// Function prototypes
void sendDataToBackend(int readerId, String cardId);
bool sendDataToBackendAndWait(int readerId, String cardId); // New function for server-dependent access
void blinkLedSuccess();
float getDistance(); // New function for ultrasonic sensor
void waitForVehicleToPass(Servo &servo); // New function for auto-closing gate
bool waitForGateCommand(String cardId); // New function for payment confirmation polling

void setup() {
  Serial.begin(115200);

  // Initialize SPI
  SPI.begin();

  // Initialize RFID readers
  rfid1.PCD_Init();
  rfid2.PCD_Init();

  // Initialize servos
  servo1.attach(SERVO_PIN_1);
  servo2.attach(SERVO_PIN_2);
  servo1.write(0);
  servo2.write(0);

  // Initialize BUZZER (was LED)
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize Ultrasonic sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
  Serial.println("Ultrasonic sensor initialized");
  
  // TEST BUZZER - Sẽ kêu khi khởi động
  Serial.println("Testing buzzer...");
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(300);
    digitalWrite(LED_PIN, LOW);
    delay(300);
  }
  Serial.println("Buzzer test done.");

  // Initialize LCD
  Wire.begin(SDA_PIN, SCL_PIN);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ESP32 RFID System");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");

  // Connect to WiFi
  Serial.println("\n=== ESP32 WiFi Debug ===");
  Serial.print("Target SSID: '");
  Serial.print(ssid);
  Serial.println("'");
  Serial.print("Password length: ");
  Serial.println(strlen(password));
  
  // Set WiFi mode first
  WiFi.mode(WIFI_STA);
  delay(100);
  
  // Scan networks first to debug
  Serial.println("Scanning for WiFi networks...");
  int n = WiFi.scanNetworks();
  Serial.print("Found ");
  Serial.print(n);
  Serial.println(" networks:");
  
  bool found_target = false;
  for (int i = 0; i < n; ++i) {
    String network_name = WiFi.SSID(i);
    Serial.print("  ");
    Serial.print(i + 1);
    Serial.print(": '");
    Serial.print(network_name);
    Serial.print("' RSSI: ");
    Serial.print(WiFi.RSSI(i));
    Serial.print(" dBm, Encryption: ");
    Serial.println((WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "Open" : "Secured");
    
    if (network_name == String(ssid)) {
      found_target = true;
      Serial.println("    ^^ TARGET NETWORK FOUND!");
    }
  }
  
  if (!found_target) {
    Serial.println("\n⚠️  TARGET NETWORK NOT FOUND!");
    Serial.println("Double-check:");
    Serial.println("1. iPhone Personal Hotspot is ON");
    Serial.println("2. SSID name is exactly: 'iPhone'");
    Serial.println("3. Allow others to join is enabled");
    Serial.println("4. ESP32 is close to iPhone");
  }
  
  // Try to connect
  Serial.println("\nAttempting WiFi connection...");
  WiFi.begin(ssid, password);
  
  int wifi_retry = 0;
  while (WiFi.status() != WL_CONNECTED && wifi_retry < 20) { // 10 second timeout
    delay(500);
    Serial.print(".");
    wifi_retry++;
    
    // Print status every 5 retries
    if (wifi_retry % 5 == 0) {
      Serial.println();
      Serial.print("Status Code: ");
      Serial.print(WiFi.status());
      Serial.print(" (");
      switch(WiFi.status()) {
        case WL_IDLE_STATUS: Serial.print("IDLE"); break;
        case WL_NO_SSID_AVAIL: Serial.print("NO_SSID_AVAIL"); break;
        case WL_SCAN_COMPLETED: Serial.print("SCAN_COMPLETED"); break;
        case WL_CONNECTED: Serial.print("CONNECTED"); break;
        case WL_CONNECT_FAILED: Serial.print("CONNECT_FAILED"); break;
        case WL_CONNECTION_LOST: Serial.print("CONNECTION_LOST"); break;
        case WL_DISCONNECTED: Serial.print("DISCONNECTED"); break;
        default: Serial.print("UNKNOWN"); break;
      }
      Serial.println(")");
    }
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connection failed! Check:");
    Serial.println("1. SSID name is correct");
    Serial.println("2. Password is correct"); 
    Serial.println("3. WiFi is 2.4GHz (not 5GHz)");
    Serial.println("4. WiFi is not hidden");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Check settings");
    
    while(true) { // Stop here if WiFi fails
      delay(1000);
    }
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Update LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP().toString());

  delay(2000);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready to scan");
  lcd.setCursor(0, 1);
  lcd.print("RFID cards...");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(5000);
    return; // User reverted this change, so it's back to returning if WiFi is disconnected.
  }

  if (rfid1.PICC_IsNewCardPresent() && rfid1.PICC_ReadCardSerial()) {
    unsigned long currentTime = millis();
    if (currentTime - lastReadTime1 > READ_DELAY) {
      String cardId1 = "";
      for (byte i = 0; i < rfid1.uid.size; i++) {
        cardId1 += String(rfid1.uid.uidByte[i] < 0x10 ? "0" : "");
        cardId1 += String(rfid1.uid.uidByte[i], HEX);
      }
      cardId1.toUpperCase();

      if (cardId1 != lastCard1) {
        lastCard1 = cardId1;
        lastReadTime1 = currentTime;

        Serial.print("RFID #1 Card ID: ");
        Serial.println(cardId1);

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("RFID #1: "); // Initial display after scan
        lcd.setCursor(0, 1);
        lcd.print(cardId1.substring(0, 8));

        blinkLedSuccess();  // ✅ CÒI KÊU NGAY - Báo hiệu quẹt thành công

        // Hiển thị đang kiểm tra
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Checking...");
        lcd.setCursor(0, 1);
        lcd.print("Please wait");

        // GỬI SERVER TRƯỚC - CHỜ PHẢN HỒI
        bool serverOK = sendDataToBackendAndWait(1, cardId1);
        
        if (serverOK) {
          // ✅ SERVER OK - MỞ SERVO
          servo1.write(90);   // Mở cổng
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("Gate Opened");
          lcd.setCursor(0, 1);
          lcd.print("Drive through");
          
          // Chờ xe đi qua và tự động đóng cổng
          waitForVehicleToPass(servo1);
        } else {
          // ❌ SERVER LỖI - KHÔNG MỞ
          // Thông báo lỗi đã được hiển thị trong sendDataToBackendAndWait()
          
          // Trở về trạng thái sẵn sàng sau 3 giây
          delay(3000);
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("Ready to scan");
          lcd.setCursor(0, 1);
          lcd.print("RFID cards...");
        }
      }
      rfid1.PICC_HaltA();
      rfid1.PCD_StopCrypto1();
    }
  }

  if (rfid2.PICC_IsNewCardPresent() && rfid2.PICC_ReadCardSerial()) {
    unsigned long currentTime = millis();
    if (currentTime - lastReadTime2 > READ_DELAY) {
      String cardId2 = "";
      for (byte i = 0; i < rfid2.uid.size; i++) {
        cardId2 += String(rfid2.uid.uidByte[i] < 0x10 ? "0" : "");
        cardId2 += String(rfid2.uid.uidByte[i], HEX);
      }
      cardId2.toUpperCase();

      if (cardId2 != lastCard2) {
        lastCard2 = cardId2;
        lastReadTime2 = currentTime;

        Serial.print("RFID #2 Card ID: ");
        Serial.println(cardId2);

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("RFID #2: "); // Initial display after scan
        lcd.setCursor(0, 1);
        lcd.print(cardId2.substring(0, 8));

        blinkLedSuccess();  // ✅ CÒI KÊU NGAY - Báo hiệu quẹt thành công

        // Hiển thị đang kiểm tra
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Checking...");
        lcd.setCursor(0, 1);
        lcd.print("Please wait");

        // GỬI SERVER TRƯỚC - CHỜ PHẢN HỒI
        bool serverOK = sendDataToBackendAndWait(2, cardId2);
        
        if (serverOK) {
          // ✅ SERVER OK - MỞ SERVO
          servo2.write(90);   // Mở cổng
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("Gate Opened");
          lcd.setCursor(0, 1);
          lcd.print("Drive through");
          
          // Chờ xe đi qua và tự động đóng cổng
          waitForVehicleToPass(servo2);
        } else {
          // ❌ SERVER LỖI - KHÔNG MỞ
          // Thông báo lỗi đã được hiển thị trong sendDataToBackendAndWait()
          
          // Trở về trạng thái sẵn sàng sau 3 giây
          delay(3000);
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("Ready to scan");
          lcd.setCursor(0, 1);
          lcd.print("RFID cards...");
        }
      }
      rfid2.PICC_HaltA();
      rfid2.PCD_StopCrypto1();
    }
  }
  delay(100);
}

void sendDataToBackend(int readerId, String cardId) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // ĐÃ THAY ĐỔI: JSON payload format mới
    StaticJsonDocument<200> doc;
    doc["uid"] = cardId;           // Thay vì "card_id"
    doc["cameraIndex"] = readerId; // Thay vì "reader_id"

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.print("Sending data: ");
    Serial.println(jsonString);

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      Serial.print("Response: ");
      Serial.println(response);

      StaticJsonDocument<200> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, response);

      // ĐÃ THAY ĐỔI: Kiểm tra response format mới
      if (!error && responseDoc["message"] == "UID received successfully") {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("UID sent!");
        lcd.setCursor(0, 1);
        lcd.print("Camera #" + String(readerId));
      } else {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Server Error!");
        lcd.setCursor(0, 1);
        lcd.print("Check response");
      }
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Send failed!");
      lcd.setCursor(0, 1);
      lcd.print("Error: " + String(httpResponseCode));
    }

    http.end();

    delay(3000);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Ready to scan");
    lcd.setCursor(0, 1);
    lcd.print("RFID cards...");
  } else {
    Serial.println("WiFi not connected!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Error!");
    lcd.setCursor(0, 1);
    lcd.print("Reconnecting...");
  }
}

void blinkLedSuccess() {
  for (int i = 0; i < 2; i++) {
    // Method 1: Digital ON/OFF (for Active Buzzer)
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
    
    // Method 2: PWM Tone (for Passive Buzzer) - Comment out if not needed
    // tone(LED_PIN, 2000, 200);  // 2000Hz for 200ms
    // delay(400);
  }
}

// HÀM MỚI: Gửi server và chờ phản hồi để quyết định có mở servo không
bool sendDataToBackendAndWait(int readerId, String cardId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - Server Error");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Error");
    lcd.setCursor(0, 1);
    lcd.print("Check connection");
    return false;
  }
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // Timeout 5 giây
  
  StaticJsonDocument<200> doc;
  doc["uid"] = cardId;
  doc["cameraIndex"] = readerId;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("Sending data: ");
  Serial.println(jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);
    
    StaticJsonDocument<400> responseDoc; // Tăng size để chứa displayText, subText
    DeserializationError error = deserializeJson(responseDoc, response);
    
    http.end();
    
    // ✅ KIỂM TRA PHẢN HỒI TỪ SERVER
    if (!error) {
      String message = responseDoc["message"];
      String status = responseDoc["status"];
      String displayText = responseDoc["displayText"] | ""; // Default empty if not exist
      String subText = responseDoc["subText"] | "";
      
      // Hiển thị thông tin từ server lên LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      if (displayText.length() > 0) {
        lcd.print(displayText.substring(0, 16)); // Max 16 chars
      }
      lcd.setCursor(0, 1);
      if (subText.length() > 0) {
        lcd.print(subText.substring(0, 16)); // Max 16 chars
      }
      
      if (status == "granted") {
        // ✅ CHO PHÉP VÀO/RA
        Serial.println("✅ Server OK - Access Granted");
        return true;
        
      } else if (status == "pending_payment") {
        // ⏳ CHỜ THANH TOÁN (chỉ xảy ra ở cổng ra)
        Serial.println("⏳ Waiting for payment confirmation...");
        
        // Đã hiển thị "Payment Required" + "Please wait" lên LCD ở trên
        
        // 🔄 BẮT ĐẦU POLLING CHỜ LỆNH MỞ CỔNG
        return waitForGateCommand(cardId); // Trả về true nếu nhận được lệnh mở
        
      } else if (status == "denied") {
        // ❌ TỪ CHỐI (bãi đầy, lỗi hệ thống, etc.)
        Serial.println("❌ Access denied");
        
        // Đã hiển thị lý do từ server lên LCD ở trên
        return false;
        
      } else {
        // ❓ Trạng thái không xác định
        Serial.print("❓ Unknown status: ");
        Serial.println(status);
        
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Unknown Status");
        lcd.setCursor(0, 1);
        lcd.print("Try again");
        return false;
      }
    } else {
      Serial.println("❌ JSON parse error");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Parse Error");
      lcd.setCursor(0, 1);
      lcd.print("Invalid response");
      return false;
    }
  } else {
    Serial.print("❌ HTTP Error: ");
    Serial.println(httpResponseCode);
    http.end();
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("HTTP Error");
    lcd.setCursor(0, 1);
    lcd.print("Code: " + String(httpResponseCode));
    return false;
  }
}

// Hàm đọc cảm biến siêu âm (HC-SR04)
float getDistance() {
  // Gửi tín hiệu trigger
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Đọc thời gian echo
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout 30ms
  
  if (duration == 0) {
    return -1; // Không có tín hiệu trả về
  }
  
  // Tính khoảng cách (cm)
  float distance = duration * 0.034 / 2;
  
  return distance;
}

// Hàm chờ xe đi qua và tự động đóng cổng
void waitForVehicleToPass(Servo &servo) {
  Serial.println("Waiting for vehicle to pass...");
  
  bool vehicleDetected = false;
  bool vehiclePassed = false;
  unsigned long startTime = millis();
  unsigned long maxWaitTime = 15000; // Timeout 15 giây
  
  while (!vehiclePassed && (millis() - startTime) < maxWaitTime) {
    float distance = getDistance();
    
    if (distance > 0 && distance < 20) { // Mô hình nhỏ - phát hiện trong 20cm
      if (!vehicleDetected) {
        vehicleDetected = true;
        Serial.print("Vehicle detected at distance: ");
        Serial.print(distance);
        Serial.println(" cm");
        
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Vehicle passing");
        lcd.setCursor(0, 1);
        lcd.print("Please wait...");
      }
    } else if (distance >= 20 || distance == -1) { // Xe đã đi qua hoặc không phát hiện (mô hình nhỏ)
      if (vehicleDetected) {
        // Xe đã đi qua sau khi được phát hiện
        vehiclePassed = true;
        Serial.println("Vehicle passed! Closing gate...");
        
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Vehicle passed");
        lcd.setCursor(0, 1);
        lcd.print("Closing gate");
      }
    }
    
    delay(200); // Kiểm tra mỗi 200ms
  }
  
  // Đóng cổng
  servo.write(0);
  
  if (!vehiclePassed) {
    Serial.println("Timeout! Closing gate anyway...");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Timeout!");
    lcd.setCursor(0, 1);
    lcd.print("Gate closed");
  }
  
  delay(2000); // Hiển thị thông báo 2 giây
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready to scan");
  lcd.setCursor(0, 1);
  lcd.print("RFID cards...");
}

// Hàm polling chờ lệnh mở cổng từ server (cho vé lượt)
bool waitForGateCommand(String cardId) {
  Serial.println("🔄 Starting gate command polling...");
  
  unsigned long startTime = millis();
  unsigned long maxWaitTime = 60000; // Timeout 60 giây
  unsigned long lastPollTime = 0;
  unsigned long pollInterval = 3000; // Poll mỗi 3 giây
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Waiting payment");
  lcd.setCursor(0, 1);
  lcd.print("Please wait...");
  
  while ((millis() - startTime) < maxWaitTime) {
    // Chỉ poll mỗi 3 giây để không spam server
    if (millis() - lastPollTime >= pollInterval) {
      lastPollTime = millis();
      
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi disconnected during polling");
        break;
      }
      
      HTTPClient http;
      String checkUrl = String(serverUrl).substring(0, String(serverUrl).lastIndexOf('/')) + "/check-gate-command/" + cardId;
      
      http.begin(checkUrl);
      http.setTimeout(5000);
      
      Serial.print("🔍 Polling: ");
      Serial.println(checkUrl);
      
      int httpResponseCode = http.GET();
      
      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("Poll Response: ");
        Serial.println(response);
        
        StaticJsonDocument<300> responseDoc;
        DeserializationError error = deserializeJson(responseDoc, response);
        
        if (!error) {
          bool shouldOpen = responseDoc["shouldOpen"];
          String reason = responseDoc["reason"] | "";
          
          if (shouldOpen) {
            // ✅ NHẬN ĐƯỢC LỆNH MỞ CỔNG
            Serial.print("✅ Gate command received! Reason: ");
            Serial.println(reason);
            
            lcd.clear();
            lcd.setCursor(0, 0);
            lcd.print("Payment OK!");
            lcd.setCursor(0, 1);
            lcd.print("Opening gate...");
            
            http.end();
            return true; // Mở cổng!
          }
          // Nếu shouldOpen = false, tiếp tục polling
        } else {
          Serial.println("❌ JSON parse error in polling");
        }
      } else {
        Serial.print("❌ HTTP Error in polling: ");
        Serial.println(httpResponseCode);
      }
      
      http.end();
      
      // Cập nhật LCD với countdown
      unsigned long elapsed = millis() - startTime;
      unsigned long remaining = (maxWaitTime - elapsed) / 1000;
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Waiting payment");
      lcd.setCursor(0, 1);
      lcd.print("Timeout: " + String(remaining) + "s");
    }
    
    delay(100); // Ngắn delay cho responsive
  }
  
  // ⏰ TIMEOUT - Không nhận được lệnh mở cổng
  Serial.println("⏰ Polling timeout - No gate command received");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Payment timeout");
  lcd.setCursor(0, 1);
  lcd.print("Try again");
  
  delay(3000);
  
  return false; // Không mở cổng
}