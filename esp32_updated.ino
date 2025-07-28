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

// Backend server URL - ĐÃ THAY ĐỔI
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

  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

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
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
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

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("RFID #1: ");
        lcd.setCursor(0, 1);
        lcd.print(cardId1.substring(0, 8));

        servo1.write(90);
        delay(1000);
        servo1.write(0);

        blinkLedSuccess();  // ✅ LED nháy 2 lần

        sendDataToBackend(1, cardId1);  // Camera 1 = RFID 1
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
        lcd.print("RFID #2: ");
        lcd.setCursor(0, 1);
        lcd.print(cardId2.substring(0, 8));

        servo2.write(90);
        delay(1000);
        servo2.write(0);

        blinkLedSuccess();  // ✅ LED nháy 2 lần

        sendDataToBackend(2, cardId2);  // Camera 2 = RFID 2
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
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
} 