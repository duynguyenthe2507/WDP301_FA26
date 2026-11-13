import { v2 as cloudinary } from 'cloudinary';

// Cấu hình lúc gọi (không phải lúc import) vì index.js gọi dotenv.config() sau khi import các module
const configure = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

// Upload 1 file (buffer từ multer) lên Cloudinary, trả về { url, publicId }
export const uploadImageBuffer = (buffer, folder) => {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};

export const deleteImage = (publicId) => {
  configure();
  return cloudinary.uploader.destroy(publicId);
};

// Upload file bất kỳ (ảnh hoặc PDF) lên Cloudinary với resource_type tự động
export const uploadFileBuffer = (buffer, folder, resourceType = 'auto') => {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};