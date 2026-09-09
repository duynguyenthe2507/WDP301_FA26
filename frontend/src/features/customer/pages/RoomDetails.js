import React from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { FaUser, FaVectorSquare, FaBed, FaBath, FaTv, FaWifi, FaCoffee, FaCheck } from 'react-icons/fa';

// Mock data (same as RoomsList, ideally this would come from an API)
const MOCK_ROOMS = {
  1: { id: 1, name: 'Standard Room', price: 99, capacity: 2, size: 25, type: 'Standard', image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', description: 'A cozy and well-appointed room for a comfortable stay. Perfect for solo travelers or couples looking for a relaxing getaway with all essential amenities.' },
  2: { id: 2, name: 'Deluxe Ocean View', price: 199, capacity: 2, size: 40, type: 'Deluxe', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', description: 'Experience breathtaking ocean views from your private balcony. This spacious deluxe room features modern decor and premium comforts.' },
  // Adding just a few for demonstration, a real app handles missing IDs
};

const RoomDetails = () => {
  const { id } = useParams();
  const room = MOCK_ROOMS[id] || MOCK_ROOMS[1]; // Fallback to room 1 for demo purposes

  return (
    <div className="pb-5">
      {/* Hero Image */}
      <div 
        style={{
          background: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${room.image}) no-repeat center center/cover`,
          height: '60vh',
          marginTop: '-1.5rem'
        }}
        className="d-flex align-items-end pb-5 text-light"
      >
        <Container>
          <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 mb-3 rounded-pill">{room.type}</Badge>
          <h1 className="display-4 fw-bold">{room.name}</h1>
        </Container>
      </div>

      <Container className="mt-5">
        <Row className="gy-5">
          <Col lg={8}>
            <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border mb-4">
              <div className="d-flex flex-wrap gap-4 mb-4 pb-4 border-bottom text-muted">
                 <span className="d-flex align-items-center gap-2 fs-5"><FaUser className="text-warning"/> {room.capacity} Khách</span>
                 <span className="d-flex align-items-center gap-2 fs-5"><FaVectorSquare className="text-warning"/> {room.size} m²</span>
                 <span className="d-flex align-items-center gap-2 fs-5"><FaBed className="text-warning"/> 1 Giường King</span>
                 <span className="d-flex align-items-center gap-2 fs-5"><FaBath className="text-warning"/> 1 Phòng tắm</span>
              </div>
              
              <h3 className="fw-bold mb-3">Tổng quan phòng</h3>
              <p className="text-secondary fs-5 lh-lg mb-5">
                {room.description}
                <br/><br/>
                Được thiết kế với sự thoải mái của bạn làm trọng tâm, phòng này có nội thất trang nhã, bộ đồ giường sang trọng và công nghệ hiện đại để đảm bảo kỳ nghỉ trọn vẹn. Hãy thức dậy đón ánh sáng tự nhiên và thưởng thức tách cà phê tươi trong bầu không khí thanh bình.
              </p>

              <h3 className="fw-bold mb-4">Tiện nghi</h3>
              <Row className="g-3 mb-2 text-secondary">
                <Col sm={6} className="d-flex align-items-center gap-2 fs-5"><FaCheck className="text-success"/> Điều hòa nhiệt độ</Col>
                <Col sm={6} className="d-flex align-items-center gap-2 fs-5"><FaWifi className="text-success"/> Wi-Fi tốc độ cao miễn phí</Col>
                <Col sm={6} className="d-flex align-items-center gap-2 fs-5"><FaTv className="text-success"/> TV màn hình phẳng</Col>
                <Col sm={6} className="d-flex align-items-center gap-2 fs-5"><FaCoffee className="text-success"/> Máy pha cà phê</Col>
                <Col sm={6} className="d-flex align-items-center gap-2 fs-5"><FaCheck className="text-success"/> Minibar</Col>
                <Col sm={6} className="d-flex align-items-center gap-2 fs-5"><FaCheck className="text-success"/> Phục vụ phòng (24/7)</Col>
              </Row>
            </div>
          </Col>
          
          <Col lg={4}>
            <div className="bg-light p-4 rounded-4 shadow-sm border sticky-top" style={{top: '100px'}}>
              <h3 className="fw-bold mb-4">Đặt phòng</h3>
              <div className="d-flex align-items-baseline gap-2 mb-4">
                <h2 className="display-5 fw-bold text-dark m-0">${room.price}</h2>
                <span className="text-muted fs-5">/ đêm</span>
              </div>
              
              <div className="bg-white p-3 rounded-3 mb-4 border text-center">
                 <p className="mb-0 fw-semibold text-success">✓ Còn trống</p>
                 <small className="text-muted">Giá có thể thay đổi tùy theo ngày.</small>
              </div>

              <Button as={Link} to={`/booking?roomId=${room.id}`} variant="warning" size="lg" className="w-100 py-3 fw-bold rounded-pill shadow-sm hover-lift">
                Tiến hành Đặt phòng
              </Button>
              <p className="text-center mt-3 small text-muted">Bạn sẽ chưa bị tính phí ngay.</p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RoomDetails;
