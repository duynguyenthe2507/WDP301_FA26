import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";

const blankRoom = () => ({
  name: "Phòng đôi Deluxe",
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
              <Form.Control
                value={room.name}
                onChange={(e) => updateRoom(index, "name", e.target.value)}
              />
            </Form.Group>
            <Form.Group className="col-md-6">
              <Form.Label>Loại giường</Form.Label>
              <Form.Control
                value={room.bedType}
                placeholder="Ví dụ: 1 giường đôi"
                onChange={(e) => updateRoom(index, "bedType", e.target.value)}
              />
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
                onChange={(e) =>
                  updateRoom(index, "adultCapacity", e.target.value)
                }
              />
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
                onChange={(e) =>
                  updateRoom(index, "totalRooms", e.target.value)
                }
              />
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
