const express = require('express');
const router = express.Router();
const ParkingRecord = require('../models/ParkingRecord');

// Test endpoint để kiểm tra dữ liệu (không cần auth)
router.get('/test/active-parkings', async (req, res) => {
    try {
        console.log('📊 Testing active parkings...');
        
        // Kiểm tra tất cả records
        const allRecords = await ParkingRecord.find({}).sort({ timeIn: -1 }).limit(10);
        console.log('Total records:', allRecords.length);
        
        // Kiểm tra active records
        const activeRecords = await ParkingRecord.find({ 
            status: "active",
            timeOut: { $exists: false }
        }).populate("userId", "username email").sort({ timeIn: -1 });
        
        console.log('Active records:', activeRecords.length);
        
        // Kiểm tra records với status khác
        const statusCount = await ParkingRecord.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        
        res.json({
            success: true,
            data: {
                allRecordsCount: allRecords.length,
                activeRecords: activeRecords,
                statusDistribution: statusCount,
                sampleRecords: allRecords.slice(0, 5)
            }
        });
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
