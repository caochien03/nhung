const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

// Storage mode: 'cloudinary' (default) or 'local'
const STORAGE_MODE = (process.env.IMAGE_STORAGE || "cloudinary").toLowerCase();

// Detect if Cloudinary is properly configured
const isCloudinaryConfigured = () => {
    if (STORAGE_MODE === "local" || process.env.DISABLE_CLOUDINARY === "true") {
        return false;
    }
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
        process.env;
    if (
        !CLOUDINARY_CLOUD_NAME ||
        !CLOUDINARY_API_KEY ||
        !CLOUDINARY_API_SECRET
    ) {
        return false;
    }
    // Avoid using placeholder defaults
    const isPlaceholder = (v) =>
        ["your_cloud_name", "your_api_key", "your_api_secret"].includes(
            String(v).trim()
        );
    if (
        isPlaceholder(CLOUDINARY_CLOUD_NAME) ||
        isPlaceholder(CLOUDINARY_API_KEY) ||
        isPlaceholder(CLOUDINARY_API_SECRET)
    ) {
        return false;
    }
    return true;
};

// Ensure uploads directory exists
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Save image buffer to local file and return metadata in Cloudinary-like shape
const saveBufferLocally = (buffer, licensePlate, action, cameraIndex) => {
    const uploadsRoot = path.join(__dirname, "..", "uploads");
    const subFolder = action === "out" ? "out" : "in";
    const dir = path.join(uploadsRoot, subFolder);
    ensureDir(dir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const plate = licensePlate || "unknown";
    const filename = `${plate}_${timestamp}_cam${cameraIndex}.jpg`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    return {
        url: `/uploads/${subFolder}/${filename}`,
        publicId: null,
        format: "jpg",
        width: undefined,
        height: undefined,
        storage: "local",
    };
};

/**
 * Upload hình ảnh lên Cloudinary
 * @param {string} imagePath - Đường dẫn file hình ảnh
 * @param {string} licensePlate - Biển số xe
 * @param {string} action - Hành động (in/out)
 * @param {number} cameraIndex - Index camera (1: vào, 2: ra)
 */
const uploadParkingImage = async (
    imagePath,
    licensePlate,
    action,
    cameraIndex
) => {
    try {
        if (!isCloudinaryConfigured()) {
            // Local storage fallback
            const buffer = fs.readFileSync(imagePath);
            const result = saveBufferLocally(
                buffer,
                licensePlate,
                action,
                cameraIndex
            );

            // Xóa file tạm nếu tồn tại
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }

            return result;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const plate = licensePlate || "unknown";
        const publicId = `parking/${action}/${plate}_${timestamp}_cam${cameraIndex}`;

        let result;
        try {
            result = await cloudinary.uploader.upload(imagePath, {
                public_id: publicId,
                folder: "smart-parking",
                resource_type: "image",
                format: "jpg",
                tags: [action, `camera_${cameraIndex}`, plate],
                context: {
                    license_plate: plate,
                    action: action,
                    camera: cameraIndex,
                    captured_at: timestamp, // avoid colliding with Cloudinary reserved timestamp param
                },
                timeout: 60000,
            });
        } catch (cloudErr) {
            // Auto-fallback: save locally if Cloudinary upload fails
            console.error(
                "Cloudinary upload failed, falling back to local storage:",
                cloudErr?.message || cloudErr
            );
            const buffer = fs.readFileSync(imagePath);
            const localResult = saveBufferLocally(
                buffer,
                licensePlate,
                action,
                cameraIndex
            );
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            return localResult;
        }

        // Xóa file tạm nếu tồn tại
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        return {
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            storage: "cloudinary",
        };
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);

        // Xóa file tạm nếu có lỗi
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        throw new Error("Failed to upload image to cloud storage");
    }
};

/**
 * Upload hình ảnh từ base64 string
 * @param {string} base64Image - Hình ảnh dạng base64
 * @param {string} licensePlate - Biển số xe
 * @param {string} action - Hành động (in/out)
 * @param {number} cameraIndex - Index camera (1: vào, 2: ra)
 */
