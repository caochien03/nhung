import React, { useState, useEffect } from 'react';
import { esp32API, parkingAPI } from '../../services/api';

const PaymentDebugger: React.FC = () => {
  const [recordId, setRecordId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    try {
      const response = await parkingAPI.getPendingPayments();
      if (response.success && response.data) {
        setPendingPayments(response.data);
        // Auto-fill first pending payment ID
        if (response.data.length > 0) {
          setRecordId(response.data[0]._id || response.data[0].id || '');
        }
      }
    } catch (error) {
      console.error('Error loading pending payments:', error);
    }
  };

  const testConfirmPayment = async () => {
    if (!recordId.trim()) {
      alert('Vui lòng nhập Record ID');
      return;
    }

    setLoading(true);
    try {
      console.log('Testing confirmPayment API...');
      const response = await esp32API.confirmPayment({
        recordId: recordId.trim(),
        paymentMethod: 'cash',
        confirmedBy: 'staff'
      });
      
      console.log('Test Response:', response);
      setResult(response);
    } catch (error: any) {
      console.error('Test Error:', error);
      setResult({
        error: true,
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-4">Payment API Debugger</h3>
      
      <div className="space-y-4">
        {/* Pending payments list */}
        {pendingPayments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pending Payments ({pendingPayments.length}):
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {pendingPayments.map((payment) => (
                <button
                  key={payment._id || payment.id}
                  onClick={() => setRecordId(payment._id || payment.id || '')}
                  className="w-full text-left p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  {payment.licensePlate} - {payment.fee?.toLocaleString()} VND
                  <br />
                  <span className="text-gray-500">ID: {(payment._id || payment.id || '').slice(-8)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Record ID:
          </label>
          <input
            type="text"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập parking record ID..."
          />
        </div>
        
        <button
          onClick={testConfirmPayment}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-2 px-4 rounded-md font-medium"
        >
          {loading ? 'Testing...' : 'Test Confirm Payment API'}
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">API Result:</h4>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDebugger;
