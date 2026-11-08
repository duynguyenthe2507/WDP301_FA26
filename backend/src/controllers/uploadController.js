import { uploadImageBuffer, uploadFileBuffer } from '../config/cloudinary.js';

// POST /api/customer/upload/review-images
// Upload ảnh đánh giá lên Cloudinary, trả về mảng { url, publicId }
export const uploadReviewImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 ảnh để tải lên.' });
    }

    const uploadResults = await Promise.all(
      req.files.map((file) => uploadImageBuffer(file.buffer, 'vinastay/reviews'))
    );

    res.status(200).json({
      success: true,
      images: uploadResults, // [{ url, publicId }, ...]
    });
  } catch (error) {
    console.error('Lỗi khi upload ảnh đánh giá:', error);
    res.status(500).json({ message: 'Lỗi server khi tải ảnh lên. Vui lòng thử lại.', error: error.message });
  }
};

// POST /api/customer/upload/dispute-files
// Upload tệp khiếu nại (ảnh hoặc PDF) lên Cloudinary, trả về mảng thông tin tệp
export const uploadDisputeAttachments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 tệp để tải lên.' });
    }

    const uploadResults = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadFileBuffer(file.buffer, 'vinastay/disputes', 'auto');
        return {
          fileName: file.originalname,
          fileUrl: result.url,
          publicId: result.publicId,
          fileType: file.mimetype,
          fileSize: file.size,
        };
      })
    );

    res.status(200).json({
      success: true,
      attachments: uploadResults, // [{ fileName, fileUrl, publicId, fileType, fileSize }, ...]
    });
  } catch (error) {
    console.error('Lỗi khi upload tệp khiếu nại:', error);
    res.status(500).json({ message: 'Lỗi server khi tải tệp lên. Vui lòng thử lại.', error: error.message });
  }
};
