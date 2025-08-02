import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Camera, Play, Pause, RotateCcw, AlertCircle } from "lucide-react";

interface CameraMonitorProps {
  cameraIndex: number; // Device index để chọn webcam vật lý (0, 1, 2...)
  logicIndex?: number; // Logic index cho ESP32/backend matching (1=VÀO, 2=RA)
  title: string;
  onPlateDetected?: (plateData: any) => void;
}

const CameraMonitor = forwardRef<any, CameraMonitorProps>(({ cameraIndex, logicIndex, title, onPlateDetected }, ref) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<"online" | "offline" | "error">("offline");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string>("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<MediaDeviceInfo | null>(null);
  const [licensePlate, setLicensePlate] = useState("[Biển số]");
  const [isLoading, setIsLoading] = useState(false);
  
  // Thêm debouncing cho auto capture
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  const CAPTURE_COOLDOWN = 3000; // 3 giây cooldown
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Key để lưu camera setting trong localStorage
  const CAMERA_STORAGE_KEY = `selectedCamera_${cameraIndex}_${logicIndex || cameraIndex}_${title.replace(/\s+/g, '_')}`;

  // Hàm lưu camera đã chọn vào localStorage
  const saveSelectedCamera = (camera: MediaDeviceInfo | null) => {
    if (camera) {
      const cameraData = {
        deviceId: camera.deviceId,
        label: camera.label,
        kind: camera.kind,
        cameraIndex: cameraIndex, // Thêm cameraIndex để phân biệt
        logicIndex: logicIndex || cameraIndex,
        title: title // Thêm title để phân biệt
      };
      localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(cameraData));
      console.log(`💾 [${title}] Đã lưu camera với key "${CAMERA_STORAGE_KEY}":`, camera.label);
    } else {
      localStorage.removeItem(CAMERA_STORAGE_KEY);
      console.log(`🗑️ [${title}] Đã xóa camera setting với key "${CAMERA_STORAGE_KEY}"`);
    }
  };

  // Hàm khôi phục camera đã chọn từ localStorage
  const loadSelectedCamera = (availableCameras: MediaDeviceInfo[]) => {
    try {
      const saved = localStorage.getItem(CAMERA_STORAGE_KEY);
      console.log(`🔍 [${title}] Đang tìm camera đã lưu với key "${CAMERA_STORAGE_KEY}":`, saved ? "Có" : "Không");
      
      if (saved) {
        const cameraData = JSON.parse(saved);
        
        // Với camera trùng tên/ID, ưu tiên theo thứ tự deviceId trước, sau đó theo cameraIndex
        let foundCamera = availableCameras.find(cam => cam.deviceId === cameraData.deviceId);
        
        // Nếu không tìm thấy exact deviceId, tìm theo cameraIndex và label
        if (!foundCamera && cameraData.cameraIndex !== undefined) {
          console.log(`⚠️ [${title}] DeviceId không khớp, thử tìm theo cameraIndex[${cameraData.cameraIndex}]`);
          foundCamera = availableCameras[cameraData.cameraIndex];
          
          // Kiểm tra xem camera tại vị trí cameraIndex có cùng label không
          if (foundCamera && foundCamera.label !== cameraData.label) {
            console.log(`⚠️ [${title}] Camera tại index[${cameraData.cameraIndex}] có label khác: "${foundCamera.label}" vs "${cameraData.label}"`);
          }
        }
        
        if (foundCamera) {
          console.log(`🔄 [${title}] Đã khôi phục camera:`, foundCamera.label, `(DeviceID: ${foundCamera.deviceId})`);
          return foundCamera;
        } else {
          console.log(`⚠️ [${title}] Camera đã lưu không tìm thấy, sẽ chọn camera mặc định`);
        }
      }
    } catch (err) {
      console.error(`❌ [${title}] Lỗi khi khôi phục camera đã lưu:`, err);
    }
    return null;
  };

        // Liệt kê tất cả camera
  useEffect(() => {
    const listCameras = async () => {
      try {
        setError("");
        // Yêu cầu quyền truy cập trước để có thể lấy label
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === "videoinput");
        setCameras(videoDevices);

        // Khôi phục camera đã lưu trước, nếu không có thì chọn theo index
        const savedCamera = loadSelectedCamera(videoDevices);
        if (savedCamera) {
          setSelectedCamera(savedCamera);
        } else if (videoDevices[cameraIndex]) {
          const defaultCamera = videoDevices[cameraIndex];
          console.log(`🎯 [${title}] Chọn camera mặc định theo cameraIndex[${cameraIndex}]:`, defaultCamera.label);
          setSelectedCamera(defaultCamera);
          saveSelectedCamera(defaultCamera); // Lưu camera mặc định
        } else if (videoDevices.length > 0) {
          const firstCamera = videoDevices[0];
          console.log(`🎯 [${title}] Chọn camera đầu tiên làm fallback:`, firstCamera.label);
          setSelectedCamera(firstCamera);
          saveSelectedCamera(firstCamera); // Lưu camera đầu tiên
        } else {
          console.log(`❌ [${title}] Không tìm thấy camera nào`);
        }
      } catch (err) {
        console.error("Lỗi khi liệt kê camera:", err);
        setError("Không thể liệt kê camera - Vui lòng cho phép quyền truy cập camera");
        setStatus("error");
      }
    };

    listCameras();
  }, [cameraIndex]);

  // Khởi động camera tự động (giống CameraView.jsx)
  useEffect(() => {
    if (!selectedCamera) return;

    const startCamera = async () => {
      try {
        setError("");
        setStatus("offline");

        // Dừng stream cũ nếu có
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedCamera.deviceId },
          },
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
          setStatus("online");
          setLastUpdate(new Date());
          console.log(`✅ Camera ${title} đã bắt đầu streaming:`, selectedCamera.label);
        }
      } catch (err: any) {
        console.error("Lỗi khi truy cập camera:", err);
        setError(`Không thể truy cập camera: ${selectedCamera.label || `Camera ${cameraIndex}`}`);
        setStatus("error");
        setIsStreaming(false);
      }
    };

    // Tự động bắt đầu camera ngay khi đã có selectedCamera
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedCamera, cameraIndex, title]);

  const handleCameraChange = (deviceId: string) => {
    const camera = cameras.find(cam => cam.deviceId === deviceId);
    if (camera) {
      console.log(`📹 [${title}] User đã chọn camera mới:`, camera.label);
      setSelectedCamera(camera);
      saveSelectedCamera(camera); // Lưu camera mới chọn
    }
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      // Chuyển ảnh thành base64 và gửi lên backend
      const imageData = canvas.toDataURL("image/jpeg");
      await sendToBackend(imageData);
    }
  };

  // Hàm tự động chụp ảnh khi nhận signal WebSocket
  const autoCaptureFromWS = async (uid: string, cameraIdx: number) => {
    const targetIndex = logicIndex || cameraIndex; // Sử dụng logicIndex nếu có, nếu không dùng cameraIndex
    console.log(`🎯 CameraMonitor[device:${cameraIndex}, logic:${logicIndex}] nhận auto capture:`, {uid, cameraIdx, targetIndex});
    
    if (cameraIdx !== targetIndex) {
      console.log(`❌ Camera index không khớp: ${cameraIdx} !== ${targetIndex}`);
      return; // Chỉ xử lý nếu đúng camera
    }

    // Debouncing: Kiểm tra thời gian capture gần nhất
    const now = Date.now();
    if (isProcessing || (now - lastCaptureTime) < CAPTURE_COOLDOWN) {
      console.log(`⏳ Đang xử lý hoặc trong cooldown period. Last capture: ${now - lastCaptureTime}ms ago`);
      return;
    }

    if (!videoRef.current) {
      console.log("❌ Video ref không tồn tại");
      return;
    }
    
    if (!canvasRef.current) {
      console.log("❌ Canvas ref không tồn tại");  
      return;
    }
    
    if (!isStreaming) {
      console.log("❌ Camera chưa streaming");
      return;
    }

    console.log("✅ Bắt đầu auto capture...");
    setIsProcessing(true);
    setLastCaptureTime(now);
    
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        console.log("❌ Không lấy được canvas context");
        return;
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg");
      
      console.log("📸 Ảnh đã capture, gửi lên backend...");
      
      setIsLoading(true);
      try {
        // Gửi ảnh + UID lên backend
        const response = await fetch("http://localhost:8080/api/esp32/auto-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            cameraIndex: cameraIdx,
            imageData,
          }),
        });
        const result = await response.json();

        // Xử lý các loại response khác nhau
        let displayText = "";
        let callbackData: any = null;

        if (result.action === "OUT_SECURITY_ALERT") {
          displayText = `🚨 CẢNH BÁO: Biển số không khớp!\nVào: ${result.entryPlate}\nRa: ${result.exitPlate}\nĐộ giống: ${result.similarity}`;
          callbackData = {
            licensePlate: result.exitPlate,
            status: "🚨 CẢNH BÁO: Biển số không khớp!",
            details: `Vào: ${result.entryPlate} | Ra: ${result.exitPlate} | Độ giống: ${result.similarity}`,
            parkingDuration: null,
            fee: null,
          };
        } else if (result.action === "OUT") {
          displayText = `✅ Xe ra thành công!\nBiển số: ${result.exitPlate}\nThời gian đỗ: ${result.parkingDuration}`;
          if (result.subscriptionUsed) {
            displayText += `\nVé tháng: MIỄN PHÍ\nPhí gốc: ${result.originalFee}`;
          } else {
            displayText += `\nTính phí theo: ${result.billingHours}\nPhí: ${result.fee}`;
          }
          
          callbackData = {
            licensePlate: result.exitPlate,
            status: result.subscriptionUsed ? "✅ Xe ra - MIỄN PHÍ (Vé tháng)!" : "✅ Xe ra thành công!",
            details: result.subscriptionUsed 
              ? `Phí gốc: ${result.originalFee} | Tiết kiệm: ${result.subscriptionDiscount}`
              : `Tính phí theo: ${result.billingHours}`,
            parkingDuration: result.parkingDuration,
            fee: result.fee,
            subscriptionUsed: result.subscriptionUsed,
          };
        } else if (result.action === "OUT_PAYMENT_REQUIRED") {
          displayText = `💰 CẦN THANH TOÁN!\nBiển số: ${result.exitPlate}\nThời gian đỗ: ${result.parkingDuration}\nPhí: ${result.fee}\n➡️ Vui lòng thanh toán tại quầy`;
          
          callbackData = {
            licensePlate: result.exitPlate,
            status: "💰 CẦN THANH TOÁN!",
            details: `Phí: ${result.fee} | Thời gian: ${result.parkingDuration}`,
            parkingDuration: result.parkingDuration,
            fee: result.fee,
            requiresStaffConfirmation: true,
            parkingRecordId: result.parkingRecordId,
          };
        } else if (result.action === "OUT_ERROR") {
          displayText = `❌ Lỗi: ${result.error}\nBiển số: ${result.licensePlate || "Không nhận diện được"}`;
          callbackData = {
            licensePlate: result.licensePlate || "Không nhận diện được",
            status: "❌ Lỗi: " + result.error,
            details: null,
            parkingDuration: null,
            fee: null,
          };
        } else if (result.action === "IN") {
          displayText = `✅ Xe vào thành công!\nBiển số: ${result.licensePlate}`;
          if (result.subscriptionUsed) {
            displayText += `\nVé tháng: SỬ DỤNG\nCổng mở tự động: ✅`;
          } else {
            displayText += `\nTính phí: Theo giờ`;
          }
          
          callbackData = {
            licensePlate: result.licensePlate,
            status: result.subscriptionUsed ? "✅ Xe vào - VÉ THÁNG!" : "✅ Xe vào thành công!",
            details: result.subscriptionUsed 
              ? "Cổng mở tự động | Không tính phí"
              : "Tính phí theo giờ",
            parkingDuration: null,
            fee: null,
            subscriptionUsed: result.subscriptionUsed,
          };
        } else {
          displayText = result.licensePlate || result.exitPlate || "Không nhận diện được";
          callbackData = {
            licensePlate: result.licensePlate || result.exitPlate || "",
            status: null,
            details: null,
            parkingDuration: null,
            fee: null,
          };
        }

        setLicensePlate(displayText);
        setLastUpdate(new Date());

        // Gọi callback để cập nhật parent component
        if (onPlateDetected && callbackData) {
          onPlateDetected(callbackData);
        }
      } catch (err) {
        console.error("Lỗi auto capture:", err);
        setLicensePlate("Lỗi gửi tự động!");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const sendToBackend = async (imageData: string) => {
    setIsLoading(true);
    try {
      // Chỉ gửi ảnh để nhận diện, không lưu DB
      const response = await fetch("http://localhost:8080/api/parking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
      const result = await response.json();
      
      // Backend trả về: { success: true, data: { licensePlate: "..." } }
      const detectedPlate = result.data?.licensePlate || result.licensePlate || "Không nhận diện được";
      setLicensePlate(detectedPlate);
      setLastUpdate(new Date());
      
      // Truyền biển số lên component cha
      if (onPlateDetected) {
        onPlateDetected(detectedPlate);
      }
    } catch (err) {
      console.error("Lỗi khi gửi ảnh:", err);
      setLicensePlate("Lỗi kết nối");
    } finally {
      setIsLoading(false);
      setIsProcessing(false); // Reset processing state
    }
  };

  const toggleStream = () => {
    if (isStreaming && streamRef.current) {
      // Dừng camera
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsStreaming(false);
      setStatus("offline");
    } else {
      // Bắt đầu camera (chọn camera nếu chưa có)
      const startCamera = async () => {
        try {
          setError("");
          setStatus("offline");
          
          // Dừng stream cũ nếu có
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          
          let cameraToUse = selectedCamera;
          
          // Nếu chưa có camera được chọn, liệt kê và chọn camera phù hợp
          if (!cameraToUse) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === "videoinput");
            
            if (videoDevices[cameraIndex]) {
              cameraToUse = videoDevices[cameraIndex];
            } else if (videoDevices.length > 0) {
              cameraToUse = videoDevices[0];
            } else {
              throw new Error("Không tìm thấy camera nào");
            }
            
            setSelectedCamera(cameraToUse);
            saveSelectedCamera(cameraToUse); // Lưu camera đã chọn
            setCameras(videoDevices);
          }
          
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: cameraToUse.deviceId ? { exact: cameraToUse.deviceId } : undefined,
            },
          });
          
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsStreaming(true);
            setStatus("online");
            setLastUpdate(new Date());
          } else {
            throw new Error("Video element not available");
          }
        } catch (err: any) {
          console.error("Error starting camera:", err);
          setError(`Không thể khởi động camera: ${err.message}`);
          setStatus("error");
        }
      };
      startCamera();
    }
  };

  const refreshStream = () => {
    if (selectedCamera) {
      setSelectedCamera({ ...selectedCamera });
    }
  };

  const resetCameraSettings = () => {
    localStorage.removeItem(CAMERA_STORAGE_KEY);
    console.log(`🗑️ Đã xóa setting camera cho ${title}`);
    
    // Chọn lại camera mặc định theo cameraIndex
    if (cameras[cameraIndex]) {
      const defaultCamera = cameras[cameraIndex];
      setSelectedCamera(defaultCamera);
      saveSelectedCamera(defaultCamera);
    } else if (cameras.length > 0) {
      const firstCamera = cameras[0];
      setSelectedCamera(firstCamera);
      saveSelectedCamera(firstCamera);
    }
  };

  useImperativeHandle(ref, () => ({
    autoCaptureFromWS,
  }));

  const getCameraName = () => {
    if (selectedCamera) {
      const baseName = selectedCamera.label || `Camera ${cameraIndex + 1}`;
      const deviceIdShort = selectedCamera.deviceId.slice(-8);
      return `${baseName} (${deviceIdShort})`;
    }
    return `Camera ${cameraIndex + 1}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Dropdown chọn camera */}
      {cameras.length > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Chọn camera:</label>
            <div className="flex items-center space-x-2">
              {localStorage.getItem(CAMERA_STORAGE_KEY) && (
                <button
                  onClick={resetCameraSettings}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                  title="Xóa camera đã lưu và chọn mặc định"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <select
            value={selectedCamera?.deviceId || ""}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {cameras.map((camera, index) => {
              // Tạo tên camera với thông tin phân biệt
              const baseName = camera.label || `Camera ${index + 1}`;
              const deviceIdShort = camera.deviceId.slice(-8); // Lấy 8 ký tự cuối của deviceId
              const displayName = `${baseName} (${deviceIdShort}) [Index: ${index}]`;
              
              return (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {displayName}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Thông báo hướng dẫn */}
      {cameras.length === 0 && !error && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-blue-800">
              Đang tìm kiếm camera... Vui lòng cho phép quyền truy cập camera khi được yêu cầu.
            </p>
          </div>
        </div>
      )}

      {/* Hiển thị lỗi */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Camera Feed */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
        {/* Video element luôn có sẵn */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-64 object-cover ${isStreaming ? 'block' : 'hidden'}`}
        />
        
        {/* Overlay khi chưa streaming */}
        {!isStreaming && (
          <div className="absolute inset-0 w-full h-64 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              {status === "error" ? (
                <>
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 mb-2">Lỗi camera</p>
                  {error && <p className="text-xs text-red-300 mb-3">{error}</p>}
                  <button 
                    onClick={toggleStream}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Thử lại
                  </button>
                </>
              ) : (
                <>
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 mb-3">
                    {cameras.length === 0 
                      ? "Đang tìm camera..." 
                      : selectedCamera 
                        ? `Sẵn sàng: ${selectedCamera.label || `Camera ${cameraIndex + 1}`}`
                        : "Nhấn Play để bắt đầu"
                    }
                  </p>
                  <button 
                    onClick={toggleStream}
                    disabled={cameras.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {cameras.length === 0 ? "Đang tìm..." : "Bắt đầu Camera"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Canvas ẩn để capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay Controls */}
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button
            onClick={toggleStream}
            className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
          >
            {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={refreshStream}
            className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
            disabled={!selectedCamera}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={captureImage}
            disabled={!isStreaming || isLoading}
            className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nút chụp ảnh */}
      <button
        onClick={captureImage}
        disabled={isLoading || !!error || !isStreaming}
        className={`w-full mb-4 py-2 px-4 rounded-lg text-white font-medium transition-colors ${
          isLoading || error || !isStreaming 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isLoading ? "Đang xử lý..." : "Chụp ảnh"}
      </button>

      {/* Kết quả nhận diện biển số */}
      <div className="min-h-20 border border-gray-300 bg-gray-50 p-3 rounded-lg text-center text-sm whitespace-pre-line leading-relaxed">
        <span className="text-gray-700">{licensePlate}</span>
      </div>
    </div>
  );
});

export default CameraMonitor;
