import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import { FaUser, FaChild, FaBed, FaCheck } from 'react-icons/fa';

const PLACEHOLDER_ROOM =
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' đ';

const RoomTypeCard = ({
  roomType,
  availability,
  nights = 1,
  quantity = 0,
  onQuantityChange,
}) => {
  const {
    _id,
    name,
    base_price,
    capacity,
    amenities = [],
    bed = [],
    room_type_images = [],
    totalRooms,
  } = roomType;

  const primaryImage =
    room_type_images.find((img) => img.is_primary) || room_type_images[0];

  // Xác định số phòng còn trống
  const availableRooms =
    availability !== undefined
      ? availability.available_rooms ?? 0
      : (totalRooms ?? 5);

  const isOutOfStock = availableRooms <= 0;
  const isMaxReached = quantity >= availableRooms;

  return (
    <Card className="border-0 shadow-sm rounded-4 mb-3 overflow-hidden bg-white">
      <Row className="g-0">
        <Col md={4}>
          <img
            src={primaryImage?.url || PLACEHOLDER_ROOM}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '210px',
              objectFit: 'cover',
            }}
            onError={(e) => {
              e.target.src = PLACEHOLDER_ROOM;
            }}
          />
        </Col>
        <Col md={8}>
          <Card.Body className="p-4 d-flex flex-column justify-content-between h-100">
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                <h5
                  className="fw-bold mb-0 text-dark"
                  style={{ fontFamily: 'Playfair Display, serif' }}
                >
                  {name}
                </h5>

                {isOutOfStock ? (
                  <Badge bg="danger" className="px-3 py-2 rounded-pill">
                    Hết phòng
                  </Badge>
                ) : (
                  <Badge
                    className="px-3 py-2 rounded-pill"
                    style={{ background: '#198754' }}
                  >
                    Còn {availableRooms} phòng
                  </Badge>
                )}
              </div>

              {/* Thông tin sức chứa & giường */}
              <div className="d-flex flex-wrap gap-3 text-muted small mb-3">
                {capacity?.adults > 0 && (
                  <span>
                    <FaUser className="me-1" style={{ color: '#d4af37' }} />
                    {capacity.adults} người lớn
                  </span>
                )}
                {capacity?.children > 0 && (
                  <span>
                    <FaChild className="me-1" style={{ color: '#d4af37' }} />
                    {capacity.children} trẻ em
                  </span>
                )}
                {bed.length > 0 && (
                  <span>
                    <FaBed className="me-1" style={{ color: '#d4af37' }} />
                    {bed.map((b) => `${b.quantity} ${b.bed_type}`).join(', ')}
                  </span>
                )}
              </div>

              {/* Tiện nghi phòng */}
              {amenities.length > 0 && (
                <div className="d-flex flex-wrap gap-3 mb-3">
                  {amenities.slice(0, 4).map((a, i) => (
                    <span
                      key={i}
                      className="d-flex align-items-center small text-muted"
                    >
                      <FaCheck
                        className="me-1"
                        style={{ color: '#d4af37', fontSize: '0.65rem' }}
                      />
                      {a}
                    </span>
                  ))}
                  {amenities.length > 4 && (
                    <span className="small text-muted">
                      +{amenities.length - 4} tiện ích khác
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Giá tiền & Bộ chọn số lượng (Quantity Selector) */}
            <div className="d-flex align-items-center justify-content-between mt-3 pt-3 border-top flex-wrap gap-3">
              <div>
                <span className="fs-4 fw-bold" style={{ color: '#1a202c' }}>
                  {formatPrice(base_price)}
                </span>
                <span className="text-muted small ms-1">/ đêm</span>
                {quantity > 0 && (
                  <div className="text-primary small fw-semibold">
                    Đã chọn {quantity} phòng: {formatPrice(base_price * quantity * nights)} ({nights} đêm)
                  </div>
                )}
              </div>

              {/* BỘ CHỌN SỐ LƯỢNG PHÒNG */}
              <div className="d-flex flex-column align-items-end">
                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                    style={{
                      width: '36px',
                      height: '36px',
                      fontSize: '1.2rem',
                      padding: 0,
                      cursor: quantity <= 0 ? 'not-allowed' : 'pointer',
                    }}
                    disabled={quantity <= 0}
                    onClick={() => onQuantityChange && onQuantityChange(_id, quantity - 1)}
                  >
                    −
                  </Button>

                  <span
                    className="fw-bold fs-5 text-center px-2"
                    style={{ minWidth: '36px', color: quantity > 0 ? '#005baa' : '#64748b' }}
                  >
                    {quantity}
                  </span>

                  <Button
                    variant="primary"
                    size="sm"
                    className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                    style={{
                      width: '36px',
                      height: '36px',
                      fontSize: '1.2rem',
                      padding: 0,
                      backgroundColor: isOutOfStock || isMaxReached ? '#cbd5e1' : '#005baa',
                      borderColor: isOutOfStock || isMaxReached ? '#cbd5e1' : '#005baa',
                      color: isOutOfStock || isMaxReached ? '#94a3b8' : '#ffffff',
                      cursor: isOutOfStock || isMaxReached ? 'not-allowed' : 'pointer',
                    }}
                    disabled={isOutOfStock || isMaxReached}
                    onClick={() => onQuantityChange && onQuantityChange(_id, quantity + 1)}
                  >
                    +
                  </Button>
                </div>

                <div className="small text-muted mt-1 text-end" style={{ fontSize: '0.8rem' }}>
                  {isOutOfStock ? (
                    <span className="text-danger fw-semibold">Hết phòng</span>
                  ) : quantity > 0 ? (
                    <span className="text-success fw-semibold">
                      Đã chọn {quantity}/{availableRooms} phòng
                    </span>
                  ) : (
                    <span>Tối đa {availableRooms} phòng</span>
                  )}
                </div>
              </div>
            </div>
          </Card.Body>
        </Col>
      </Row>
    </Card>
  );
};

export default RoomTypeCard;
