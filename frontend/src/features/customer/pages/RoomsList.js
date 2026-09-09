import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUser, FaVectorSquare, FaStar } from 'react-icons/fa';

// Mock data for rooms
const MOCK_ROOMS = [
  { id: 1, name: 'Standard Room', price: 99, capacity: 2, size: 25, type: 'Standard', image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', rating: 4.5 },
  { id: 2, name: 'Deluxe Ocean View', price: 199, capacity: 2, size: 40, type: 'Deluxe', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', rating: 4.8 },
  { id: 3, name: 'Family Suite', price: 299, capacity: 4, size: 60, type: 'Suite', image: 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', rating: 4.9 },
  { id: 4, name: 'Executive Suite', price: 399, capacity: 2, size: 75, type: 'Suite', image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', rating: 5.0 },
  { id: 5, name: 'Twin Room', price: 120, capacity: 2, size: 30, type: 'Standard', image: 'https://images.unsplash.com/photo-1598928506311-c55dd5802589?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', rating: 4.2 },
  { id: 6, name: 'Penthouse', price: 899, capacity: 6, size: 150, type: 'Luxury', image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', rating: 5.0 },
];

const RoomsList = () => {
  const [filter, setFilter] = useState('All');

  const filteredRooms = filter === 'All' ? MOCK_ROOMS : MOCK_ROOMS.filter(r => r.type === filter);

  return (
    <div className="bg-light py-5 min-vh-100">
      <div className="bg-dark text-light py-5 mb-5 text-center" style={{marginTop: '-3rem'}}>
         <Container>
           <h1 className="display-4 fw-bold mb-3">Phòng & Suite</h1>
           <p className="lead">Tìm không gian hoàn hảo cho kỳ nghỉ của bạn.</p>
         </Container>
      </div>
      
      <Container>
        <Row className="mb-5 align-items-center">
          <Col md={6}>
            <h4 className="fw-bold m-0">Đang hiển thị {filteredRooms.length} Phòng</h4>
          </Col>
          <Col md={6} className="d-flex justify-content-md-end mt-3 mt-md-0">
             <div className="d-flex align-items-center gap-3">
               <span className="fw-semibold text-muted">Lọc theo:</span>
               <Form.Select className="w-auto shadow-sm rounded-pill" value={filter} onChange={(e) => setFilter(e.target.value)}>
                 <option value="All">Tất cả</option>
                 <option value="Standard">Tiêu chuẩn</option>
                 <option value="Deluxe">Cao cấp (Deluxe)</option>
                 <option value="Suite">Phòng Suite</option>
                 <option value="Luxury">Sang trọng</option>
               </Form.Select>
             </div>
          </Col>
        </Row>

        <Row className="g-4">
          {filteredRooms.map((room) => (
            <Col lg={4} md={6} key={room.id}>
              <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-lift transition-all bg-white">
                <div className="position-relative">
                  <Card.Img variant="top" src={room.image} alt={room.name} style={{ height: '250px', objectFit: 'cover' }} />
                  <div className="position-absolute top-0 end-0 m-3 bg-warning text-dark px-3 py-1 fw-bold rounded-pill shadow-sm">
                    ${room.price} <span className="fw-normal small">/ đêm</span>
                  </div>
                  <Badge bg="dark" className="position-absolute bottom-0 start-0 m-3 px-3 py-2 rounded-pill d-flex align-items-center gap-1">
                     <FaStar className="text-warning"/> {room.rating}
                  </Badge>
                </div>
                <Card.Body className="p-4 d-flex flex-column">
                  <div className="mb-auto">
                    <Card.Title className="fw-bold fs-4 mb-2">{room.name}</Card.Title>
                    <Badge bg="light" text="dark" className="border mb-3 px-2 py-1">{room.type}</Badge>
                    <div className="d-flex gap-4 text-muted mb-4 small">
                      <div className="d-flex align-items-center gap-2"><FaUser /> {room.capacity} Khách</div>
                      <div className="d-flex align-items-center gap-2"><FaVectorSquare /> {room.size}m²</div>
                    </div>
                  </div>
                  <Button as={Link} to={`/room/${room.id}`} variant="outline-dark" className="w-100 rounded-pill fw-semibold py-2 mt-3 hover-warning">
                    Xem chi tiết
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
};

export default RoomsList;
