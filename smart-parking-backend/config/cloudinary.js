const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

module.exports = cloudinary;
