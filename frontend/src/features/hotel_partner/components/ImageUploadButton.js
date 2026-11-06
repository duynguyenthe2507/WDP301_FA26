import { useContext, useRef, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { FaUpload } from "react-icons/fa";
import { AuthContext } from "../../../context/AuthContext";
import { uploadImages } from "../partnerApi";

const MAX_SIZE = 5 * 1024 * 1024;

// Chọn ảnh từ máy → upload lên Cloudinary qua backend → trả về [{ url, publicId }] cho trang cha
const ImageUploadButton = ({ type, onUploaded, label = "Tải ảnh lên", maxFiles }) => {
  const { token } = useContext(AuthContext);
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // cho phép chọn lại đúng file vừa chọn
    if (!files.length) return;
    if (files.some((file) => file.size > MAX_SIZE)) {
      setError("Mỗi ảnh tối đa 5MB.");
      return;
    }
    if (maxFiles !== undefined && files.length > maxFiles) {
      setError(`Chỉ có thể tải thêm tối đa ${maxFiles} ảnh.`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const res = await uploadImages(files, type, token);
      onUploaded(res.data.images);
    } catch (err) {
      setError(err.response?.data?.message || "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline-primary"
        disabled={uploading || maxFiles === 0}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Spinner size="sm" className="me-2" />
        ) : (
          <FaUpload className="me-2" />
        )}
        {uploading ? "Đang tải lên..." : label}
      </Button>
      {error && (
        <Alert variant="danger" className="mt-2 mb-0 py-2 small">
          {error}
        </Alert>
      )}
    </div>
  );
};

export default ImageUploadButton;
