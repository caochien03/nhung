require('dotenv').config();

console.log('=== TESTING ENVIRONMENT VARIABLES ===');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');

// Test Cloudinary configuration
console.log('\n=== TESTING CLOUDINARY CONFIG ===');
const cloudinary = require('./config/cloudinary');
console.log('Cloudinary config:', {
    cloud_name: cloudinary.config().cloud_name,
    api_key: cloudinary.config().api_key,
    api_secret: cloudinary.config().api_secret ? 'SET' : 'NOT SET'
});
