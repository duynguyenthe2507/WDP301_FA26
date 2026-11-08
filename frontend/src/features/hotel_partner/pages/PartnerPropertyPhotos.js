import { useState } from "react";
import { Button } from "react-bootstrap";
import PropertySetupLayout from "../components/PropertySetupLayout";
import ImageUploadButton from "../components/ImageUploadButton";
import { usePropertyDraft } from "../context/PropertyDraftContext";
import { hasErrors, MAX_HOTEL_IMAGES, validatePhotos } from "../data/propertyValidation";

const PartnerPropertyPhotos = () => {
  const { draft, setDraft } = usePropertyDraft();
  const [photos, setPhotos] = useState(draft.photos || []);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validatePhotos(photos);
  return (
    <PropertySetupLayout
      step={3}
      title="Ảnh khách sạn"
      previous="/partner/property-rooms"
      next="/partner/property-details"
      beforeNext={() => setDraft((current) => ({ ...current, photos }))}
      invalid={hasErrors(errors)}
      onInvalid={() => setShowErrors(true)}
    >
      <p className="text-muted">
        Chọn từ 1 đến {MAX_HOTEL_IMAGES} ảnh (JPG, PNG, WEBP, GIF, tối đa 5MB
        mỗi ảnh). Ảnh đầu tiên sẽ là ảnh đại diện.
      </p>
      <div className="mb-3">
        <ImageUploadButton
          type="hotel"
          maxFiles={MAX_HOTEL_IMAGES - photos.length}
          onUploaded={(images) =>
            setPhotos((current) => [...current, ...images])
          }
        />
        {showErrors && errors.photos && (
          <div className="text-danger small mt-2">{errors.photos}</div>
        )}
      </div>
      <div className="d-flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div key={photo.publicId || photo.url} className="position-relative">
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
