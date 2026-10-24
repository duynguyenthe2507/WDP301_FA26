import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";

const PartnerPropertyPhotos = () => {
  const { draft, setDraft } = usePropertyDraft();
  const [photos, setPhotos] = useState(draft.photos || []);
  const [url, setUrl] = useState("");
  const addPhoto = () => {
    if (!/^https?:\/\//i.test(url.trim())) return;
    setPhotos((current) => [...current, { url: url.trim() }]);
    setUrl("");
  };
  return (
    <PropertySetupLayout
      step={3}
      title="Ảnh khách sạn"
      previous="/partner/property-rooms"
      next="/partner/property-details"
      beforeNext={() => setDraft((current) => ({ ...current, photos }))}
    >
      <p className="text-muted">
        Nhập URL ảnh đã được lưu trên dịch vụ ảnh. Ảnh đầu tiên sẽ là ảnh đại
        diện.
      </p>
      <div className="input-group mb-3">
        <Form.Control
          type="url"
          value={url}
          placeholder="https://example.com/hotel.jpg"
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button onClick={addPhoto}>
          <FaPlus className="me-1" />
          Thêm ảnh
        </Button>
      </div>
      <div className="d-flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div key={photo.url} className="position-relative">
            <img
              src={photo.url}
              alt={`Ảnh khách sạn ${index + 1}`}
              className="border rounded"
              style={{ width: 150, height: 120, objectFit: "cover" }}
            />
            {index === 0 && (
              <span
                className="position-absolute top-0 start-0 bg-dark text-white px-2"
                style={{ fontSize: 11 }}
              >
                Ảnh chính
              </span>
            )}
            <Button
              variant="outline-danger"
              size="sm"
              className="d-block mt-1"
              onClick={() =>
                setPhotos((current) =>
                  current.filter((_, photoIndex) => photoIndex !== index),
                )
              }
            >
              Xóa
            </Button>
          </div>
        ))}
      </div>
    </PropertySetupLayout>
  );
};

export default PartnerPropertyPhotos;
