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
const char* serverUrl = "http://192.168.102.9:8080/api/esp32/uid";

// RFID pins for RC522 #1
#define RST_PIN_1    22
#define SS_PIN_1     5

// RFID pins for RC522 #2  
#define RST_PIN_2    21
#define SS_PIN_2     4

// Servo pins
#define SERVO_PIN_1  13
#define SERVO_PIN_2  12

// LED pin
#define LED_PIN      14  // D14

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
bool sendDataToBackend(int readerId, String cardId);
void blinkLedSuccess();
void operateServo(int servoNumber);
void beepCardDetected();

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
    return;
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

        // KÊU CÒI NGAY KHI QUẸT THẺ
        beepCardDetected();

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Checking...");
        lcd.setCursor(0, 1);
        lcd.print(cardId1.substring(0, 8));

        // Gửi đến backend và chỉ quay servo khi thành công
        if (sendDataToBackend(1, cardId1)) {
          operateServo(1);
          blinkLedSuccess();
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

        // KÊU CÒI NGAY KHI QUẸT THẺ
        beepCardDetected();

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Checking...");
        lcd.setCursor(0, 1);
        lcd.print(cardId2.substring(0, 8));

        // Gửi đến backend và chỉ quay servo khi thành công
        if (sendDataToBackend(2, cardId2)) {
          operateServo(2);
          blinkLedSuccess();
        }
      }

      rfid2.PICC_HaltA();
      rfid2.PCD_StopCrypto1();
    }
  }

  delay(100);
}

bool sendDataToBackend(int readerId, String cardId) {
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
        lcd.print("Access Granted!");
        lcd.setCursor(0, 1);
        lcd.print("Camera #" + String(readerId));
        http.end();
        return true;  // Thành công
      } else {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Access Denied!");
        lcd.setCursor(0, 1);
        lcd.print("Invalid card");
        http.end();
        delay(3000);
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Ready to scan");
        lcd.setCursor(0, 1);
        lcd.print("RFID cards...");
        return false;  // Thất bại
      }
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Connection Error!");
      lcd.setCursor(0, 1);
      lcd.print("Error: " + String(httpResponseCode));
      http.end();
      delay(3000);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Ready to scan");
      lcd.setCursor(0, 1);
      lcd.print("RFID cards...");
      return false;  // Thất bại
    }
  } else {
    Serial.println("WiFi not connected!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Error!");
    lcd.setCursor(0, 1);
    lcd.print("Reconnecting...");
    return false;  // Thất bại
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

void operateServo(int servoNumber) {
  Serial.print("Operating servo #");
  Serial.println(servoNumber);
  
  if (servoNumber == 1) {
    servo1.write(90);
    delay(1000);
    servo1.write(0);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Gate #1 Opened!");
    lcd.setCursor(0, 1);
    lcd.print("Welcome!");
  } else if (servoNumber == 2) {
    servo2.write(90);
    delay(1000);
    servo2.write(0);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Gate #2 Opened!");
    lcd.setCursor(0, 1);
    lcd.print("Welcome!");
  }
  
  delay(2000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready to scan");
  lcd.setCursor(0, 1);
  lcd.print("RFID cards...");
}

void beepCardDetected() {
  // Tiếng còi ngắn để báo hiệu đã quẹt thẻ
  Serial.println("BEEP: Card detected!");
  
  // Method 1: Digital ON/OFF (for Active Buzzer)
  digitalWrite(LED_PIN, HIGH);
  delay(100);  // Ngắn hơn để phân biệt với tiếng thành công
  digitalWrite(LED_PIN, LOW);
  
  // Method 2: PWM Tone (for Passive Buzzer) - Uncomment if needed
  // tone(LED_PIN, 1000, 100);  // 1000Hz for 100ms, khác với tiếng thành công
}