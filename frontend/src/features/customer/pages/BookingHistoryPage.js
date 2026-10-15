import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, InputGroup, Spinner, Alert, Nav } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaHotel,
  FaBed,
  FaMoneyBillWave,
  FaFileInvoice,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUser,
  FaPhoneAlt,
  FaEnvelope,
  FaArrowLeft,
  FaSuitcaseRolling,
  FaRedo,
  FaCopy,
} from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import { getMyBookings } from '../CustomerApi';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const BookingHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchBookings = async (statusFilter = selectedStatus, search = searchTerm) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (search && search.trim()) {
        params.search = search.trim();
      }
      // Nếu chưa đăng nhập nhưng có nhập email tra cứu
      if (!user && guestEmail.trim()) {
        params.email = guestEmail.trim();
      }

      const res = await getMyBookings(params);
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử đặt phòng:', err);
      setError(err.response?.data?.message || 'Không thể tải lịch sử đặt phòng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(selectedStatus, searchTerm);
  }, [user, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBookings(selectedStatus, searchTerm);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (bookingStatus, paymentStatus) => {
    if (bookingStatus === 'CONFIRMED' || paymentStatus === 'PAID') {
      return (
        <Badge bg="success" className="px-3 py-2 fs-7 fw-semibold d-inline-flex align-items-center gap-1">
          <FaCheckCircle /> Đã thanh toán & Xác nhận
        </Badge>
      );
    }
    if (bookingStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
      return (
        <Badge bg="danger" className="px-3 py-2 fs-7 fw-semibold d-inline-flex align-items-center gap-1">
          <FaTimesCircle /> Đã hủy / Thất bại
        </Badge>
      );
    }
    return (
      <Badge bg="warning" text="dark" className="px-3 py-2 fs-7 fw-semibold d-inline-flex align-items-center gap-1">
        <FaClock /> Chờ thanh toán
      </Badge>
    );
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '90vh', padding: '2.5rem 0 4rem' }}>
      <Container>
        {/* THANH ĐIỀU HƯỚNG BREADCRUMB */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <Link to="/" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-1">
              <FaArrowLeft size={12} /> Quay lại trang chủ
            </Link>
            <h2 className="fw-bold text-dark mb-1">Lịch Sử Đặt Phòng</h2>
            <p className="text-secondary small mb-0">
              Quản lý và theo dõi trạng thái các đơn đặt phòng khách sạn của bạn tại VinaStay.
            </p>
          </div>
          <Link
            to="/hotels"
            className="btn btn-primary px-3 py-2 rounded-pill fw-semibold shadow-sm d-none d-sm-inline-flex align-items-center gap-2"
            style={{ backgroundColor: '#005baa', borderColor: '#005baa' }}
          >
            <FaHotel /> Đặt thêm khách sạn
          </Link>
        </div>

        {/* THÔNG BÁO TRA CỨU KHI CHƯA ĐĂNG NHẬP */}
        {!user && (
          <Alert variant="info" className="border-0 shadow-sm rounded-3 mb-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <strong>Bạn chưa đăng nhập?</strong>
                <div className="small text-muted mt-1">
                  Đăng nhập để đồng bộ toàn bộ đơn phòng, hoặc nhập địa chỉ email bạn đã dùng khi đặt phòng để tra cứu nhanh.
                </div>
              </div>
              <div className="d-flex gap-2">
                <Form onSubmit={handleSearchSubmit} className="d-flex gap-2">
                  <Form.Control
                    size="sm"
                    type="email"
                    placeholder="Nhập email người đặt..."
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    style={{ minWidth: '220px' }}
                  />
                  <Button size="sm" variant="primary" type="submit" style={{ backgroundColor: '#005baa', borderColor: '#005baa' }}>
                    Tìm
                  </Button>
                </Form>
                <Link to="/login" className="btn btn-sm btn-outline-primary fw-semibold">
                  Đăng nhập
                </Link>
              </div>
            </div>
          </Alert>
        )}

        {/* BỘ LỌC TRẠNG THÁI & TÌM KIẾM */}
        <Card className="border-0 shadow-sm rounded-3 mb-4 bg-white">
          <Card.Body className="p-3">
            <Row className="g-3 align-items-center justify-content-between">
              <Col md={7}>
                <Nav variant="pills" activeKey={selectedStatus} onSelect={(k) => setSelectedStatus(k || 'ALL')} className="gap-2">
                  <Nav.Item>
                    <Nav.Link eventKey="ALL" className="rounded-pill px-3 py-1 text-sm">
                      Tất cả
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="CONFIRMED" className="rounded-pill px-3 py-1 text-sm">
                      Đã xác nhận
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="PENDING_PAYMENT" className="rounded-pill px-3 py-1 text-sm">
                      Chờ thanh toán
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="CANCELLED" className="rounded-pill px-3 py-1 text-sm">
                      Đã hủy
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>

              <Col md={5}>
                <Form onSubmit={handleSearchSubmit}>
                  <InputGroup size="sm">
                    <Form.Control
                      placeholder="Tìm theo mã phòng hoặc tên khách sạn..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-end-0 rounded-start-pill ps-3"
                    />
                    <Button
                      type="submit"
                      variant="outline-secondary"
                      className="rounded-end-pill px-3 border-start-0"
                    >
                      <FaSearch />
                    </Button>
                  </InputGroup>
                </Form>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* DANH SÁCH ĐƠN ĐẶT PHÒNG */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
            <h6 className="mt-3 text-secondary fw-semibold">Đang tải lịch sử đơn đặt phòng...</h6>
          </div>
        ) : error ? (
          <Alert variant="danger" className="text-center py-4 rounded-3 border-0 shadow-sm">
            <p className="mb-2">{error}</p>
            <Button size="sm" variant="outline-danger" onClick={() => fetchBookings()} className="d-inline-flex align-items-center gap-1">
              <FaRedo /> Thử lại
            </Button>
          </Alert>
        ) : bookings.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-3 bg-white text-center py-5">
            <Card.Body>
              <div className="mb-3 text-muted">
                <FaSuitcaseRolling size={64} style={{ opacity: 0.35, color: '#005baa' }} />
              </div>
              <h5 className="fw-bold text-dark">Chưa có đơn đặt phòng nào</h5>
              <p className="text-secondary small mb-4" style={{ maxWidth: '420px', margin: '0 auto' }}>
                {searchTerm || selectedStatus !== 'ALL'
                  ? 'Không tìm thấy đơn đặt phòng nào phù hợp với bộ lọc hiện tại. Bạn hãy thử bỏ bộ lọc.'
                  : 'Bạn chưa thực hiện đơn đặt phòng nào trên VinaStay. Hãy khám phá ngay các khách sạn sang trọng với ưu đãi tốt nhất!'}
              </p>
              <Link
                to="/hotels"
                className="btn btn-primary px-4 py-2 fw-semibold rounded-pill shadow-sm"
                style={{ backgroundColor: '#005baa', borderColor: '#005baa' }}
              >
                Khám phá khách sạn ngay
              </Link>
            </Card.Body>
          </Card>
        ) : (
          <div className="d-flex flex-column gap-3">
            {bookings.map((booking) => {
              const roomDetail = booking.bookingDetails?.[0] || {};
              const isCancelled = booking.bookingStatus === 'CANCELLED';
              const isPaid = !isCancelled && (booking.paymentStatus === 'PAID' || booking.bookingStatus === 'CONFIRMED');
              const isPending = !isCancelled && !isPaid;

              return (
                <Card key={booking._id || booking.bookingCode} className="border-0 shadow-sm rounded-3 overflow-hidden bg-white">
                  {/* HEADER CARD */}
                  <div
                    className="p-3 px-md-4 d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom"
                    style={{ backgroundColor: '#fafbfc' }}
                  >
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="text-secondary small">Mã đơn:</span>
                      <strong className="text-dark font-monospace fs-6">{booking.bookingCode}</strong>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-muted"
                        title="Sao chép mã"
                        onClick={() => handleCopyCode(booking.bookingCode)}
                      >
                        <FaCopy size={14} className={copiedCode === booking.bookingCode ? 'text-success' : ''} />
                      </Button>
                      {copiedCode === booking.bookingCode && (
                        <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>Đã chép!</span>
                      )}
                      <span className="text-muted d-none d-md-inline">•</span>
                      <small className="text-muted">
                        Ngày đặt: {new Date(booking.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </small>
                    </div>

                    <div>{getStatusBadge(booking.bookingStatus, booking.paymentStatus)}</div>
                  </div>

                  {/* BODY CARD */}
                  <Card.Body className="p-3 p-md-4">
                    <Row className="g-3 align-items-center">
                      {/* Cột 1: Thông tin khách sạn & phòng */}
                      <Col lg={5}>
                        <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                          <FaHotel className="text-primary" />
                          {booking.hotelName || 'Khách sạn VinaStay'}
                        </h5>
                        <p className="text-muted small mb-2 text-truncate" title={booking.hotelAddress}>
                          {booking.hotelAddress || 'Địa chỉ đang cập nhật'}
                        </p>

                        <div className="bg-light p-2 rounded-2 small text-secondary">
                          <FaBed className="text-primary me-1" />
                          <strong className="text-dark">{roomDetail.roomTypeName || 'Phòng Deluxe'}</strong>
                          <span className="ms-1">({roomDetail.quantity || 1} phòng • {booking.totalNights || 1} đêm)</span>
                        </div>
                      </Col>

                      {/* Cột 2: Thời gian lưu trú & Khách */}
                      <Col sm={6} lg={4}>
                        <div className="d-flex flex-column gap-2 small">
                          <div className="d-flex align-items-center gap-2">
                            <FaCalendarAlt className="text-primary" />
                            <div>
                              <span className="text-muted">Nhận phòng: </span>
                              <strong className="text-dark">{formatDate(booking.checkInDate)}</strong>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <FaCalendarAlt className="text-danger" />
                            <div>
                              <span className="text-muted">Trả phòng: </span>
                              <strong className="text-dark">{formatDate(booking.checkOutDate)}</strong>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 text-muted">
                            <FaUser size={12} />
                            <span>Khách: <strong className="text-dark">{booking.bookerInfo?.fullName || 'Khách hàng'}</strong></span>
                          </div>
                        </div>
                      </Col>

                      {/* Cột 3: Giá tiền & Nút hành động */}
                      <Col sm={6} lg={3} className="text-sm-end">
                        <div className="mb-2">
                          <span className="text-secondary small d-block">Tổng chi phí</span>
                          <strong className="text-primary fs-4 fw-bold">{formatPrice(booking.totalAmount)}</strong>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-lg-end gap-2">
                          <Link
                            to={`/booking/confirmation/${booking.bookingCode}`}
                            state={{ booking }}
                            className="btn btn-outline-primary btn-sm px-3 fw-semibold d-inline-flex align-items-center justify-content-center gap-1"
                          >
                            <FaFileInvoice /> {isPaid ? 'Xem hóa đơn' : 'Xem chi tiết'}
                          </Link>

                          {isPending && (
                            <Button
                              as={Link}
                              to="/booking"
                              state={{ booking }}
                              size="sm"
                              variant="warning"
                              className="fw-semibold d-inline-flex align-items-center justify-content-center gap-1"
                            >
                              <FaRedo /> Thanh toán ngay
                            </Button>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default BookingHistoryPage;
