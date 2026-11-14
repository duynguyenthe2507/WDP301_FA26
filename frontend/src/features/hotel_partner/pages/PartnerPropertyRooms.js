import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import ImageUploadButton from "../components/ImageUploadButton";
import { BED_TYPES } from "../data/hotelOptions";
import { usePropertyDraft } from "../context/PropertyDraftContext";
import { hasErrors, MAX_ROOM_IMAGES, validateRooms } from "../data/propertyValidation";

const ROOM_TYPES = [
  "Phòng Đơn Tiêu chuẩn",
  "Phòng Đôi Tiêu chuẩn",
  "Phòng Twin Tiêu chuẩn",
  "Phòng Superior",
  "Phòng Đôi Deluxe",
  "Phòng Executive",
  "Phòng Gia đình",
  "Phòng Suite Junior",
  "Phòng Suite Tổng thống",
  "Căn hộ Studio",
];
const blankRoom = () => ({
  name: "Phòng Đôi Deluxe",
  description: "",
  bedType: "",
  roomSize: "20",
  adultCapacity: 2,
  childrenCapacity: 0,
  totalRooms: 1,
  basePrice: "2000000",
  amenities: [],
  images: [],
});

const PartnerPropertyRooms = () => {
  const { draft } = usePropertyDraft();
  const [rooms, setRooms] = useState(
    draft.rooms?.length ? draft.rooms : [blankRoom()],
  );
  const [showErrors, setShowErrors] = useState(false);
  const roomErrors = validateRooms(rooms);
  const updateRoom = (index, field, value) =>
    setRooms((current) =>
      current.map((room, roomIndex) =>
        roomIndex === index ? { ...room, [field]: value } : room,
      ),
    );

  // Upload chạy bất đồng bộ nên cập nhật theo state mới nhất, không dùng `rooms` trong closure
  const addRoomImages = (index, images) =>
    setRooms((current) =>
      current.map((room, roomIndex) =>
        roomIndex === index
          ? { ...room, images: [...room.images, ...images] }
          : room,
      ),
    );

  const removeRoomImage = (roomIndex, imageIndex) =>
    updateRoom(
      roomIndex,
      "images",
      rooms[roomIndex].images.filter((_, index) => index !== imageIndex),
    );

  return (
    <PropertySetupLayout
      step={2}
      title="Thiết lập phòng và giá"
      previous="/partner/property-amenities"
      next="/partner/property-photos"
      invalid={roomErrors.some(hasErrors)}
      onInvalid={() => setShowErrors(true)}
      draftValues={{ rooms }}
    >
      {rooms.map((room, index) => {
        const shown = showErrors ? roomErrors[index] : {};
        return (
        <section
          key={index}
          className="rounded-3 p-3 mb-3"
          style={{ background: "#f5f7fa" }}
        >
          <h2 className="h6 fw-semibold">Loại phòng {index + 1}</h2>
          <div className="row g-3">
            <Form.Group className="col-md-6">
              <Form.Label>Tên loại phòng</Form.Label>
              <Form.Select
                value={room.name}
                isInvalid={!!shown.name}
                onChange={(e) => updateRoom(index, "name", e.target.value)}
              >
                <option value="" disabled>
                  Chọn loại phòng
                </option>
                {ROOM_TYPES.map((roomType) => (
                  <option key={roomType} value={roomType}>
                    {roomType}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{shown.name}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-6">
              <Form.Label>Loại giường</Form.Label>
              <Form.Select
                value={room.bedType}
                isInvalid={!!shown.bedType}
                onChange={(e) => updateRoom(index, "bedType", e.target.value)}
              >
                <option value="" disabled>
                  Chọn loại giường
                </option>
                {BED_TYPES.map((bedType) => (
                  <option key={bedType} value={bedType}>
                    {bedType}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{shown.bedType}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-12">
              <Form.Label>Mô tả phòng</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={room.description}
                onChange={(e) =>
                  updateRoom(index, "description", e.target.value)
                }
              />
            </Form.Group>
            <Form.Group className="col-md-4">
              <Form.Label>Diện tích (m²)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={room.roomSize}
                isInvalid={!!shown.roomSize}
                onChange={(e) => updateRoom(index, "roomSize", e.target.value)}
              />
              <Form.Control.Feedback type="invalid">{shown.roomSize}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-4">
              <Form.Label>Số người lớn tối đa</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={room.adultCapacity}
                isInvalid={!!shown.adultCapacity}
                onChange={(e) =>
                  updateRoom(index, "adultCapacity", e.target.value)
                }
              />
              <Form.Control.Feedback type="invalid">{shown.adultCapacity}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-4">
              <Form.Label>Số trẻ em tối đa</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={room.childrenCapacity}
                isInvalid={!!shown.childrenCapacity}
                onChange={(e) =>
                  updateRoom(index, "childrenCapacity", e.target.value)
                }
              />
              <Form.Control.Feedback type="invalid">{shown.childrenCapacity}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-6">
              <Form.Label>Tổng số phòng loại này</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={room.totalRooms}
                isInvalid={!!shown.totalRooms}
                onChange={(e) =>
                  updateRoom(index, "totalRooms", e.target.value)
                }
              />
              <Form.Control.Feedback type="invalid">{shown.totalRooms}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-6">
              <Form.Label>Giá cơ bản (VND / đêm)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={room.basePrice}
                isInvalid={!!shown.basePrice}
                onChange={(e) => updateRoom(index, "basePrice", e.target.value)}
              />
              <Form.Control.Feedback type="invalid">{shown.basePrice}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-12">
              <Form.Label>Tiện nghi phòng</Form.Label>
              <Form.Control
                value={
                  Array.isArray(room.amenities)
                    ? room.amenities.join(", ")
                    : room.amenities
                }
                placeholder="Ví dụ: Điều hòa, TV, Bồn tắm"
                onChange={(e) => updateRoom(index, "amenities", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="col-12">
              <Form.Label className="d-block">
                Ảnh phòng (JPG, PNG, WEBP, GIF, tối đa 5MB mỗi ảnh, tối đa {MAX_ROOM_IMAGES} ảnh)
              </Form.Label>
              <ImageUploadButton
                type="room"
                maxFiles={MAX_ROOM_IMAGES - room.images.length}
                onUploaded={(images) => addRoomImages(index, images)}
              />
              {room.images.length > 0 && (
                <div className="d-flex flex-wrap gap-3 mt-3">
                  {room.images.map((image, imageIndex) => (
                    <div key={image.publicId || `${image.url}-${imageIndex}`}>
                      <img
                        src={image.url}
                        alt={`Ảnh phòng ${imageIndex + 1}`}
                        className="border rounded"
                        style={{ width: 150, height: 120, objectFit: "cover" }}
                      />
                      <Button
                        type="button"
                        variant="outline-danger"
                        size="sm"
                        className="d-block mt-1"
                        onClick={() => removeRoomImage(index, imageIndex)}
                      >
                        Xóa
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Form.Group>
          </div>
        </section>
        );
      })}
      <Button
        variant="outline-primary"
        size="sm"
        className="rounded-pill"
        onClick={() => setRooms((current) => [...current, blankRoom()])}
      >
        <FaPlus className="me-2" />
        Thêm loại phòng
      </Button>
    </PropertySetupLayout>
  );
};

export default PartnerPropertyRooms;