const uploadBase64Image = async (
    base64Image,
    licensePlate,
    action,
    cameraIndex
) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const plate = licensePlate || "unknown";
        const publicId = `parking/${action}/${plate}_${timestamp}_cam${cameraIndex}`;

        // Xử lý base64 string (loại bỏ prefix nếu có)
        const base64Data = base64Image.replace(
            /^data:image\/[a-z]+;base64,/,
            ""
        );

        if (!isCloudinaryConfigured()) {
            const buffer = Buffer.from(base64Data, "base64");
            const result = saveBufferLocally(
                buffer,
                plate,
                action,
                cameraIndex
            );
            return result;
        }

        try {
            const result = await cloudinary.uploader.upload(
                `data:image/jpeg;base64,${base64Data}`,
                {
                    public_id: publicId,
                    folder: "smart-parking",
                    resource_type: "image",
                    format: "jpg",
                    tags: [action, `camera_${cameraIndex}`, plate],
                    context: {
                        license_plate: plate,
                        action: action,
                        camera: cameraIndex,
                        captured_at: timestamp,
                    },
                    timeout: 60000,
                }
            );

            return {
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                width: result.width,
                height: result.height,
                storage: "cloudinary",
            };
        } catch (cloudErr) {
            console.error(
                "Cloudinary upload failed (base64), falling back to local:",
                cloudErr?.message || cloudErr
            );
            const buffer = Buffer.from(base64Data, "base64");
            return saveBufferLocally(buffer, plate, action, cameraIndex);
        }
    } catch (error) {
        console.error("Error uploading base64 image:", error);
        throw new Error("Failed to upload image to cloud storage");
    }
};

/**
 * Xóa hình ảnh từ Cloudinary
 * @param {string} publicId - Public ID của hình ảnh
 */
const deleteImage = async (publicId) => {
    try {
        if (!isCloudinaryConfigured()) {
            // Local mode: attempt to delete by path if provided
            if (publicId && fs.existsSync(publicId)) {
                fs.unlinkSync(publicId);
                return { result: "ok" };
            }
            return { result: "noop" };
        }
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        throw new Error("Failed to delete image from cloud storage");
    }
};

/**
 * Xóa hình ảnh cũ hơn số ngày được chỉ định
 * @param {number} days - Số ngày (mặc định 3)
 */
const deleteOldImages = async (days = 3) => {
    try {
        // Tính toán thời gian cắt
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        if (!isCloudinaryConfigured()) {
            // Local cleanup
            const uploadsRoot = path.join(__dirname, "..", "uploads");
            let deletedCount = 0;
            if (fs.existsSync(uploadsRoot)) {
                const subfolders = ["in", "out"];
                for (const sub of subfolders) {
                    const dir = path.join(uploadsRoot, sub);
                    if (!fs.existsSync(dir)) continue;
                    for (const file of fs.readdirSync(dir)) {
                        const full = path.join(dir, file);
                        const stat = fs.statSync(full);
                        if (stat.mtime < cutoffDate) {
                            fs.unlinkSync(full);
                            deletedCount++;
                        }
                    }
                }
            }
            console.log(
                `Deleted ${deletedCount} old images from local uploads`
            );
            return deletedCount;
        }

        // Cloudinary cleanup
        const result = await cloudinary.search
            .expression("folder:smart-parking")
            .sort_by([["created_at", "asc"]])
            .max_results(500)
            .execute();

        let deletedCount = 0;

        for (const image of result.resources) {
            const createdAt = new Date(image.created_at);

            if (createdAt < cutoffDate) {
                await cloudinary.uploader.destroy(image.public_id);
                deletedCount++;
            }
        }

        console.log(`Deleted ${deletedCount} old images from Cloudinary`);
        return deletedCount;
    } catch (error) {
        console.error("Error deleting old images:", error);
        throw new Error("Failed to delete old images");
    }
};

module.exports = {
    uploadParkingImage,
    uploadBase64Image,
    deleteImage,
    deleteOldImages,
};
