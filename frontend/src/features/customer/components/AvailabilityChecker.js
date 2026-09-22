import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaSearch } from 'react-icons/fa';

const AvailabilityChecker = ({ onCheck, loading = false }) => {
  const today = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!checkIn || !checkOut) {
      setError('Vui lòng chọn cả ngày check-in và check-out');
      return;
    }
    if (checkIn < today) {
      setError('Ngày check-in không được nhỏ hơn ngày hôm nay');
      return;
    }
    if (checkOut <= checkIn) {
      setError('Ngày check-out phải sau ngày check-in');
      return;
    }

    onCheck({ checkIn, checkOut });
  };

  return (
    <Card
      className="border-0 shadow-sm rounded-4"
      style={{ position: 'sticky', top: '90px' }}
    >
      <Card.Body className="p-4">
        <h5 className="fw-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Kiểm tra phòng trống
        </h5>

        {error && (
          <Alert variant="danger" className="rounded-3 small py-2">{error}</Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small text-muted d-flex align-items-center gap-1">
              <FaCalendarAlt style={{ color: '#d4af37' }} />
              Ngày nhận phòng
            </Form.Label>
            <Form.Control
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && e.target.value >= checkOut) setCheckOut('');
              }}
              className="rounded-3 p-2"
              style={{ borderColor: '#e2e8f0' }}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold small text-muted d-flex align-items-center gap-1">
              <FaCalendarAlt style={{ color: '#d4af37' }} />
              Ngày trả phòng
            </Form.Label>
            <Form.Control
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
              className="rounded-3 p-2"
              style={{ borderColor: '#e2e8f0' }}
            />
          </Form.Group>

          <Button
            type="submit"
            disabled={loading}
            className="w-100 rounded-pill py-2 fw-bold"
            style={{ background: '#d4af37', border: 'none', fontSize: '0.95rem' }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Đang kiểm tra...
              </>
            ) : (
              <>
                <FaSearch className="me-2" />
                Kiểm tra ngay
              </>
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default AvailabilityChecker;
