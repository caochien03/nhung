/**
 * Tính phí đỗ xe theo quy tắc:
 * - Mặc định: 35,000 VND
 * - Qua 9h tối (21:00): 50,000 VND (một ngày)
 * 
 * @param {Date} timeIn - Thời gian vào
 * @param {Date} timeOut - Thời gian ra
 * @returns {Object} - Thông tin phí
 */
function calculateParkingFee(timeIn, timeOut) {
    const REGULAR_FEE = 35000; // 35k VND mặc định
    const OVERNIGHT_FEE = 50000; // 50k VND qua đêm
    const OVERNIGHT_HOUR = 21; // 9h tối (21:00)
    
    const entryTime = new Date(timeIn);
    const exitTime = new Date(timeOut);
    
    // Tính thời gian đỗ
    const parkingDurationMs = exitTime.getTime() - entryTime.getTime();
    const parkingHours = parkingDurationMs / (1000 * 60 * 60);
    
    // Format thời gian hiển thị
    const totalSeconds = Math.floor(parkingDurationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let durationDisplay = "";
    if (hours > 0) {
        durationDisplay += `${hours}h `;
    }
    if (minutes > 0) {
        durationDisplay += `${minutes}m `;
    }
    durationDisplay += `${seconds}s`;
    
    // Kiểm tra xem có qua 9h tối không
    const entryHour = entryTime.getHours();
    const exitHour = exitTime.getHours();
    const entryDate = entryTime.toDateString();
    const exitDate = exitTime.toDateString();
    
    let fee = REGULAR_FEE;
    let feeType = "Theo giờ (35k)";
    
    // Nếu vào trước 21h nhưng ra sau 21h, hoặc qua ngày khác
    if (
        (entryHour < OVERNIGHT_HOUR && exitHour >= OVERNIGHT_HOUR) || // Qua 9h tối cùng ngày
        (entryDate !== exitDate) // Qua ngày khác
    ) {
        fee = OVERNIGHT_FEE;
        feeType = "Qua đêm (50k)";
    }
    // Nếu vào sau 21h và ra trước 21h ngày hôm sau
    else if (entryHour >= OVERNIGHT_HOUR && entryDate !== exitDate && exitHour < OVERNIGHT_HOUR) {
        fee = OVERNIGHT_FEE;
        feeType = "Qua đêm (50k)";
    }
    
    return {
        fee,
        feeType,
        durationDisplay,
        parkingHours: Math.ceil(parkingHours),
        entryTime: entryTime.toLocaleString('vi-VN'),
        exitTime: exitTime.toLocaleString('vi-VN')
    };
}

/**
 * Tính phí với discount vé tháng
 */
function calculateFeeWithSubscription(timeIn, timeOut, hasSubscription = false) {
    const feeInfo = calculateParkingFee(timeIn, timeOut);
    
    if (hasSubscription) {
        return {
            ...feeInfo,
            originalFee: feeInfo.fee,
            fee: 0, // Miễn phí với vé tháng
            subscriptionDiscount: feeInfo.fee,
            feeType: "Miễn phí (Vé tháng)"
        };
    }
    
    return {
        ...feeInfo,
        originalFee: feeInfo.fee,
        subscriptionDiscount: 0
    };
}

module.exports = {
    calculateParkingFee,
    calculateFeeWithSubscription
};
