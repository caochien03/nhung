import React, { useState, useEffect } from 'react';
import { parkingAPI } from '../../services/api';
import { ParkingRecord } from '../../types';

interface ImageData {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
}

interface PaginationData {
  current: number;
  pageSize: number;
  total: number;
}

interface SummaryData {
  date?: string;
  startDate?: string;
  endDate?: string;
  totalEntries: number;
  totalExits: number;
  dailyStats?: any;
}

const ParkingHistoryWithImages: React.FC = () => {
  const [data, setData] = useState<ParkingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [action, setAction] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summary, setSummary] = useState<SummaryData>({
    totalEntries: 0,
    totalExits: 0
  });
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  // Fetch data theo ngày
  const fetchDailyHistory = async (date = selectedDate, page = 1) => {
    try {
      setLoading(true);
      const params = {
        date,
        page,
        limit: pageSize,
        ...(licensePlate && { licensePlate }),
        ...(action && { action })
      };

      const response = await parkingAPI.getParkingHistoryWithImages(params);
      
      if (response.success && response.data && response.data.records) {
        setData(response.data.records);
        setTotalRecords(response.data.pagination.total);
        // Set summary từ data
        setSummary({
          totalEntries: response.data.records.filter(r => r.timeIn).length,
          totalExits: response.data.records.filter(r => r.timeOut).length,
          date: selectedDate
        });
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching daily history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data theo khoảng thời gian
  const fetchRangeHistory = async (startDate: string, endDate: string, page = 1) => {
    try {
      setLoading(true);
      const params = {
        startDate,
        endDate,
        page,
        limit: pageSize,
        ...(licensePlate && { licensePlate }),
        ...(action && { action })
      };

      const response = await parkingAPI.getParkingHistoryRange(params);
      
      if (response.success && response.data && response.data.records) {
        setData(response.data.records);
        setTotalRecords(response.data.pagination.total);
        // Set summary từ data
        setSummary({
          totalEntries: response.data.records.filter(r => r.timeIn).length,
          totalExits: response.data.records.filter(r => r.timeOut).length,
          startDate,
          endDate
        });
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching range history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data ban đầu
  useEffect(() => {
    fetchDailyHistory();
  }, []);

  // Xử lý thay đổi ngày
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setStartDate('');
    setEndDate('');
    fetchDailyHistory(date, 1);
  };

  // Xử lý thay đổi khoảng thời gian
  const handleRangeSearch = () => {
    if (startDate && endDate) {
      setSelectedDate('');
      fetchRangeHistory(startDate, endDate, 1);
    } else if (selectedDate) {
      fetchDailyHistory(selectedDate, 1);
    }
  };

  // Xử lý tìm kiếm
  const handleSearch = () => {
    if (startDate && endDate) {
      fetchRangeHistory(startDate, endDate, 1);
    } else {
      fetchDailyHistory(selectedDate, 1);
    }
  };

  // Xử lý thay đổi trang
  const handlePageChange = (page: number) => {
    if (startDate && endDate) {
      fetchRangeHistory(startDate, endDate, page);
    } else {
      fetchDailyHistory(selectedDate, page);
    }
  };

  // Xem chi tiết record
  const viewRecordDetail = async (recordId: string) => {
    try {
      const response = await parkingAPI.getParkingRecordWithImages(recordId);
      if (response.success) {
        setSelectedRecord(response.data);
      }
    } catch (error) {
      console.error('Error loading record detail:', error);
    }
  };

  // Format thời gian
  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="mr-2">🚗</span>
            Lịch sử xe vào/ra có hình ảnh
          </h2>
        </div>

        {/* Thống kê tổng quan */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Tổng xe vào</div>
              <div className="text-2xl font-bold text-green-600">{summary.totalEntries}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Tổng xe ra</div>
              <div className="text-2xl font-bold text-red-600">{summary.totalExits}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Ngày xem</div>
              <div className="text-xl font-semibold text-gray-900">
                {summary.date || (startDate && endDate ? `${startDate} - ${endDate}` : selectedDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Bộ lọc */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày đơn</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!!(startDate || endDate)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                max={new Date().toISOString().split('T')[0]}
                min={startDate}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hành động</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="in">Xe vào</option>
                <option value="out">Xe ra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biển số xe</label>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Tìm biển số xe"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  🔍
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RFID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biển số
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hình ảnh
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Camera
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại user
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phí
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian đỗ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-500">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                data && data.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.timeIn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status === 'active' ? 'Đang đỗ' : 'Đã ra'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.rfid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.licensePlate || 'Không xác định'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(record as any).image?.url ? (
                        <img
                          src={(record as any).image.url}
                          alt={(record as any).action === 'in' ? 'Entry' : 'Exit'}
                          className="h-12 w-20 object-cover rounded cursor-pointer border"
                          onClick={() => setSelectedImage({ 
                            url: (record as any).image!.url, 
                            title: `${(record as any).action === 'in' ? 'Xe vào' : 'Xe ra'} - ${record.licensePlate || 'Không xác định'}` 
                          })}
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">Không có ảnh</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Camera {record.cameraIndex}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.isRegisteredUser 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.isRegisteredUser ? 'Đã đăng ký' : 'Khách lẻ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.status === 'completed' && record.fee ? 
                        `${record.fee.toLocaleString('vi-VN')} VNĐ` : 
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.status === 'completed' && record.currentDuration ? 
                        record.currentDuration : 
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => viewRecordDetail(record._id || record.id!)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        👁️ Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalRecords > pageSize && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Hiển thị {((currentPage - 1) * pageSize) + 1} đến {Math.min(currentPage * pageSize, totalRecords)} của {totalRecords} bản ghi
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage * pageSize >= totalRecords}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal xem ảnh phóng to */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{selectedImage.title}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết record */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold">Chi tiết bản ghi đỗ xe</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Thông tin cơ bản</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>RFID:</strong> {selectedRecord.rfid}</div>
                      <div><strong>Biển số:</strong> {selectedRecord.licensePlate || 'Không xác định'}</div>
                      <div><strong>Thời gian vào:</strong> {selectedRecord.timeIn ? formatTime(selectedRecord.timeIn) : '-'}</div>
                      <div><strong>Thời gian ra:</strong> {selectedRecord.timeOut ? formatTime(selectedRecord.timeOut) : '-'}</div>
                      <div><strong>Thời gian đỗ:</strong> {selectedRecord.durationFormatted || '-'}</div>
                      <div><strong>Phí:</strong> {selectedRecord.fee ? `${selectedRecord.fee.toLocaleString('vi-VN')} VNĐ` : '-'}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Hình ảnh</h4>
                    <div className="space-y-4">
                      {selectedRecord.entryImage && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Xe vào:</div>
                          <img
                            src={selectedRecord.entryImage.url}
                            alt="Xe vào"
                            className="w-full h-32 object-cover rounded border cursor-pointer"
                            onClick={() => setSelectedImage({ 
                              url: selectedRecord.entryImage!.url, 
                              title: 'Xe vào - ' + (selectedRecord.licensePlate || 'Không xác định')
                            })}
                          />
                        </div>
                      )}
                      {selectedRecord.exitImage && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Xe ra:</div>
                          <img
                            src={selectedRecord.exitImage.url}
                            alt="Xe ra"
                            className="w-full h-32 object-cover rounded border cursor-pointer"
                            onClick={() => setSelectedImage({ 
                              url: selectedRecord.exitImage!.url, 
                              title: 'Xe ra - ' + (selectedRecord.licensePlate || 'Không xác định')
                            })}
                          />
                        </div>
                      )}
                      {!selectedRecord.entryImage && !selectedRecord.exitImage && (
                        <div className="text-center text-gray-500 py-8">
                          Không có hình ảnh
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingHistoryWithImages;
