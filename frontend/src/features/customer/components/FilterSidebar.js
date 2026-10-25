import React, { useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { FaStar, FaRegStar, FaFilter, FaTimes } from 'react-icons/fa';

const FilterSidebar = ({ onFilterChange }) => {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleApply = () => {
    onFilterChange({
      ...(minPrice ? { minPrice } : {}),
      ...(maxPrice ? { maxPrice } : {}),
      ...(minRating ? { minRating } : {})
    });
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setHoverRating(0);
    onFilterChange({});
  };

  const displayRating = hoverRating || minRating;

  return (
    <Card className="border-0 shadow-sm rounded-4">
      <Card.Body className="p-4">
        <h5 className="fw-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          <FaFilter className="me-2" style={{ color: '#d4af37' }} />
          Bộ lọc
        </h5>

        {/* Price range */}
        <div className="mb-4">
          <p className="fw-semibold text-muted small mb-2 text-uppercase ls-1">Khoảng giá (đ/đêm)</p>
          <Form.Control
            type="number"
            placeholder="Từ"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="mb-2 rounded-3"
            min={0}
            style={{ borderColor: '#e2e8f0' }}
          />
          <Form.Control
            type="number"
            placeholder="Đến"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="rounded-3"
            min={0}
            style={{ borderColor: '#e2e8f0' }}
          />
        </div>

        {/* Rating */}
        <div className="mb-4">
          <p className="fw-semibold text-muted small mb-2 text-uppercase">Đánh giá tối thiểu</p>
          <div className="d-flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="border-0 bg-transparent p-0"
                style={{ cursor: 'pointer', fontSize: '1.5rem', transition: 'transform 0.1s' }}
                onClick={() => setMinRating(minRating === star ? 0 : star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                {star <= displayRating
                  ? <FaStar style={{ color: '#d4af37' }} />
                  : <FaRegStar style={{ color: '#dee2e6' }} />}
              </button>
            ))}
          </div>
          {minRating > 0 && (
            <small className="text-muted mt-1 d-block">{minRating} sao trở lên</small>
          )}
        </div>

        <div className="d-grid gap-2">
          <Button
            onClick={handleApply}
            style={{ background: '#d4af37', border: 'none', borderRadius: '50px', fontWeight: 600 }}
          >
            Áp dụng
          </Button>
          <Button
            onClick={handleReset}
            variant="outline-secondary"
            className="rounded-pill d-flex align-items-center justify-content-center gap-1"
          >
            <FaTimes /> Xóa bộ lọc
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default FilterSidebar;
