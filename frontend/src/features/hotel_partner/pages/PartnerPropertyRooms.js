import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { BED_TYPES } from "../data/hotelOptions";
import { usePropertyDraft } from "../context/PropertyDraftContext";

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
  const { draft, setDraft } = usePropertyDraft();
  const [rooms, setRooms] = useState(
    draft.rooms?.length ? draft.rooms : [blankRoom()],
  );
  const [imageUrlInputs, setImageUrlInputs] = useState({});
  // Khớp ràng buộc của RoomType: bedType bắt buộc, sức chứa và số phòng tối thiểu 1
  const isBelowOne = (value) => !(Number(value) >= 1);
  const hasInvalidRoom = rooms.some(
    (room) =>
      !room.bedType ||
      isBelowOne(room.adultCapacity) ||
      isBelowOne(room.totalRooms),
  );
  const updateRoom = (index, field, value) =>
    setRooms((current) =>
      current.map((room, roomIndex) =>
        roomIndex === index ? { ...room, [field]: value } : room,
      ),
    );

  const addRoomImage = (index) => {
    const url = imageUrlInputs[index]?.trim();
    if (!/^https?:\/\//i.test(url)) return;
    updateRoom(index, "images", [...rooms[index].images, { url }]);
    setImageUrlInputs((current) => ({ ...current, [index]: "" }));
  };

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
      disableNext={hasInvalidRoom}
      beforeNext={() => setDraft((current) => ({ ...current, rooms }))}
    >
      {rooms.map((room, index) => (
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
            </Form.Group>
            <Form.Group className="col-md-6">
              <Form.Label>Loại giường</Form.Label>
              <Form.Select
                value={room.bedType}
                isInvalid={!room.bedType}
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
              <Form.Control.Feedback type="invalid">
                Vui lòng chọn loại giường.
              </Form.Control.Feedback>
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
                onChange={(e) => updateRoom(index, "roomSize", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="col-md-4">
              <Form.Label>Số người lớn tối đa</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={room.adultCapacity}
                isInvalid={isBelowOne(room.adultCapacity)}
                onChange={(e) =>
                  updateRoom(index, "adultCapacity", e.target.value)
                }
              />
              <Form.Control.Feedback type="invalid">
                Tối thiểu 1 người lớn.
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-4">
              <Form.Label>Số trẻ em tối đa</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={room.childrenCapacity}
                onChange={(e) =>
                  updateRoom(index, "childrenCapacity", e.target.value)
                }
              />
            </Form.Group>
            <Form.Group className="col-md-6">
              <Form.Label>Tổng số phòng loại này</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={room.totalRooms}
                isInvalid={isBelowOne(room.totalRooms)}
                onChange={(e) =>
                  updateRoom(index, "totalRooms", e.target.value)
                }
              />
              <Form.Control.Feedback type="invalid">
                Tối thiểu 1 phòng.
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-6">
              <Form.Label>Giá cơ bản (VND / đêm)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={room.basePrice}
                onChange={(e) => updateRoom(index, "basePrice", e.target.value)}
              />
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
              <Form.Label>URL ảnh phòng (cách nhau bằng dấu phẩy)</Form.Label>
              <div className="input-group">
                <Form.Control
                  type="url"
                  value={imageUrlInputs[index] || ""}
                  placeholder="https://..."
                  onChange={(e) =>
                    setImageUrlInputs((current) => ({
                      ...current,
                      [index]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRoomImage(index);
                    }
                  }}
                />
                <Button type="button" onClick={() => addRoomImage(index)}>
                  Thêm ảnh
                </Button>
              </div>
              {room.images.length > 0 && (
                <div className="d-flex flex-wrap gap-3 mt-3">
                  {room.images.map((image, imageIndex) => (
                    <div key={`${image.url}-${imageIndex}`}>
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
      ))}
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
