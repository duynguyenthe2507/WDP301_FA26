import React, { useState } from 'react';
import { Row, Col } from 'react-bootstrap';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1542314831-c53cd453a5ce?w=1200&q=80';

const ImageGallery = ({ images = [] }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const displayImages = images.length > 0 ? images : [{ url: PLACEHOLDER, is_primary: true }];
  const mainImage = displayImages[activeIdx];

  return (
    <div>
      <div
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          height: '460px',
          background: '#1a202c'
        }}
      >
        <img
          src={mainImage?.url || PLACEHOLDER}
          alt="Hotel"
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s ease' }}
          onError={(e) => { e.target.src = PLACEHOLDER; }}
        />
      </div>

      {displayImages.length > 1 && (
        <Row className="g-2 mt-2">
          {displayImages.slice(0, 5).map((img, idx) => (
            <Col key={idx} xs={Math.floor(12 / Math.min(displayImages.length, 5))}>
              <img
                src={img.url}
                alt={`view-${idx}`}
                onClick={() => setActiveIdx(idx)}
                onError={(e) => { e.target.src = PLACEHOLDER; }}
                style={{
                  width: '100%',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  opacity: idx === activeIdx ? 1 : 0.55,
                  border: idx === activeIdx ? '2.5px solid #d4af37' : '2.5px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default ImageGallery;
