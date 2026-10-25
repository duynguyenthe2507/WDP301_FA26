import React from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const RatingStars = ({ rating = 0, count, size = '1rem' }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(<FaStar key={i} style={{ color: '#d4af37', fontSize: size }} />);
    } else if (i === fullStars + 1 && hasHalf) {
      stars.push(<FaStarHalfAlt key={i} style={{ color: '#d4af37', fontSize: size }} />);
    } else {
      stars.push(<FaRegStar key={i} style={{ color: '#d4af37', fontSize: size }} />);
    }
  }

  return (
    <span className="d-inline-flex align-items-center gap-1">
      {stars}
      <span className="ms-1 text-muted small fw-semibold">
        {rating > 0 ? rating.toFixed(1) : '0.0'}
        {count !== undefined && (
          <span className="fw-normal ms-1">({count} đánh giá)</span>
        )}
      </span>
    </span>
  );
};

export default RatingStars;
