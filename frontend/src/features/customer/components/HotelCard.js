import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt } from 'react-icons/fa';
import RatingStars from './RatingStars';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1542314831-c53cd453a5ce?w=800&q=80';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' đ';

const HotelCard = ({ hotel }) => {
  const { _id, name, location, primary_image, rating_summary, min_price } = hotel;

  return (
    <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-lift transition-all bg-white">
      <div className="position-relative">
        <Card.Img
          variant="top"
          src={primary_image || PLACEHOLDER}
          alt={name}
          style={{ height: '220px', objectFit: 'cover' }}
          onError={(e) => { e.target.src = PLACEHOLDER; }}
        />
        {min_price && (
          <Badge
            className="position-absolute top-0 end-0 m-3 px-3 py-2 rounded-pill"
            style={{ background: '#d4af37', fontSize: '0.8rem', fontWeight: 700 }}
          >
            Từ {formatPrice(min_price)}/đêm
          </Badge>
        )}
      </div>

      <Card.Body className="p-4 d-flex flex-column">
        <Card.Title
          className="fw-bold fs-5 mb-1"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          {name}
        </Card.Title>

        <div className="d-flex align-items-center text-muted small mb-2">
          <FaMapMarkerAlt className="me-1" style={{ color: '#d4af37' }} />
          {location}
        </div>

        {rating_summary && (
          <div className="mb-3">
            <RatingStars
              rating={rating_summary.average_rating}
              count={rating_summary.total_reviews}
            />
          </div>
        )}

        <Button
          as={Link}
          to={`/hotels/${_id}`}
          variant="outline-dark"
          className="mt-auto rounded-pill fw-semibold py-2 hover-warning"
        >
          Xem chi tiết
        </Button>
      </Card.Body>
    </Card>
  );
};

export default HotelCard;
