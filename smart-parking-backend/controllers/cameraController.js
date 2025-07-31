const Camera = require("../models/Camera");

// Get all cameras
exports.getCameras = async (req, res) => {
  try {
    const cameras = await Camera.find().sort({ name: 1 });
    
    res.json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    console.error("Get cameras error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get camera by ID
exports.getCameraById = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        success: false,
        message: "Camera not found",
      });
    }

    res.json({
      success: true,
      data: camera,
    });
  } catch (error) {
    console.error("Get camera error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update camera status
exports.updateCameraStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, lastImage, notes } = req.body;

    const camera = await Camera.findById(id);
    if (!camera) {
      return res.status(404).json({
        success: false,
        message: "Camera not found",
      });
    }

    // Update camera fields
    if (status) camera.status = status;
    if (lastImage) camera.lastImage = lastImage;
    if (notes) camera.notes = notes;
    
    camera.lastUpdate = new Date();

    await camera.save();

    // Emit WebSocket event for real-time updates
    if (req.app.get("io")) {
      req.app.get("io").emit("camera_update", {
        cameraId: camera._id,
        status: camera.status,
        lastImage: camera.lastImage,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: "Camera status updated successfully",
      data: camera,
    });
  } catch (error) {
    console.error("Update camera status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get camera status
exports.getCameraStatus = async (req, res) => {
  try {
    const cameras = await Camera.find().select("name status lastUpdate lastImage location");
    
    res.json({
      success: true,
      data: cameras,
    });
  } catch (error) {
    console.error("Get camera status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Capture image from camera
exports.captureImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageData, licensePlate } = req.body;

    const camera = await Camera.findById(id);
    if (!camera) {
      return res.status(404).json({
        success: false,
        message: "Camera not found",
      });
    }

    // Update camera with new image
    camera.lastImage = imageData;
    camera.lastUpdate = new Date();
    camera.lastLicensePlate = licensePlate;

    await camera.save();

    // Emit WebSocket event for real-time updates
    if (req.app.get("io")) {
      req.app.get("io").emit("camera_capture", {
        cameraId: camera._id,
        imageData: camera.lastImage,
        licensePlate: camera.lastLicensePlate,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: "Image captured successfully",
      data: {
        cameraId: camera._id,
        licensePlate: camera.lastLicensePlate,
        timestamp: camera.lastUpdate,
      },
    });
  } catch (error) {
    console.error("Capture image error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}; 