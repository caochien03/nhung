const cloudinary = require('../config/cloudinary');
const fs = require('fs');

/**
 * Upload hình ảnh lên Cloudinary
 * @param {string} imagePath - Đường dẫn file hình ảnh
 * @param {string} licensePlate - Biển số xe
 * @param {string} action - Hành động (in/out)
 * @param {number} cameraIndex - Index camera (1: vào, 2: ra)
 */
const uploadParkingImage = async (imagePath, licensePlate, action, cameraIndex) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const plate = licensePlate || 'unknown';
    const publicId = `parking/${action}/${plate}_${timestamp}_cam${cameraIndex}`;

    const result = await cloudinary.uploader.upload(imagePath, {
      public_id: publicId,
      folder: 'smart-parking',
      resource_type: 'image',
      format: 'jpg',
      tags: [action, `camera_${cameraIndex}`, plate],
      context: {
        license_plate: plate,
        action: action,
        camera: cameraIndex,
        timestamp: timestamp
      }
    });

    // Xóa file tạm nếu tồn tại
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };

  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    
    // Xóa file tạm nếu có lỗi
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    throw new Error('Failed to upload image to cloud storage');
  }
};

/**
 * Upload hình ảnh từ base64 string
 * @param {string} base64Image - Hình ảnh dạng base64
 * @param {string} licensePlate - Biển số xe
 * @param {string} action - Hành động (in/out)
 * @param {number} cameraIndex - Index camera (1: vào, 2: ra)
 */
const uploadBase64Image = async (base64Image, licensePlate, action, cameraIndex) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const plate = licensePlate || 'unknown';
    const publicId = `parking/${action}/${plate}_${timestamp}_cam${cameraIndex}`;

    // Xử lý base64 string (loại bỏ prefix nếu có)
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
      public_id: publicId,
      folder: 'smart-parking',
      resource_type: 'image',
      format: 'jpg',
      tags: [action, `camera_${cameraIndex}`, plate],
      context: {
        license_plate: plate,
        action: action,
        camera: cameraIndex,
        timestamp: timestamp
      }
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };

  } catch (error) {
    console.error('Error uploading base64 to Cloudinary:', error);
    throw new Error('Failed to upload image to cloud storage');
  }
};

/**
 * Xóa hình ảnh từ Cloudinary
 * @param {string} publicId - Public ID của hình ảnh
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw new Error('Failed to delete image from cloud storage');
  }
};

/**
 * Xóa hình ảnh cũ hơn số ngày được chỉ định
 * @param {number} days - Số ngày (mặc định 3)
 */
const deleteOldImages = async (days = 3) => {
  try {
    // Tính toán thời gian cắt
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Tìm tất cả hình ảnh trong folder smart-parking
    const result = await cloudinary.search
      .expression('folder:smart-parking')
      .sort_by([['created_at', 'asc']])
      .max_results(500)
      .execute();

    let deletedCount = 0;
    
    for (const image of result.resources) {
      const createdAt = new Date(image.created_at);
      
      if (createdAt < cutoffDate) {
        await cloudinary.uploader.destroy(image.public_id);
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} old images from Cloudinary`);
    return deletedCount;

  } catch (error) {
    console.error('Error deleting old images:', error);
    throw new Error('Failed to delete old images');
  }
};

module.exports = {
  uploadParkingImage,
  uploadBase64Image,
  deleteImage,
  deleteOldImages
};
