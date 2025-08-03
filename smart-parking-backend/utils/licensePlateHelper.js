/**
 * Utility functions for license plate recognition and comparison
 * Handles OCR errors and fuzzy matching for Vietnamese license plates
 */

/**
 * Normalize license plate format for comparison
 * @param {string} licensePlate - Raw license plate string
 * @returns {string} - Normalized license plate
 */
const normalizeLicensePlate = (licensePlate) => {
  if (!licensePlate) return '';
  
  return licensePlate
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^\w\-]/g, ''); // Keep only alphanumeric and dash
};

/**
 * Common OCR character substitutions for Vietnamese license plates
 */
const OCR_SUBSTITUTIONS = {
  // Numbers that OCR often mistakes
  '0': ['O', 'Q', 'D'],
  '1': ['I', 'L', '|'],
  '2': ['Z'],
  '5': ['S'],
  '6': ['G'],
  '8': ['B'],
  '9': ['g'],
  
  // Letters that OCR often mistakes
  'O': ['0', 'Q', 'D'],
  'I': ['1', 'L', '|'],
  'L': ['1', 'I'],
  'S': ['5'],
  'G': ['6'],
  'B': ['8'],
  'Z': ['2'],
  'Q': ['0', 'O'],
  'D': ['0', 'O']
};

/**
 * Generate possible OCR variations of a license plate
 * @param {string} licensePlate - Original license plate
 * @returns {string[]} - Array of possible variations
 */
const generateOCRVariations = (licensePlate) => {
  const normalized = normalizeLicensePlate(licensePlate);
  const variations = new Set([normalized]);
  
  // For each character, try common OCR substitutions
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const substitutes = OCR_SUBSTITUTIONS[char] || [];
    
    substitutes.forEach(substitute => {
      const variation = normalized.substring(0, i) + substitute + normalized.substring(i + 1);
      variations.add(variation);
    });
  }
  
  return Array.from(variations);
};

/**
 * Calculate similarity score between two license plates
 * @param {string} plate1 - First license plate
 * @param {string} plate2 - Second license plate
 * @returns {number} - Similarity score (0-1)
 */
const calculateSimilarity = (plate1, plate2) => {
  const norm1 = normalizeLicensePlate(plate1);
  const norm2 = normalizeLicensePlate(plate2);
  
  if (norm1 === norm2) return 1.0;
  
  // Levenshtein distance for similarity
  const matrix = [];
  const len1 = norm1.length;
  const len2 = norm2.length;
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (norm1[i - 1] === norm2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
};

/**
 * Check if two license plates match considering OCR errors
 * @param {string} registeredPlate - Registered license plate
 * @param {string} ocrPlate - OCR detected license plate
 * @param {number} threshold - Minimum similarity threshold (default: 0.8)
 * @returns {object} - Match result with score and variations
 */
const fuzzyMatchLicensePlate = (registeredPlate, ocrPlate, threshold = 0.8) => {
  const normalizedRegistered = normalizeLicensePlate(registeredPlate);
  const normalizedOCR = normalizeLicensePlate(ocrPlate);
  
  // Exact match
  if (normalizedRegistered === normalizedOCR) {
    return {
      isMatch: true,
      score: 1.0,
      method: 'exact',
      normalizedRegistered,
      normalizedOCR
    };
  }
  
  // Generate variations and check
  const variations = generateOCRVariations(normalizedRegistered);
  
  for (const variation of variations) {
    if (variation === normalizedOCR) {
      return {
        isMatch: true,
        score: 0.95,
        method: 'ocr_variation',
        variation,
        normalizedRegistered,
        normalizedOCR
      };
    }
  }
  
  // Similarity-based matching
  const similarity = calculateSimilarity(normalizedRegistered, normalizedOCR);
  
  return {
    isMatch: similarity >= threshold,
    score: similarity,
    method: 'similarity',
    threshold,
    normalizedRegistered,
    normalizedOCR
  };
};

/**
 * Find matching registered license plate from a list
 * @param {string} ocrPlate - OCR detected license plate
 * @param {string[]} registeredPlates - Array of registered license plates
 * @param {number} threshold - Minimum similarity threshold
 * @returns {object|null} - Best match result or null
 */
const findBestMatch = (ocrPlate, registeredPlates, threshold = 0.8) => {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const registeredPlate of registeredPlates) {
    const matchResult = fuzzyMatchLicensePlate(registeredPlate, ocrPlate, threshold);
    
    if (matchResult.isMatch && matchResult.score > bestScore) {
      bestMatch = {
        ...matchResult,
        registeredPlate,
        ocrPlate
      };
      bestScore = matchResult.score;
    }
  }
  
  return bestMatch;
};

module.exports = {
  normalizeLicensePlate,
  generateOCRVariations,
  calculateSimilarity,
  fuzzyMatchLicensePlate,
  findBestMatch,
  OCR_SUBSTITUTIONS
};
