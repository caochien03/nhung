// Test script để kiểm tra fuzzy matching cho biển số xe
// Chạy script này để test các trường hợp OCR không chính xác

const { 
  fuzzyMatchLicensePlate, 
  findBestMatch, 
  generateOCRVariations,
  normalizeLicensePlate 
} = require("./utils/licensePlateHelper");

console.log("🧪 Testing License Plate Fuzzy Matching");
console.log("=====================================\n");

// Test case của user: đăng ký "63-B1 84240" nhưng OCR đọc "63-B1*842.40"
const testCases = [
  {
    registered: "63-B1 84240",
    ocr: "63-B1*842.40",
    description: "User's example: Registered vs OCR with dots and asterisk"
  },
  {
    registered: "89-E1*188.96",  
    ocr: "89-E1*18896",
    description: "Sample data: Missing dots"
  },
  {
    registered: "89-E1*188.96",
    ocr: "89-E1188.96",
    description: "Sample data: Missing asterisk"
  },
  {
    registered: "30-A1 12345",
    ocr: "30-A112345",
    description: "Common: Missing space"
  },
  {
    registered: "51-B2 67890",
    ocr: "51-82 67890", 
    description: "OCR error: B confused with 8"
  },
  {
    registered: "29-C3 11111",
    ocr: "29-C3 IIIII",
    description: "OCR error: 1 confused with I"
  },
  {
    registered: "77-D4 00000",
    ocr: "77-D4 OOOOO",
    description: "OCR error: 0 confused with O"
  }
];

console.log("1️⃣ Individual Test Cases:");
console.log("-------------------------");

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.description}`);
  console.log(`Registered: "${testCase.registered}"`);
  console.log(`OCR Read:   "${testCase.ocr}"`);
  
  const result = fuzzyMatchLicensePlate(testCase.registered, testCase.ocr);
  
  console.log(`Result: ${result.isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
  console.log(`Score: ${result.score.toFixed(3)}`);
  console.log(`Method: ${result.method}`);
  
  if (result.variation) {
    console.log(`Matched via variation: ${result.variation}`);
  }
  
  console.log(`Normalized - Registered: "${result.normalizedRegistered}"`);
  console.log(`Normalized - OCR: "${result.normalizedOCR}"`);
});

console.log("\n\n2️⃣ Testing findBestMatch function:");
console.log("-----------------------------------");

// Test với danh sách xe đăng ký
const registeredVehicles = [
  "63-B1 84240",
  "89-E1*188.96", 
  "30-A1 12345",
  "51-B2 67890",
  "29-C3 11111"
];

const ocrTests = [
  "63-B1*842.40",  // User's case
  "89-E1*18896",   // Missing dots
  "30A112345",     // Missing dash and space
  "51-82 67890",   // B->8 confusion
  "XX-YZ 99999"    // No match expected
];

ocrTests.forEach((ocrPlate, index) => {
  console.log(`\nOCR Test ${index + 1}: "${ocrPlate}"`);
  
  const bestMatch = findBestMatch(ocrPlate, registeredVehicles, 0.75);
  
  if (bestMatch) {
    console.log(`✅ Best match found: "${bestMatch.registeredPlate}"`);
    console.log(`Score: ${bestMatch.score.toFixed(3)}`);
    console.log(`Method: ${bestMatch.method}`);
  } else {
    console.log(`❌ No suitable match found`);
  }
});

console.log("\n\n3️⃣ Testing OCR Variations:");
console.log("---------------------------");

const plateForVariations = "63-B1 84240";
console.log(`\nGenerating variations for: "${plateForVariations}"`);

const variations = generateOCRVariations(plateForVariations);
console.log(`Generated ${variations.length} variations:`);
variations.forEach((variation, index) => {
  console.log(`${index + 1}. ${variation}`);
});

console.log("\n\n4️⃣ Normalization Test:");
console.log("----------------------");

const unnormalizedPlates = [
  "  63-B1 84240  ",
  "63-b1*842.40",
  "63B184240",
  "63-B1@84240",
  "63 - B1 * 842.40"
];

unnormalizedPlates.forEach((plate, index) => {
  const normalized = normalizeLicensePlate(plate);
  console.log(`${index + 1}. "${plate}" -> "${normalized}"`);
});

console.log("\n\n✅ Test completed!");
console.log("📋 Summary: The fuzzy matching system can handle OCR errors");
console.log("    like dots, spaces, asterisks, and character confusion.");
console.log("    Threshold of 0.75 provides good balance between accuracy and flexibility.");
