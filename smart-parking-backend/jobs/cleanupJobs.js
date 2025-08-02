const cron = require('node-cron');
const ParkingRecord = require('../models/ParkingRecord');
const { deleteOldImages } = require('../utils/cloudinaryHelper');

/**
 * Job xóa hình ảnh và dữ liệu cũ hơn 3 ngày
 * Chạy hàng ngày lúc 2:00 AM
 */
const cleanupOldData = () => {
  // Chạy hàng ngày lúc 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🧹 Starting cleanup job for old parking data...');
      
      // Tính toán ngày cắt (3 ngày trước)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 3);
      cutoffDate.setHours(0, 0, 0, 0);

      // 1. Xóa hình ảnh từ Cloudinary
      console.log('🗑️ Deleting old images from Cloudinary...');
      const deletedImagesCount = await deleteOldImages(3);
      console.log(`✅ Deleted ${deletedImagesCount} old images from Cloudinary`);

      // 2. Xóa records cũ từ database
      console.log('🗑️ Deleting old parking records from database...');
      const deleteResult = await ParkingRecord.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} old parking records from database`);
      console.log(`🎉 Cleanup job completed successfully at ${new Date().toISOString()}`);

    } catch (error) {
      console.error('❌ Error in cleanup job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  console.log('📅 Cleanup job scheduled to run daily at 2:00 AM (GMT+7)');
};

/**
 * Job xóa hình ảnh và dữ liệu cũ thủ công
 * @param {number} days - Số ngày để xóa dữ liệu cũ hơn
 */
const runCleanupManually = async (days = 3) => {
  try {
    console.log(`🧹 Starting manual cleanup for data older than ${days} days...`);
    
    // Tính toán ngày cắt
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);

    // 1. Xóa hình ảnh từ Cloudinary
    console.log('🗑️ Deleting old images from Cloudinary...');
    const deletedImagesCount = await deleteOldImages(days);
    console.log(`✅ Deleted ${deletedImagesCount} old images from Cloudinary`);

    // 2. Xóa records cũ từ database
    console.log('🗑️ Deleting old parking records from database...');
    const deleteResult = await ParkingRecord.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(`✅ Deleted ${deleteResult.deletedCount} old parking records from database`);
    console.log(`🎉 Manual cleanup completed successfully at ${new Date().toISOString()}`);

    return {
      deletedImages: deletedImagesCount,
      deletedRecords: deleteResult.deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };

  } catch (error) {
    console.error('❌ Error in manual cleanup:', error);
    throw error;
  }
};

/**
 * Job thống kê dung lượng lưu trữ hàng tuần
 * Chạy mỗi Chủ nhật lúc 1:00 AM
 */
const weeklyStorageReport = () => {
  cron.schedule('0 1 * * 0', async () => {
    try {
      console.log('📊 Generating weekly storage report...');
      
      // Đếm tổng số records có hình ảnh
      const recordsWithImages = await ParkingRecord.countDocuments({
        $or: [
          { 'entryImage.url': { $exists: true } },
          { 'exitImage.url': { $exists: true } }
        ]
      });

      // Đếm records theo tuần
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentRecords = await ParkingRecord.countDocuments({
        createdAt: { $gte: oneWeekAgo },
        $or: [
          { 'entryImage.url': { $exists: true } },
          { 'exitImage.url': { $exists: true } }
        ]
      });

      const oldRecords = recordsWithImages - recentRecords;

      console.log(`📈 Weekly Storage Report (${new Date().toISOString().split('T')[0]}):`);
      console.log(`   Total records with images: ${recordsWithImages}`);
      console.log(`   Recent records (last 7 days): ${recentRecords}`);
      console.log(`   Older records: ${oldRecords}`);
      console.log(`   Estimated cleanup impact: ${oldRecords} records`);

    } catch (error) {
      console.error('❌ Error generating storage report:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  console.log('📊 Weekly storage report scheduled for Sundays at 1:00 AM (GMT+7)');
};

module.exports = {
  cleanupOldData,
  runCleanupManually,
  weeklyStorageReport
};
