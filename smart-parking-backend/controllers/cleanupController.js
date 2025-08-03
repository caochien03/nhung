const { runCleanupManually } = require('../jobs/cleanupJobs');
const ParkingRecord = require('../models/ParkingRecord');

// Chạy cleanup thủ công
exports.runManualCleanup = async (req, res) => {
  try {
    const { days = 3 } = req.body;

    if (days < 1 || days > 30) {
      return res.status(400).json({
        success: false,
        message: "Số ngày phải từ 1 đến 30",
      });
    }

    const result = await runCleanupManually(days);

    res.json({
      success: true,
      message: `Đã xóa dữ liệu cũ hơn ${days} ngày`,
      data: result,
    });

  } catch (error) {
    console.error('Manual cleanup error:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa dữ liệu cũ",
      error: error.message,
    });
  }
};

// Lấy thống kê về dữ liệu lưu trữ
exports.getStorageStats = async (req, res) => {
  try {
    const now = new Date();
    
    // Thống kê theo khoảng thời gian
    const ranges = [
      { label: 'Today', days: 0 },
      { label: 'Yesterday', days: 1 },
      { label: 'Last 3 days', days: 3 },
      { label: 'Last 7 days', days: 7 },
      { label: 'Last 30 days', days: 30 },
    ];

    const stats = [];

    for (const range of ranges) {
      const startDate = new Date(now);
      const endDate = new Date(now);
      
      if (range.days === 0) {
        // Hôm nay
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (range.days === 1) {
        // Hôm qua
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Khoảng thời gian khác
        startDate.setDate(startDate.getDate() - range.days);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const query = {
        createdAt: { $gte: startDate, $lte: endDate }
      };

      const [total, withEntryImage, withExitImage, withBothImages] = await Promise.all([
        ParkingRecord.countDocuments(query),
        ParkingRecord.countDocuments({
          ...query,
          'entryImage.url': { $exists: true }
        }),
        ParkingRecord.countDocuments({
          ...query,
          'exitImage.url': { $exists: true }
        }),
        ParkingRecord.countDocuments({
          ...query,
          'entryImage.url': { $exists: true },
          'exitImage.url': { $exists: true }
        })
      ]);

      stats.push({
        period: range.label,
        days: range.days,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        records: {
          total,
          withEntryImage,
          withExitImage,
          withBothImages,
          withoutImages: total - withEntryImage - withExitImage + withBothImages
        }
      });
    }

    // Thống kê tổng quan
    const [
      totalRecords,
      totalWithImages,
      oldRecords
    ] = await Promise.all([
      ParkingRecord.countDocuments(),
      ParkingRecord.countDocuments({
        $or: [
          { 'entryImage.url': { $exists: true } },
          { 'exitImage.url': { $exists: true } }
        ]
      }),
      ParkingRecord.countDocuments({
        createdAt: { $lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalRecords,
          totalWithImages,
          oldRecords,
          nextCleanupWillDelete: oldRecords
        },
        periodStats: stats
      }
    });

  } catch (error) {
    console.error('Get storage stats error:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê lưu trữ",
      error: error.message,
    });
  }
};
