import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FaImage, FaPlus } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";

const PartnerPropertyPhotos = () => {
  const [photos, setPhotos] = useState([]);
  const addPhotos = (event) =>
    setPhotos((current) => [
      ...current,
      ...Array.from(event.target.files || []).map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    ]);
  return (
    <PropertySetupLayout
      step={3}
      title="Ảnh"
      previous="/partner/property-rooms"
      next="/partner/property-details"
    >
      <h2 className="h5 fw-semibold">Ảnh cơ sở lưu trú</h2>
      <p className="text-muted" style={{ fontSize: 12 }}>
        Giới thiệu cơ sở lưu trú của quý đối tác với ảnh chất lượng cao để thu
        hút đơn đặt phòng.
      </p>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {photos.map((photo, index) => (
          <div key={photo.url} className="position-relative">
            <img
              src={photo.url}
              alt={photo.name}
              className="rounded-2 border"
              style={{ width: 150, height: 150, objectFit: "cover" }}
            />
            {index === 0 && (
              <span
                className="position-absolute top-0 start-0 bg-dark text-white px-2 rounded-end"
                style={{ fontSize: 11 }}
              >
                Ảnh chính
              </span>
            )}
          </div>
        ))}
        <label
          className="border border-dashed rounded-3 d-flex flex-column align-items-center justify-content-center text-primary"
          style={{
            width: 150,
            height: 150,
            cursor: "pointer",
            borderStyle: "dashed",
          }}
        >
          <FaPlus size={24} />
          <span className="mt-2" style={{ fontSize: 12 }}>
            Bổ sung ảnh
          </span>
          <Form.Control
            className="d-none"
            type="file"
            accept="image/*"
            multiple
            onChange={addPhotos}
          />
        </label>
      </div>
      <p className="text-primary" style={{ fontSize: 12 }}>
        <FaImage className="me-1" />
        Cần một số mẹo chụp ảnh?
      </p>
      <hr className="my-4" />
      <h2 className="h5 fw-semibold">Ảnh phòng</h2>
      <p className="text-muted" style={{ fontSize: 12 }}>
        Quý đối tác có thể thêm ảnh ngay lúc này hoặc sau khi trang thông tin đã
        được đăng tải.
      </p>
      <Button
        variant="link"
        className="text-decoration-none p-0"
        onClick={() => document.querySelector("input[type=file]")?.click()}
      >
        <FaPlus className="me-2" />
        Bổ sung ảnh
      </Button>
    </PropertySetupLayout>
  );
};
export default PartnerPropertyPhotos;
