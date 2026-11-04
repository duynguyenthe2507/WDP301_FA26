import multer from 'multer';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGES_PER_REQUEST = 10;

// Giữ file trong bộ nhớ rồi đẩy thẳng lên Cloudinary, không ghi ra ổ đĩa
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_IMAGES_PER_REQUEST },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'images'));
  },
});

// Bọc multer để trả lỗi 400 dễ hiểu thay vì rơi vào global error handler (500)
export const uploadImages = (req, res, next) => {
  imageUpload.array('images', MAX_IMAGES_PER_REQUEST)(req, res, (error) => {
    if (!error) return next();
    const messages = {
      LIMIT_FILE_SIZE: 'Mỗi ảnh tối đa 5MB.',
      LIMIT_FILE_COUNT: `Tối đa ${MAX_IMAGES_PER_REQUEST} ảnh mỗi lần tải lên.`,
      LIMIT_UNEXPECTED_FILE: 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.',
    };
    res.status(400).json({ message: messages[error.code] || 'Tải ảnh lên thất bại.' });
  });
};
