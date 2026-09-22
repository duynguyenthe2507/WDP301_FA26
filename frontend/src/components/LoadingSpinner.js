import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

const LoadingSpinner = ({ fullPage = true }) => {
  if (fullPage) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <Spinner
            animation="border"
            style={{ color: '#d4af37', width: '3rem', height: '3rem', borderWidth: '4px' }}
          />
          <p className="mt-3 text-muted fw-semibold">Đang tải...</p>
        </div>
      </Container>
    );
  }
  return (
    <div className="d-flex justify-content-center py-4">
      <Spinner animation="border" style={{ color: '#d4af37' }} />
    </div>
  );
};

export default LoadingSpinner;
