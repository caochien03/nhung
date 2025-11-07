import React, { useState, useEffect } from "react";
import { parkingAPI } from "../../services/api";
import { ParkingRecord } from "../../types";

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
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [licensePlate, setLicensePlate] = useState("");
    const [action, setAction] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalRecords, setTotalRecords] = useState(0);
    const [summary, setSummary] = useState<SummaryData>({
        totalEntries: 0,
        totalExits: 0,
    });
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [selectedImage, setSelectedImage] = useState<{
        url: string;
        title: string;
    } | null>(null);

    // Group records theo RFID để kết hợp entry và exit
    const groupRecordsByRFID = (records: any[]) => {
        const groupedMap = new Map();

        records.forEach((record) => {
            const rfid = record.rfid;

            if (groupedMap.has(rfid)) {
                // Đã có record với RFID này, merge data
                const existing = groupedMap.get(rfid);

                // Kết hợp dữ liệu từ 2 records
                const merged = {
                    ...existing,
                    ...record,
                    // Giữ cả 2 ảnh nếu có
                    entryImage: existing.entryImage || record.entryImage,
                    exitImage: existing.exitImage || record.exitImage,
                    // Giữ cả 2 thời gian
                    timeIn: existing.timeIn || record.timeIn,
                    timeOut: existing.timeOut || record.timeOut,
                    // Ưu tiên trạng thái completed
                    status:
                        record.status === "completed"
                            ? "completed"
                            : existing.status,
                };

                groupedMap.set(rfid, merged);
            } else {
                // Record đầu tiên với RFID này
                groupedMap.set(rfid, record);
            }
        });

        return Array.from(groupedMap.values());
    };

    // Fetch data theo ngày
    const fetchDailyHistory = async (date = selectedDate, page = 1) => {
        try {
            setLoading(true);
            const params = {
                date,
                page,
                limit: pageSize,
                ...(licensePlate && { licensePlate }),
                ...(action && { action }),
            };

            const response = await parkingAPI.getParkingHistoryWithImages(
                params
            );

            if (response.success && response.data && response.data.records) {
                // ✅ Backend trả về records tách riêng theo action (in/out)
                setData(response.data.records);
                setTotalRecords(response.data.pagination.total);

                // Set summary từ raw data (backend format)
                setSummary({
                    totalEntries: response.data.records.filter(
                        (r) => r.action === "in"
                    ).length,
                    totalExits: response.data.records.filter(
                        (r) => r.action === "out"
                    ).length,
                    date: selectedDate,
                });
                setCurrentPage(page);
            }
        } catch (error) {
            // Error fetching daily history
        } finally {
            setLoading(false);
        }
    };

    // Fetch data theo khoảng thời gian
    const fetchRangeHistory = async (
        startDate: string,
        endDate: string,
        page = 1
    ) => {
        try {
            setLoading(true);
            const params = {
                startDate,
                endDate,
                page,
                limit: pageSize,
                ...(licensePlate && { licensePlate }),
                ...(action && { action }),
            };

            const response = await parkingAPI.getParkingHistoryRange(params);

            if (response.success && response.data && response.data.records) {
                // ✅ Backend trả về records tách riêng theo action (in/out)
                setData(response.data.records);
                setTotalRecords(response.data.pagination.total);

                // Set summary từ raw data (backend format)
                setSummary({
                    totalEntries: response.data.records.filter(
                        (r) => r.action === "in"
                    ).length,
                    totalExits: response.data.records.filter(
                        (r) => r.action === "out"
                    ).length,
                    startDate,
                    endDate,
                });
                setCurrentPage(page);
            }
        } catch (error) {
            // Error fetching range history
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
        setStartDate("");
        setEndDate("");
        fetchDailyHistory(date, 1);
    };

    // Xử lý thay đổi khoảng thời gian
    const handleRangeSearch = () => {
        if (startDate && endDate) {
            setSelectedDate("");
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

    // Validate ObjectId
    const isValidObjectId = (id: string): boolean => {
        return /^[0-9a-fA-F]{24}$/.test(id);
    };

    // Xem chi tiết record
    const viewRecordDetail = async (recordId: string) => {
        try {
            // Loại bỏ các ký tự không hợp lệ khỏi ID (như _in, _out)
            const cleanedId = recordId.replace(/_in$|_out$/, "");

            // Validate ObjectId format
            if (!isValidObjectId(cleanedId)) {
                alert("ID không hợp lệ. Không thể tải chi tiết bản ghi.");
                return;
            }

            const response = await parkingAPI.getParkingRecordWithImages(
                cleanedId
            );
            if (response.success) {
                setSelectedRecord(response.data);
            }
        } catch (error) {
            // Hiển thị thông báo lỗi cho user
            alert("Không thể tải chi tiết bản ghi. Vui lòng thử lại.");
        }
    };

    // Format thời gian
    const formatTime = (
        timestamp: string | Date | { $date: string } | null | undefined
    ) => {
        if (!timestamp) return "-";

        let date: Date;
        if (typeof timestamp === "string") {
            date = new Date(timestamp);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else if (
            timestamp &&
            typeof timestamp === "object" &&
            "$date" in timestamp
        ) {
            date = new Date(timestamp.$date);
        } else {
            return "-";
        }

        if (isNaN(date.getTime())) return "-";

        return date.toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    // Tính thời gian đỗ
    const calculateDuration = (
        timeIn: string | Date | { $date: string } | null | undefined,
        timeOut?: string | Date | { $date: string } | null | undefined
    ) => {
        if (!timeIn) return "-";

        let startTime: Date;
        let endTime: Date;

        // Parse timeIn
        if (typeof timeIn === "string") {
            startTime = new Date(timeIn);
        } else if (timeIn instanceof Date) {
            startTime = timeIn;
        } else if (timeIn && typeof timeIn === "object" && "$date" in timeIn) {
            startTime = new Date(timeIn.$date);
        } else {
            return "-";
        }

        if (isNaN(startTime.getTime())) return "-";

        // Parse timeOut hoặc sử dụng thời gian hiện tại
        if (timeOut) {
            if (typeof timeOut === "string") {
                endTime = new Date(timeOut);
            } else if (timeOut instanceof Date) {
                endTime = timeOut;
            } else if (
                timeOut &&
                typeof timeOut === "object" &&
                "$date" in timeOut
            ) {
                endTime = new Date(timeOut.$date);
            } else {
                endTime = new Date();
            }
        } else {
            endTime = new Date(); // Nếu chưa ra, tính từ bây giờ
        }

        if (isNaN(endTime.getTime())) return "-";

        const diffMs = endTime.getTime() - startTime.getTime();
        if (diffMs < 0) return "-";

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
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
                            <div className="text-sm text-gray-500">
                                Tổng xe vào
                            </div>
                            <div className="text-2xl font-bold text-green-600">
                                {summary.totalEntries}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                            <div className="text-sm text-gray-500">
                                Tổng xe ra
                            </div>
                            <div className="text-2xl font-bold text-red-600">
                                {summary.totalExits}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                            <div className="text-sm text-gray-500">
                                Ngày xem
                            </div>
                            <div className="text-xl font-semibold text-gray-900">
                                {summary.date ||
                                    (startDate && endDate
                                        ? `${startDate} - ${endDate}`
                                        : selectedDate)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bộ lọc */}
                <div className="p-6 border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ngày đơn
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) =>
                                    handleDateChange(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                disabled={!!(startDate || endDate)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Từ ngày
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                max={new Date().toISOString().split("T")[0]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Đến ngày
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                max={new Date().toISOString().split("T")[0]}
                                min={startDate}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hành động
                            </label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Biển số xe
                            </label>
                            <div className="flex">
                                <input
                                    type="text"
                                    placeholder="Tìm biển số xe"
                                    value={licensePlate}
                                    onChange={(e) =>
                                        setLicensePlate(e.target.value)
                                    }
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
                                    Thời gian vào/ra
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trạng thái
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
                                    <td
                                        colSpan={10}
                                        className="px-6 py-12 text-center"
                                    >
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="ml-2 text-gray-500">
                                                Đang tải...
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : !data || data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        Không có dữ liệu
                                    </td>
                                </tr>
                            ) : (
                                data &&
                                data.map((record) => (
                                    <tr
                                        key={record._id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div>
                                                {record.action === "in" && (
                                                    <div className="font-medium text-green-600">
                                                        📥 Vào:{" "}
                                                        {formatTime(
                                                            record.timestamp
                                                        )}
                                                    </div>
                                                )}
                                                {record.action === "out" && (
                                                    <div className="text-red-600">
                                                        📤 Ra:{" "}
                                                        {formatTime(
                                                            record.timestamp
                                                        )}
                                                    </div>
                                                )}
                                                {/* Fallback cho old format */}
                                                {!record.action &&
                                                    record.timeIn && (
                                                        <div className="font-medium text-green-600">
                                                            📥 Vào:{" "}
                                                            {formatTime(
                                                                record.timeIn
                                                            )}
                                                        </div>
                                                    )}
                                                {!record.action &&
                                                    record.timeOut && (
                                                        <div className="text-red-600 mt-1">
                                                            📤 Ra:{" "}
                                                            {formatTime(
                                                                record.timeOut
                                                            )}
                                                        </div>
                                                    )}
                                                {!record.action &&
                                                    !record.timeOut &&
                                                    record.status ===
                                                        "active" && (
                                                        <div className="text-blue-600 mt-1">
                                                            🚗 Đang đỗ
                                                        </div>
                                                    )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    record.status === "active"
                                                        ? "bg-green-100 text-green-800"
                                                        : record.status ===
                                                          "completed"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-red-100 text-red-800"
                                                }`}
                                            >
                                                {record.status === "active"
                                                    ? "Đang đỗ"
                                                    : record.status ===
                                                      "completed"
                                                    ? "Hoàn thành"
                                                    : "Đã ra"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.rfid}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.licensePlate ||
                                                "Không xác định"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex space-x-2">
                                                {/* Kiểm tra entryImage */}
                                                {(record as any).entryImage
                                                    ?.url && (
                                                    <div className="relative">
                                                        <img
                                                            src={
                                                                (record as any)
                                                                    .entryImage
                                                                    .url
                                                            }
                                                            alt="Xe vào"
                                                            className="h-12 w-16 object-cover rounded cursor-pointer border-2 border-green-200 hover:border-green-400"
                                                            onClick={() =>
                                                                setSelectedImage(
                                                                    {
                                                                        url: (
                                                                            record as any
                                                                        )
                                                                            .entryImage!
                                                                            .url,
                                                                        title: `Xe vào - ${
                                                                            record.licensePlate ||
                                                                            "Không xác định"
                                                                        } - ${formatTime(
                                                                            record.timeIn
                                                                        )}`,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">
                                                            Vào
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Kiểm tra exitImage */}
                                                {(record as any).exitImage
                                                    ?.url && (
                                                    <div className="relative">
                                                        <img
                                                            src={
                                                                (record as any)
                                                                    .exitImage
                                                                    .url
                                                            }
                                                            alt="Xe ra"
                                                            className="h-12 w-16 object-cover rounded cursor-pointer border-2 border-red-200 hover:border-red-400"
                                                            onClick={() =>
                                                                setSelectedImage(
                                                                    {
                                                                        url: (
                                                                            record as any
                                                                        )
                                                                            .exitImage!
                                                                            .url,
                                                                        title: `Xe ra - ${
                                                                            record.licensePlate ||
                                                                            "Không xác định"
                                                                        } - ${
                                                                            record.timeOut
                                                                                ? formatTime(
                                                                                      record.timeOut
                                                                                  )
                                                                                : ""
                                                                        }`,
                                                                    }
                                                                )
                                                            }
                                                        />
                                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded">
                                                            Ra
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Fallback: Kiểm tra field image chung */}
                                                {!(record as any).entryImage
                                                    ?.url &&
                                                    !(record as any).exitImage
                                                        ?.url &&
                                                    (record as any).image
                                                        ?.url && (
                                                        <div className="relative">
                                                            <img
                                                                src={
                                                                    (
                                                                        record as any
                                                                    ).image.url
                                                                }
                                                                alt="Hình ảnh"
                                                                className="h-12 w-16 object-cover rounded cursor-pointer border-2 border-blue-200 hover:border-blue-400"
                                                                onClick={() =>
                                                                    setSelectedImage(
                                                                        {
                                                                            url: (
                                                                                record as any
                                                                            )
                                                                                .image!
                                                                                .url,
                                                                            title: `Hình ảnh - ${
                                                                                record.licensePlate ||
                                                                                "Không xác định"
                                                                            }`,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded">
                                                                Img
                                                            </span>
                                                        </div>
                                                    )}

                                                {/* Không có ảnh */}
                                                {!(record as any).entryImage
                                                    ?.url &&
                                                    !(record as any).exitImage
                                                        ?.url &&
                                                    !(record as any).image
                                                        ?.url && (
                                                        <span className="text-gray-400 text-sm">
                                                            Không có ảnh
                                                        </span>
                                                    )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            Camera {record.cameraIndex}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    record.isRegisteredUser
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-gray-100 text-gray-800"
                                                }`}
                                            >
                                                {record.isRegisteredUser
                                                    ? "Đã đăng ký"
                                                    : "Khách lẻ"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.status === "completed" &&
                                            record.fee
                                                ? `${record.fee.toLocaleString(
                                                      "vi-VN"
                                                  )} VNĐ`
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.action === "out" &&
                                            record.duration
                                                ? record.durationFormatted ||
                                                  record.duration
                                                : record.action === "in"
                                                ? "🚗 Đang đỗ"
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => {
                                                    viewRecordDetail(
                                                        record._id ||
                                                            (record as any)
                                                                .id ||
                                                            ""
                                                    );
                                                }}
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
                                Hiển thị {(currentPage - 1) * pageSize + 1} đến{" "}
                                {Math.min(currentPage * pageSize, totalRecords)}{" "}
                                của {totalRecords} bản ghi
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() =>
                                        handlePageChange(currentPage - 1)
                                    }
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Trước
                                </button>
                                <button
                                    onClick={() =>
                                        handlePageChange(currentPage + 1)
                                    }
                                    disabled={
                                        currentPage * pageSize >= totalRecords
                                    }
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
                            <h3 className="text-lg font-semibold">
                                {selectedImage.title}
                            </h3>
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
                            <h3 className="text-xl font-semibold">
                                Chi tiết bản ghi đỗ xe
                            </h3>
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
                                        <h4 className="font-semibold text-gray-900 mb-3">
                                            Thông tin cơ bản
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <strong>RFID:</strong>{" "}
                                                {selectedRecord.rfid}
                                            </div>
                                            <div>
                                                <strong>Biển số:</strong>{" "}
                                                {selectedRecord.licensePlate ||
                                                    "Không xác định"}
                                            </div>
                                            <div>
                                                <strong>Thời gian vào:</strong>{" "}
                                                {selectedRecord.timeIn
                                                    ? formatTime(
                                                          selectedRecord.timeIn
                                                      )
                                                    : "-"}
                                            </div>
                                            <div>
                                                <strong>Thời gian ra:</strong>{" "}
                                                {selectedRecord.timeOut
                                                    ? formatTime(
                                                          selectedRecord.timeOut
                                                      )
                                                    : "Chưa ra"}
                                            </div>
                                            <div>
                                                <strong>Thời gian đỗ:</strong>{" "}
                                                {selectedRecord.durationFormatted ||
                                                    (selectedRecord.action ===
                                                    "out"
                                                        ? selectedRecord.duration
                                                        : "🚗 Đang đỗ") ||
                                                    "-"}
                                            </div>
                                            <div>
                                                <strong>Phí:</strong>{" "}
                                                {selectedRecord.fee
                                                    ? `${selectedRecord.fee.toLocaleString(
                                                          "vi-VN"
                                                      )} VNĐ`
                                                    : "Miễn phí"}
                                            </div>
                                            <div>
                                                <strong>Trạng thái:</strong>
                                                <span
                                                    className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        selectedRecord.status ===
                                                        "active"
                                                            ? "bg-green-100 text-green-800"
                                                            : selectedRecord.status ===
                                                              "completed"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-red-100 text-red-800"
                                                    }`}
                                                >
                                                    {selectedRecord.status ===
                                                    "active"
                                                        ? "Đang đỗ"
                                                        : selectedRecord.status ===
                                                          "completed"
                                                        ? "Hoàn thành"
                                                        : "Đã ra"}
                                                </span>
                                            </div>
                                            <div>
                                                <strong>Camera:</strong> Camera{" "}
                                                {selectedRecord.cameraIndex}
                                            </div>
                                            <div>
                                                <strong>Loại user:</strong>
                                                <span
                                                    className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        selectedRecord.isRegisteredUser
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-gray-100 text-gray-800"
                                                    }`}
                                                >
                                                    {selectedRecord.isRegisteredUser
                                                        ? "Đã đăng ký"
                                                        : "Khách lẻ"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-900 mb-3">
                                            Hình ảnh
                                        </h4>
                                        <div className="space-y-4">
                                            {selectedRecord.entryImage && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">
                                                            📥 Xe vào
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatTime(
                                                                selectedRecord.timeIn
                                                            )}
                                                        </span>
                                                    </div>
                                                    <img
                                                        src={
                                                            selectedRecord
                                                                .entryImage.url
                                                        }
                                                        alt="Xe vào"
                                                        className="w-full h-40 object-cover rounded border cursor-pointer hover:shadow-lg transition-shadow"
                                                        onClick={() =>
                                                            setSelectedImage({
                                                                url: selectedRecord.entryImage!
                                                                    .url,
                                                                title: `Xe vào - ${
                                                                    selectedRecord.licensePlate ||
                                                                    "Không xác định"
                                                                } - ${formatTime(
                                                                    selectedRecord.timeIn
                                                                )}`,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            )}

                                            {selectedRecord.exitImage && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs mr-2">
                                                            📤 Xe ra
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {selectedRecord.timeOut
                                                                ? formatTime(
                                                                      selectedRecord.timeOut
                                                                  )
                                                                : "Chưa xác định"}
                                                        </span>
                                                    </div>
                                                    <img
                                                        src={
                                                            selectedRecord
                                                                .exitImage.url
                                                        }
                                                        alt="Xe ra"
                                                        className="w-full h-40 object-cover rounded border cursor-pointer hover:shadow-lg transition-shadow"
                                                        onClick={() =>
                                                            setSelectedImage({
                                                                url: selectedRecord.exitImage!
                                                                    .url,
                                                                title: `Xe ra - ${
                                                                    selectedRecord.licensePlate ||
                                                                    "Không xác định"
                                                                } - ${
                                                                    selectedRecord.timeOut
                                                                        ? formatTime(
                                                                              selectedRecord.timeOut
                                                                          )
                                                                        : ""
                                                                }`,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            )}

                                            {!selectedRecord.entryImage &&
                                                !selectedRecord.exitImage && (
                                                    <div className="text-center text-gray-500 py-8">
                                                        <div className="text-4xl mb-2">
                                                            📷
                                                        </div>
                                                        <div>
                                                            Không có hình ảnh
                                                        </div>
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
