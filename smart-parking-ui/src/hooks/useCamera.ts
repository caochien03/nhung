import { useState, useEffect } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export const useCamera = () => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    enumerateCameras();
  }, []);

  const enumerateCameras = async () => {
    try {
      setLoading(true);
      setError(null);

      // Yêu cầu quyền truy cập để có thể lấy label của device
      await navigator.mediaDevices.getUserMedia({ video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));

      setCameras(videoDevices);
    } catch (err: any) {
      console.error('Error enumerating cameras:', err);
      setError(err.message || 'Không thể truy cập camera');
    } finally {
      setLoading(false);
    }
  };

  const getCameraConstraints = (deviceId?: string) => {
    return {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: false
    };
  };

  return {
    cameras,
    loading,
    error,
    enumerateCameras,
    getCameraConstraints
  };
};
