require('dotenv').config();
const cloudinary = require('../config/cloudinary');

console.log('🧪 Testing Cloudinary connection...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);

// Test connection
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Cloudinary connection successful!');
    console.log('Result:', result);
    
    // Test upload một hình ảnh mẫu
    const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    return cloudinary.uploader.upload(testBase64, {
      public_id: 'test_connection',
      folder: 'smart-parking',
      overwrite: true
    });
  })
  .then(uploadResult => {
    console.log('✅ Test upload successful!');
    console.log('Upload URL:', uploadResult.secure_url);
    
    // Xóa hình ảnh test
    return cloudinary.uploader.destroy(uploadResult.public_id);
  })
  .then(deleteResult => {
    console.log('✅ Test cleanup successful!');
    console.log('🎉 Cloudinary integration is working perfectly!');
  })
  .catch(error => {
    console.error('❌ Cloudinary test failed:', error.message);
    console.error('Error details:', error);
  });
