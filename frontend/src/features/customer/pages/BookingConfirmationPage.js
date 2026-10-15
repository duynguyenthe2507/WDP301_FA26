import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { FaCheckCircle, FaHotel, FaCalendarAlt, FaUser, FaBed, FaPrint, FaHome, FaCreditCard, FaFileAlt, FaHistory, FaTimesCircle, FaClock } from 'react-icons/fa';
import { getBookingByCode } from '../CustomerApi';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

const BookingConfirmationPage = () => {
  const { bookingCode } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!booking && bookingCode) {
      setLoading(true);
      getBookingByCode(bookingCode)
        .then((res) => {
          setBooking(res.data?.booking);
        })
        .catch((err) => {
          console.error('Lỗi khi tải thông tin đơn đặt phòng:', err);
          setError(err.response?.data?.message || 'Không tìm thấy thông tin đơn đặt phòng');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [bookingCode, booking]);

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-secondary small">Đang tải phiếu xác nhận đặt phòng...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <Container className="py-5" style={{ minHeight: '60vh' }}>
        <Alert variant="danger" className="text-center p-4 rounded-3 border-0 shadow-sm">
          <h5 className="fw-bold mb-2">Không tìm thấy đơn đặt phòng</h5>
          <p className="small mb-3">{error || 'Mã đơn không tồn tại hoặc đã bị hủy.'}</p>
          <Link to="/" className="btn btn-outline-secondary btn-sm">
            Quay về trang chủ
          </Link>
        </Alert>
      </Container>
    );
  }

  const roomDetail = booking.bookingDetails?.[0] || {};
  const isCancelled = booking.bookingStatus === 'CANCELLED';
  const isPaid = !isCancelled && (booking.paymentStatus === 'PAID' || booking.bookingStatus === 'CONFIRMED');
  const isPending = !isCancelled && !isPaid;

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '90vh', padding: '2.5rem 0 4rem' }}>
      <Container style={{ maxWidth: '850px' }}>
        {/* THANH THÔNG BÁO TRẠNG THÁI */}
        <div className="bg-white p-4 rounded-3 shadow-sm border mb-4 text-center">
          {isPaid ? (
            <>
              <FaCheckCircle className="text-success mb-2" size={48} />
              <h4 className="fw-bold text-dark mb-1">Xác Nhận Đặt Phòng Thành Công</h4>
              <p className="text-muted small mb-3">
                Đơn phòng đã được ghi nhận trên hệ thống và thanh toán hoàn tất qua <strong>VNPAY</strong>.
              </p>
            </>
          ) : isCancelled ? (
            <>
              <FaTimesCircle className="text-danger mb-2" size={48} />
              <h4 className="fw-bold text-danger mb-1">Đơn Đặt Phòng Đã Bị Hủy</h4>
              <p className="text-muted small mb-3">
                Đơn đặt phòng này đã được hủy trên hệ thống.
                {booking.cancellationReason && ` Lý do hủy: ${booking.cancellationReason}.`}
              </p>
            </>
          ) : (
            <>
              <FaClock className="text-warning mb-2" size={48} />
              <h4 className="fw-bold text-warning mb-1">Đơn Đặt Phòng Đang Chờ Thanh Toán</h4>
              <p className="text-muted small mb-3">
                Đơn phòng của bạn đã được khởi tạo thành công nhưng <strong>chưa được thanh toán</strong>. Vui lòng hoàn tất thanh toán để khách sạn giữ phòng cho bạn.
              </p>
            </>
          )}

          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-light border rounded-pill">
            <span className="text-secondary small">Mã đặt phòng:</span>
            <strong className="text-primary font-monospace">{booking.bookingCode}</strong>
          </div>
        </div>

        {/* PHIẾU XÁC NHẬN (VOUCHER) */}
        <Card className="border-0 shadow-sm rounded-3 bg-white mb-4 overflow-hidden">
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <FaFileAlt className="text-primary" />
              {isPaid ? 'Phiếu xác nhận đặt phòng & Hóa đơn' : 'Thông tin chi tiết đơn đặt phòng'}
            </h6>
            {isPaid ? (
              <Badge bg="success" className="px-3 py-2 fw-semibold">
                ĐÃ THANH TOÁN & XÁC NHẬN
              </Badge>
            ) : isCancelled ? (
              <Badge bg="danger" className="px-3 py-2 fw-semibold">
                ĐÃ HỦY
              </Badge>
            ) : (
              <Badge bg="warning" text="dark" className="px-3 py-2 fw-semibold">
                CHỜ THANH TOÁN
              </Badge>
            )}
          </Card.Header>

          <Card.Body className="p-4">
            {/* THÔNG TIN KHÁCH SẠN */}
            <div className="mb-4 pb-3 border-bottom">
              <h5 className="fw-bold text-dark mb-1">{booking.hotelName}</h5>
              <div className="text-muted small">{booking.hotelAddress || 'Địa chỉ khách sạn đối tác'}</div>
            </div>

            {/* THÔNG TIN PHÒNG & NGÀY */}
            <Row className="g-3 mb-4 pb-3 border-bottom">
              <Col md={6}>
                <div className="p-3 bg-light rounded-3">
                  <div className="text-secondary small mb-1">
                    <FaCalendarAlt className="me-1 text-primary" /> Nhận phòng (Check-in)
                  </div>
                  <strong className="text-dark d-block">
                    {new Date(booking.checkInDate).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </strong>
                  <small className="text-muted">Từ 14:00</small>
                </div>
              </Col>

              <Col md={6}>
                <div className="p-3 bg-light rounded-3">
                  <div className="text-secondary small mb-1">
                    <FaCalendarAlt className="me-1 text-danger" /> Trả phòng (Check-out)
                  </div>
                  <strong className="text-dark d-block">
                    {new Date(booking.checkOutDate).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </strong>
                  <small className="text-muted">Trước 12:00</small>
                </div>
              </Col>

              <Col md={12}>
                <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3">
                  <div>
                    <strong className="text-dark d-block">
                      <FaBed className="text-primary me-2" />
                      {roomDetail.roomTypeName || 'Phòng Deluxe'}
                    </strong>
                    <span className="text-secondary small">
                      Số lượng: {roomDetail.quantity || 1} phòng • Thời gian lưu trú: {booking.totalNights} đêm
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="text-secondary small d-block">Đơn giá / đêm</span>
                    <strong className="text-dark">{formatPrice(roomDetail.pricePerNight || 0)}</strong>
                  </div>
                </div>
              </Col>
            </Row>

            {/* THÔNG TIN NGƯỜI ĐẶT & KHÁCH NHẬN PHÒNG */}
            <Row className="g-3 mb-4 pb-3 border-bottom">
              <Col md={6}>
                <h6 className="fw-bold text-dark small mb-2">Thông tin người đặt</h6>
                <div className="small">
                  <div><span className="text-secondary">Họ tên:</span> <strong>{booking.bookerInfo?.fullName}</strong></div>
                  <div><span className="text-secondary">Điện thoại:</span> <strong>{booking.bookerInfo?.phoneNumber}</strong></div>
                  <div><span className="text-secondary">Email:</span> <strong>{booking.bookerInfo?.email}</strong></div>
                </div>
              </Col>

              <Col md={6}>
                <h6 className="fw-bold text-dark small mb-2">
                  Khách lưu trú nhận phòng{' '}
                  <span className="badge bg-light text-secondary border fw-normal">
                    {booking.isSelfGuest ? 'Chính chủ' : 'Người khác'}
                  </span>
                </h6>
                <div className="small">
                  {booking.isSelfGuest ? (
                    <div>
                      <span className="text-secondary">Người nhận phòng:</span>{' '}
                      <strong>{booking.bookerInfo?.fullName}</strong> ({booking.bookerInfo?.phoneNumber})
                    </div>
                  ) : (
                    <div>
                      <div><span className="text-secondary">Họ tên:</span> <strong>{booking.guestInfo?.fullName}</strong></div>
                      <div><span className="text-secondary">Điện thoại:</span> <strong>{booking.guestInfo?.phoneNumber}</strong></div>
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            {/* YÊU CẦU ĐẶC BIỆT CHO KHÁCH SẠN (DÙNG CHUNG CẢ ĐƠN PHÒNG) */}
            {Boolean(booking.specialRequests) && (
              <div className="mb-4 pb-3 border-bottom">
                <h6 className="fw-bold text-dark small mb-2 d-flex align-items-center gap-2">
                  <FaFileAlt className="text-primary" /> Yêu cầu đặc biệt cho khách sạn (Special Requests)
                </h6>
                <div className="p-3 bg-light rounded-3 small text-dark border">
                  "{booking.specialRequests || booking.notes || booking.guestInfo?.notes}"
                </div>
              </div>
            )}

            {/* THÔNG TIN THANH TOÁN */}
            <div>
              <h6 className="fw-bold text-dark small mb-3">
                {isPaid ? 'Chi tiết thanh toán VNPAY' : 'Thông tin thanh toán'}
              </h6>
              <div className="d-flex flex-column gap-2 small">
                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Phương thức:</span>
                  <strong>Cổng thanh toán VNPAY</strong>
                </div>

                <div className="d-flex justify-content-between">
                  <span className="text-secondary">Trạng thái thanh toán:</span>
                  {isPaid ? (
                    <Badge bg="success">Đã thanh toán thành công</Badge>
                  ) : isCancelled ? (
                    <Badge bg="danger">Đơn đã hủy</Badge>
                  ) : (
                    <Badge bg="warning" text="dark">Chưa thanh toán</Badge>
                  )}
                </div>

                {isPaid && booking.vnpayTransaction?.vnp_TransactionNo && (
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Mã giao dịch VNPAY:</span>
                    <strong className="text-primary font-monospace">
                      {booking.vnpayTransaction.vnp_TransactionNo}
                    </strong>
                  </div>
                )}

                {isPaid && booking.vnpayTransaction?.vnp_BankCode && (
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Ngân hàng thanh toán:</span>
                    <strong>{booking.vnpayTransaction.vnp_BankCode}</strong>
                  </div>
                )}

                {isPaid && booking.vnpayTransaction?.vnp_PayDate && (
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Thời gian thanh toán:</span>
                    <span>{booking.vnpayTransaction.vnp_PayDate}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between pt-2 border-top fs-6">
                  <span className="fw-bold text-dark">
                    {isPaid ? 'Tổng tiền đã thanh toán:' : 'Tổng tiền cần thanh toán:'}
                  </span>
                  <span className={`fw-bold fs-5 ${isPaid ? 'text-success' : isPending ? 'text-danger' : 'text-secondary'}`}>
                    {formatPrice(booking.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* NÚT HÀNH ĐỘNG */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <Link to="/" className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1">
            <FaHome /> Quay về trang chủ
          </Link>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/booking-history" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1">
              <FaHistory /> Lịch sử đặt phòng
            </Link>

            {isPending && (
              <Button
                as={Link}
                to="/booking"
                state={{ booking }}
                size="sm"
                variant="warning"
                className="fw-semibold d-inline-flex align-items-center gap-1"
              >
                <FaCreditCard /> Thanh toán ngay
              </Button>
            )}

            {isPaid && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => window.print()}
                className="d-inline-flex align-items-center gap-1"
              >
                <FaPrint /> In hóa đơn
              </Button>
            )}

            <Link to="/hotels" className="btn btn-primary btn-sm px-3" style={{ backgroundColor: '#005baa', borderColor: '#005baa' }}>
              Đặt thêm phòng khác
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default BookingConfirmationPage;
