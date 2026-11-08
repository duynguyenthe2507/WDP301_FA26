let multer = null;
try {
  const multerModule = await import('multer');
  multer = multerModule.default || multerModule;
} catch (err) {
  console.warn('[WARN] Package "multer" chưa được cài đặt trong node_modules. Các endpoint upload sẽ tạm thời trả về thông báo lỗi thay vì làm crash server.');
}

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGES_PER_REQUEST = 10;

// Giữ file trong bộ nhớ rồi đẩy thẳng lên Cloudinary, không ghi ra ổ đĩa
const imageUpload = multer
  ? multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE, files: MAX_IMAGES_PER_REQUEST },
      fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'images'));
      },
    })
  : null;

// Bọc multer để trả lỗi 400 dễ hiểu thay vì rơi vào global error handler (500)
export const uploadImages = (req, res, next) => {
  if (!imageUpload) {
    return res.status(503).json({
      message: 'Hệ thống chưa cài đặt thư viện upload (multer). Vui lòng chạy "npm install" trong thư mục backend.',
    });
  }
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

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_REQUEST = 5;

// Multer cho dispute files: chấp nhận ảnh JPG/PNG/WEBP và PDF, tối đa 5 file, 10MB/file
const disputeFileUpload = multer
  ? multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_REQUEST },
      fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|png|webp)$/.test(file.mimetype) || file.mimetype === 'application/pdf') {
          return cb(null, true);
        }
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'files'));
      },
    })
  : null;

// Bọc multer để trả lỗi 400 dễ hiểu
export const uploadDisputeFiles = (req, res, next) => {
  if (!disputeFileUpload) {
    return res.status(503).json({
      message: 'Hệ thống chưa cài đặt thư viện upload (multer). Vui lòng chạy "npm install" trong thư mục backend.',
    });
  }
  disputeFileUpload.array('files', MAX_FILES_PER_REQUEST)(req, res, (error) => {
    if (!error) return next();
    const messages = {
      LIMIT_FILE_SIZE: 'Mỗi tệp tối đa 10MB.',
      LIMIT_FILE_COUNT: `Tối đa ${MAX_FILES_PER_REQUEST} tệp mỗi lần tải lên.`,
      LIMIT_UNEXPECTED_FILE: 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc tài liệu PDF.',
    };
    res.status(400).json({ message: messages[error.code] || 'Tải tệp lên thất bại.' });
  });
};
