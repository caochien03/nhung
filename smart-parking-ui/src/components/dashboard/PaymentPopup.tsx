import React, { useState, useEffect } from 'react';
import { esp32API } from '../../services/api';
import { ParkingRecord } from '../../types';
import { wsService } from '../../services/websocket';

interface PaymentPopupProps {
  autoShow?: boolean;
}

const PaymentPopup: React.FC<PaymentPopupProps> = ({ autoShow = true }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [payment, setPayment] = useState<ParkingRecord | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (autoShow) {
      // Lắng nghe WebSocket cho thanh toán mới
      wsService.subscribe('payment_required', handleNewPayment);
      
      return () => {
        wsService.unsubscribe('payment_required', handleNewPayment);
      };
    }
  }, [autoShow]);

  const handleNewPayment = (data: any) => {
    console.log('🔔 Auto popup for new payment:', data);
    
    if (data.parkingRecord) {
      setPayment(data.parkingRecord);
      setShowPopup(true);
      
      // Phát âm thanh cảnh báo
      playAlertSound();
      
      // Browser notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🚗 Xe cần thanh toán!', {
          body: `${data.parkingRecord.licensePlate} - ${data.parkingRecord.fee?.toLocaleString()} VND`,
          icon: '/favicon.ico',
          requireInteraction: true
        });
      }
    }
  };

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Alert sound pattern: beep-beep-beep
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const confirmPayment = async () => {
    if (!payment) return;
    
    setConfirming(true);
    try {
      console.log('Confirming payment for:', payment);
      
      // Validate recordId before sending
      const recordId = payment._id || payment.id || '';
      if (!recordId) {
        throw new Error('Không tìm thấy ID bản ghi thanh toán');
      }
      
      const requestData = {
        recordId: recordId,
        paymentMethod: 'cash',
        confirmedBy: 'staff'
      };
      
      console.log('Sending API request with data:', requestData);
      
      const response = await esp32API.confirmPayment(requestData);

      console.log('API Response:', response);

      if (response && response.success) {
        // Success sound
        playSuccessSound();
        
        // Success notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('✅ Thanh toán thành công!', {
            body: `Xe ${payment.licensePlate} - Cổng đã mở`,
            icon: '/favicon.ico'
          });
        }
        
        setShowPopup(false);
        setPayment(null);
      } else {
        console.error('Payment confirmation failed:', response);
        const errorMsg = response?.message || 'Không có phản hồi từ server';
        alert('Lỗi xác nhận thanh toán: ' + errorMsg);
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      
      // More detailed error handling
      let errorMessage = 'Lỗi không xác định';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Không thể kết nối tới server. Kiểm tra kết nối mạng.';
      } else if (error.message) {
        // Something else happened
        errorMessage = error.message;
      }
      
      alert('Lỗi xác nhận thanh toán: ' + errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Success sound: ascending tone
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const dismissPopup = () => {
    setShowPopup(false);
    setPayment(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDuration = (timeIn: string | Date, timeOut?: string | Date) => {
    const inTime = new Date(timeIn);
    const outTime = timeOut ? new Date(timeOut) : new Date();
    const durationMs = outTime.getTime() - inTime.getTime();
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (!showPopup || !payment) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-xs w-full mx-4 border-4 border-red-500 animate-bounce-once animate-urgent-pulse">
        {/* Alert Header */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">🚗💰</div>
          <h3 className="text-lg font-bold text-red-600 animate-pulse">XE CẦN THANH TOÁN!</h3>
        </div>
        
        {/* Payment Info */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 mb-4 border border-red-200">
          <div className="text-center mb-3">
            <div className="text-2xl font-black text-blue-700">{payment.licensePlate}</div>
            <div className="text-xs text-gray-500">Biển số xe</div>
          </div>
          
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Thời gian:</span>
            <span className="font-semibold">{formatDuration(payment.timeIn, payment.timeOut)}</span>
          </div>
          
          <div className="text-center border-t border-red-200 pt-3">
            <div className="text-2xl font-black text-green-600">{formatCurrency(payment.fee || 0)}</div>
            <div className="text-xs text-gray-500">Tổng phí</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={confirmPayment}
            disabled={confirming}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-4 rounded-xl text-base font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            {confirming ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </span>
            ) : (
              '✅ XÁC NHẬN'
            )}
          </button>
          <button
            onClick={dismissPopup}
            disabled={confirming}
            className="bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white px-4 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            ❌
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPopup;
