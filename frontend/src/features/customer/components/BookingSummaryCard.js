import React from 'react';
import { Card, Form, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import {
  FaCalendarAlt,
  FaBed,
  FaShieldAlt,
  FaExclamationTriangle,
  FaArrowRight,
} from 'react-icons/fa';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' đ';

const BookingSummaryCard = ({
  checkIn,
  checkOut,
  today,
  minCheckOut,
  nights,
  onCheckInChange,
  onCheckOutChange,
  selectedRoomsList,
  totalRooms,
  roomCost,
  serviceFee,
  totalAmount,
  availLoading,
  warningMessage,
  onSubmitBooking,
}) => {
  const isDateInvalid = !checkIn || !checkOut || checkOut <= checkIn;
  const isNoRoomSelected = totalRooms <= 0;
  const isSubmitDisabled = isDateInvalid || isNoRoomSelected || availLoading;

  return (
    <Card
      className="border-0 shadow-sm rounded-4 overflow-hidden"
      style={{ position: 'sticky', top: '90px' }}
    >
      <div
        className="p-3 text-white fw-bold d-flex align-items-center justify-content-between"
        style={{ background: '#1a202c' }}
      >
        <span className="d-flex align-items-center gap-2">
          <FaCalendarAlt style={{ color: '#d4af37' }} />
          Thông tin đặt phòng
        </span>
        {availLoading && (
          <span className="small text-secondary d-flex align-items-center gap-1">
            <Spinner animation="border" size="sm" />
            Đang cập nhật...
          </span>
        )}
      </div>

      <Card.Body className="p-4">
        {warningMessage && (
          <Alert variant="warning" className="small py-2 mb-3 rounded-3 d-flex align-items-center gap-2">
            <FaExclamationTriangle className="flex-shrink-0" />
            <span>{warningMessage}</span>
          </Alert>
        )}

        {/* A. NGÀY NHẬN PHÒNG */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold small text-muted d-flex align-items-center gap-1 mb-1">
            <FaCalendarAlt style={{ color: '#d4af37' }} />
            Ngày nhận phòng (Check-in)
          </Form.Label>
          <Form.Control
            type="date"
            value={checkIn}
            min={today}
            onChange={(e) => onCheckInChange(e.target.value)}
            className="rounded-3 p-2"
            style={{ borderColor: '#e2e8f0', fontWeight: 600 }}
          />
        </Form.Group>

        {/* B. NGÀY TRẢ PHÒNG */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold small text-muted d-flex align-items-center gap-1 mb-1">
            <FaCalendarAlt style={{ color: '#d4af37' }} />
            Ngày trả phòng (Check-out)
          </Form.Label>
          <Form.Control
            type="date"
            value={checkOut}
            min={minCheckOut}
            onChange={(e) => onCheckOutChange(e.target.value)}
            className="rounded-3 p-2"
            style={{ borderColor: '#e2e8f0', fontWeight: 600 }}
          />
          {checkOut && checkOut <= checkIn && (
            <div className="text-danger small mt-1">
              Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.
            </div>
          )}
        </Form.Group>

        {/* THỜI GIAN LƯU TRÚ */}
        <div className="p-2 mb-3 bg-light rounded-3 d-flex justify-content-between align-items-center small">
          <span className="text-secondary">Thời gian lưu trú:</span>
          <strong className="text-dark">
            {nights} đêm ({checkIn} → {checkOut})
          </strong>
        </div>

        {/* C. THÔNG TIN SỐ LƯỢNG PHÒNG ĐÃ CHỌN */}
        <div className="border-top pt-3 mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-1">
              <FaBed style={{ color: '#d4af37' }} />
              Phòng đã chọn
            </h6>
            <Badge
              bg={totalRooms > 0 ? 'primary' : 'secondary'}
              className="px-2 py-1 rounded-pill"
              style={{ background: totalRooms > 0 ? '#005baa' : undefined }}
            >
              {totalRooms} phòng
            </Badge>
          </div>

          {totalRooms === 0 ? (
            <p className="text-muted small mb-0 py-2 text-center bg-light rounded-3">
              Chưa chọn phòng nào. Hãy nhấn <strong>+</strong> ở danh sách phòng bên trái để chọn.
            </p>
          ) : (
            <div className="d-flex flex-column gap-2 mb-2">
              {selectedRoomsList.map((item) => (
                <div
                  key={item._id}
                  className="p-2 rounded-3 bg-light border d-flex justify-content-between align-items-center small"
                >
                  <div>
                    <strong className="text-dark d-block">{item.name}</strong>
                    <span className="text-muted">
                      {formatPrice(item.base_price)} × {item.quantity} phòng
                    </span>
                  </div>
                  <div className="text-end">
                    <strong className="text-dark">
                      {formatPrice(item.base_price * item.quantity * nights)}
                    </strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      ({nights} đêm)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* D. THÔNG TIN GIÁ TIỀN */}
        {totalRooms > 0 && (
          <div className="border-top pt-3 mb-4">
            <h6 className="fw-bold text-dark small mb-2">Chi tiết thanh toán</h6>
            <div className="d-flex justify-content-between text-secondary small mb-1">
              <span>Tiền phòng ({nights} đêm × {totalRooms} phòng):</span>
              <span className="text-dark fw-semibold">{formatPrice(roomCost)}</span>
            </div>
            <div className="d-flex justify-content-between text-secondary small mb-2">
              <span>Thuế & phí dịch vụ (10%):</span>
              <span className="text-dark fw-semibold">{formatPrice(serviceFee)}</span>
            </div>
            <div className="pt-2 border-top d-flex justify-content-between align-items-center">
              <strong className="text-dark fs-6">Tổng thanh toán:</strong>
              <strong className="fs-5" style={{ color: '#005baa' }}>
                {formatPrice(totalAmount)}
              </strong>
            </div>
          </div>
        )}

        {/* 2.2 NÚT TIẾP TỤC ĐẶT PHÒNG */}
        <Button
          onClick={onSubmitBooking}
          disabled={isSubmitDisabled}
          className="w-100 py-3 fw-bold rounded-pill shadow-sm border-0 d-flex align-items-center justify-content-center gap-2"
          style={{
            backgroundColor: isSubmitDisabled ? '#e2e8f0' : '#005baa',
            color: isSubmitDisabled ? '#94a3b8' : '#ffffff',
            fontSize: '1rem',
            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {isNoRoomSelected ? (
            'Vui lòng chọn ít nhất 1 phòng'
          ) : (
            <>
              Tiếp tục đặt phòng
              <FaArrowRight />
            </>
          )}
        </Button>

        <div className="text-center text-muted small mt-2" style={{ fontSize: '0.78rem' }}>
          <FaShieldAlt className="text-success me-1" />
          Giữ phòng ngay mà không phát sinh thêm phụ phí ẩn
        </div>
      </Card.Body>
    </Card>
  );
};

export default BookingSummaryCard;
