import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { parkingAPI, esp32API } from '../../services/api';
import { ParkingRecord } from '../../types';
import { wsService } from '../../services/websocket';

interface PendingPayment {
  _id: string;
  plateNumber: string;
  timeIn: string;
  timeOut: string;
  totalCost: number;
  vehicleType: string;
  paymentStatus: string;
  parkingDuration: number;
}

const PaymentConfirmation: React.FC = () => {
  const [pendingPayments, setPendingPayments] = useState<ParkingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ParkingRecord | null>(null);

  useEffect(() => {
    fetchPendingPayments();
    const interval = setInterval(fetchPendingPayments, 5000);
    
    // Yêu cầu quyền notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Lắng nghe WebSocket notifications cho thanh toán mới
    wsService.subscribe('payment_required', handleNewPaymentRequired);
    wsService.subscribe('payment_completed', handlePaymentCompleted);
    
    return () => {
      clearInterval(interval);
      wsService.unsubscribe('payment_required', handleNewPaymentRequired);
      wsService.unsubscribe('payment_completed', handlePaymentCompleted);
    };
  }, []);

  const handleNewPaymentRequired = (data: any) => {
    console.log('🔔 New payment required:', data);
    // Thêm payment mới vào danh sách hoặc refresh
    fetchPendingPayments();
    
    // Hiển thị notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🚗 Xe cần thanh toán!', {
        body: `Biển số: ${data.parkingRecord?.licensePlate} - Phí: ${data.parkingRecord?.fee?.toLocaleString()} VND`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'payment-required',
        requireInteraction: true,
        silent: false
      });
    }
    
    // Có thể thêm âm thanh cảnh báo
    try {
      // Simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Ignore audio errors
    }
  };

  const handlePaymentCompleted = (data: any) => {
    console.log('✅ Payment completed:', data);
    // Xóa payment đã hoàn thành khỏi danh sách
    fetchPendingPayments();
  };

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const response = await parkingAPI.getPendingPayments();
      setPendingPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = (payment: ParkingRecord) => {
    setSelectedPayment(payment);
    setShowConfirmPopup(true);
  };

  const confirmPayment = async (paymentMethod: string = 'cash') => {
    if (!selectedPayment) return;
    
    const recordId = selectedPayment.id || selectedPayment._id;
    if (!recordId) return;
    
    setConfirmingPayment(recordId);
    try {
      const response = await esp32API.confirmPayment({
        recordId,
        paymentMethod,
        confirmedBy: 'staff'
      });

      if (response.success) {
        await fetchPendingPayments();
        setShowConfirmPopup(false);
        setSelectedPayment(null);
        
        // Hiển thị thông báo thành công
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('✅ Thanh toán đã xác nhận!', {
            body: `Xe ${selectedPayment.licensePlate} - Cổng đã mở`,
            icon: '/favicon.ico',
            tag: 'payment-confirmed'
          });
        }
        
        // Phát âm thanh thành công
        try {
          // Success sound - higher pitch
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {}
        
        alert('Payment confirmed successfully! Gate opened.');
      } else {
        alert('Failed to confirm payment: ' + response.message);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Error confirming payment');
    } finally {
      setConfirmingPayment(null);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmPopup(false);
    setSelectedPayment(null);
  };

  const formatDuration = (timeIn: string | Date, timeOut?: string | Date) => {
    const inTime = new Date(timeIn);
    const outTime = timeOut ? new Date(timeOut) : new Date();
    const durationMs = outTime.getTime() - inTime.getTime();
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">Xác nhận thanh toán</h2>
          {pendingPayments.length > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
              {pendingPayments.length}
            </span>
          )}
        </div>
        <Button 
          onClick={fetchPendingPayments}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600"
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </Button>
      </div>

      <div className="grid gap-4">
        {pendingPayments.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-500">Không có thanh toán nào cần xác nhận</p>
          </Card>
        ) : (
          pendingPayments.map((payment) => {
            const isRecent = payment.timeOut && new Date().getTime() - new Date(payment.timeOut).getTime() < 30000; // 30 giây
            return (
              <Card key={payment._id} className={`p-4 ${isRecent ? 'ring-2 ring-red-400 bg-red-50' : ''}`}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Biển số</p>
                        <p className="font-semibold text-lg">{payment.licensePlate}</p>
                        {isRecent && (
                          <span className="inline-block px-2 py-1 text-xs bg-red-200 text-red-800 rounded-full mt-1">
                            MỚI
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Loại xe</p>
                        <p className="font-medium">Xe</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Thời gian</p>
                        <p className="font-medium">{formatDuration(payment.timeIn, payment.timeOut)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phí</p>
                        <p className="font-bold text-green-600 text-lg">{formatCurrency(payment.fee || 0)}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Vào: </span>
                        {new Date(payment.timeIn).toLocaleString('vi-VN')}
                      </div>
                      <div>
                        <span className="font-medium">Ra: </span>
                        {payment.timeOut ? new Date(payment.timeOut).toLocaleString('vi-VN') : 'Đang đỗ'}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <Button
                      onClick={() => handleConfirmClick(payment)}
                      disabled={confirmingPayment === (payment.id || payment._id)}
                      className={`px-6 py-2 text-white ${
                        isRecent 
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {confirmingPayment === (payment.id || payment._id) ? 'Đang xử lý...' : 'Xác nhận TT'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Simple Payment Confirmation Popup */}
      {showConfirmPopup && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm w-full mx-4 border-2 border-red-400">
            {/* Header */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-red-600">💰 XÁC NHẬN THANH TOÁN</h3>
              <div className="w-full h-1 bg-red-200 rounded mt-2"></div>
            </div>
            
            {/* Payment Info - Compact */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedPayment.licensePlate}</div>
                <div className="text-sm text-gray-500">Biển số xe</div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Thời gian đỗ:</span>
                <span className="font-medium">{formatDuration(selectedPayment.timeIn, selectedPayment.timeOut)}</span>
              </div>
              
              <div className="text-center border-t pt-2">
                <div className="text-3xl font-bold text-green-600">{formatCurrency(selectedPayment.fee || 0)}</div>
                <div className="text-sm text-gray-500">Tổng phí</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                onClick={() => confirmPayment('cash')}
                disabled={confirmingPayment === (selectedPayment.id || selectedPayment._id)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 text-lg font-bold"
              >
                {confirmingPayment === (selectedPayment.id || selectedPayment._id) ? '⏳ Đang xử lý...' : '✅ XÁC NHẬN'}
              </Button>
              <Button
                onClick={cancelConfirmation}
                disabled={confirmingPayment === (selectedPayment.id || selectedPayment._id)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-3"
              >
                ❌
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentConfirmation;