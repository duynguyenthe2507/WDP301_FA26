import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import { FaUser, FaChild, FaBed, FaCheck } from 'react-icons/fa';

const PLACEHOLDER_ROOM = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' đ';

const RoomTypeCard = ({ roomType, availability, nights = 1 }) => {
  const {
    name,
    base_price,
    capacity,
    amenities = [],
    bed = [],
    room_type_images = [],
    status
  } = roomType;

  const primaryImage =
    room_type_images.find((img) => img.is_primary) || room_type_images[0];
  const hasAvailability = availability !== undefined;
  const isAvailable = availability?.is_available;
  const availableRooms = availability?.available_rooms;

  return (
    <Card className="border-0 shadow-sm rounded-4 mb-3 overflow-hidden">
      <Row className="g-0">
        <Col md={4}>
          <img
            src={primaryImage?.url || PLACEHOLDER_ROOM}
            alt={name}
            style={{ width: '100%', height: '100%', minHeight: '190px', objectFit: 'cover' }}
            onError={(e) => { e.target.src = PLACEHOLDER_ROOM; }}
          />
        </Col>
        <Col md={8}>
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
              <h5 className="fw-bold mb-0" style={{ fontFamily: 'Playfair Display, serif' }}>
                {name}
              </h5>
              {hasAvailability && (
                isAvailable ? (
                  <Badge className="px-3 py-2 rounded-pill" style={{ background: '#198754' }}>
                    Còn {availableRooms} phòng
                  </Badge>
                ) : (
                  <Badge bg="danger" className="px-3 py-2 rounded-pill">Hết phòng</Badge>
                )
              )}
            </div>

            <div className="d-flex flex-wrap gap-3 text-muted small mb-3">
              {capacity?.adults > 0 && (
                <span><FaUser className="me-1" style={{ color: '#d4af37' }} />{capacity.adults} người lớn</span>
              )}
              {capacity?.children > 0 && (
                <span><FaChild className="me-1" style={{ color: '#d4af37' }} />{capacity.children} trẻ em</span>
              )}
              {bed.length > 0 && (
                <span>
                  <FaBed className="me-1" style={{ color: '#d4af37' }} />
                  {bed.map((b) => `${b.quantity} ${b.bed_type}`).join(', ')}
                </span>
              )}
            </div>

            {amenities.length > 0 && (
              <div className="d-flex flex-wrap gap-3 mb-3">
                {amenities.slice(0, 4).map((a, i) => (
                  <span key={i} className="d-flex align-items-center small text-muted">
                    <FaCheck className="me-1" style={{ color: '#d4af37', fontSize: '0.65rem' }} />
                    {a}
                  </span>
                ))}
                {amenities.length > 4 && (
                  <span className="small text-muted">+{amenities.length - 4} tiện ích khác</span>
                )}
              </div>
            )}

            <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-3">
              <div>
                <span className="fs-4 fw-bold" style={{ color: '#1a202c' }}>
                  {formatPrice(base_price)}
                </span>
                <span className="text-muted small ms-1">/ đêm</span>
                {nights > 1 && (
                  <div className="text-muted small">
                    Tổng: {formatPrice(base_price * nights)} / {nights} đêm
                  </div>
                )}
              </div>
              <Button
                disabled={hasAvailability && !isAvailable}
                className="rounded-pill px-4 fw-semibold"
                style={
                  hasAvailability && !isAvailable
                    ? { background: '#e9ecef', border: 'none', color: '#6c757d' }
                    : { background: '#d4af37', border: 'none', color: '#fff' }
                }
              >
                {hasAvailability && !isAvailable ? 'Hết phòng' : 'Chọn phòng này'}
              </Button>
            </div>
          </Card.Body>
        </Col>
      </Row>
    </Card>
  );
};

export default RoomTypeCard;
