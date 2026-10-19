import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Container, Row, Col, Modal, Button, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import CustomerSidebar from '../components/CustomerSidebar';
import { getMyBookings } from '../CustomerApi';

// Định dạng tiền tệ VND
const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price || 0) + ' ₫';

// Định dạng ngày hiển thị dd - dd/mm/yyyy
const formatStayDates = (checkInDate, checkOutDate) => {
  if (!checkInDate || !checkOutDate) return '';
  const dIn = new Date(checkInDate);
  const dOut = new Date(checkOutDate);

  const dayIn = String(dIn.getDate()).padStart(2, '0');
  const dayOut = String(dOut.getDate()).padStart(2, '0');
  const monthOut = String(dOut.getMonth() + 1).padStart(2, '0');
  const yearOut = dOut.getFullYear();

  return `${dayIn} – ${dayOut}/${monthOut}/${yearOut}`;
};


// Ảnh phòng mặc định ấm cúng tương tự như trên thiết kế mẫu
const DEFAULT_ROOM_IMAGE =
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';

const BookingHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Timer đồng hồ đếm ngược thời gian thực cho đơn chờ thanh toán
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Modal Đánh giá kỳ nghỉ
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Modal Thông tin hoàn tiền
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefundBooking, setSelectedRefundBooking] = useState(null);

  // Cập nhật currentTime mỗi giây để đếm ngược chính xác
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tải danh sách đơn đặt phòng
  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (user?.email) {
        params.email = user.email;
      }
      const res = await getMyBookings(params);
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử đặt phòng:', err);
      setError(
        err.response?.data?.message ||
        'Không thể tải lịch sử đặt phòng. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  // Phân loại trạng thái đặt phòng
  const categorizeBooking = (booking) => {
    const now = new Date(currentTime);
    const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;

    if (booking.bookingStatus === 'CANCELLED') {
      return 'CANCELLED';
    }

    if (booking.bookingStatus === 'PENDING_PAYMENT') {
      return 'PENDING';
    }

    if (
      booking.bookingStatus === 'COMPLETED' ||
      (booking.bookingStatus === 'CONFIRMED' && checkOut && checkOut < now)
    ) {
      return 'COMPLETED';
    }

    if (booking.bookingStatus === 'CONFIRMED') {
      return 'UPCOMING';
    }

    return 'UPCOMING';
  };

  // Tính số lượng đơn theo từng tab
  const counts = useMemo(() => {
    const c = {
      all: bookings.length,
      upcoming: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    bookings.forEach((b) => {
      const cat = categorizeBooking(b);
      if (cat === 'UPCOMING') c.upcoming += 1;
      else if (cat === 'PENDING') c.pending += 1;
      else if (cat === 'COMPLETED') c.completed += 1;
      else if (cat === 'CANCELLED') c.cancelled += 1;
    });

    return c;
  }, [bookings, currentTime]);

  // Lọc danh sách booking theo tab được chọn, sắp xếp từ mới nhất đến cũ nhất
  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (activeTab !== 'ALL') {
      list = bookings.filter((b) => categorizeBooking(b) === activeTab);
    }
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bookings, activeTab, currentTime]);

  // Lấy mốc thời gian hết hạn thanh toán (createdAt + 10 phút)
  const getExpiresTime = (booking) => {
    if (booking?.createdAt) {
      return new Date(booking.createdAt).getTime() + 10 * 60 * 1000;
    }
    return null;
  };

  // Tính thời gian đếm ngược dạng mm:ss cho đơn Chờ thanh toán chuẩn xác từng giây đồng bộ
  const getRemainingTime = (booking) => {
    const expiresAt = getExpiresTime(booking);
    if (!expiresAt) return '00:00';
    const diff = Math.max(0, expiresAt - currentTime);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Xử lý nộp đánh giá
  const handleOpenReview = (booking) => {
    setSelectedReviewBooking(booking);
    setRating(5);
    setReviewComment('');
    setReviewSubmitted(false);
    setShowReviewModal(true);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    setReviewSubmitted(true);
    setTimeout(() => {
      setShowReviewModal(false);
      setReviewSubmitted(false);
    }, 1200);
  };

  // Xử lý mở thông tin hoàn tiền
  const handleOpenRefund = (booking) => {
    setSelectedRefundBooking(booking);
    setShowRefundModal(true);
  };

  // Tabs cấu hình
  const tabList = [
    { id: 'ALL', label: `Tất cả (${counts.all})` },
    { id: 'UPCOMING', label: `Sắp tới (${counts.upcoming})` },
    { id: 'PENDING', label: `Chờ thanh toán (${counts.pending})` },
    { id: 'COMPLETED', label: `Đã hoàn thành (${counts.completed})` },
    { id: 'CANCELLED', label: `Đã hủy (${counts.cancelled})` },
  ];

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '90vh', padding: '2rem 0 4rem' }}>
      <Container>

        {/* TIÊU ĐỀ TRANG */}
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '4px',
            letterSpacing: '-0.02em',
          }}
        >
          Lịch sử đặt phòng
        </h1>
        <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '28px' }}>
          Theo dõi kỳ nghỉ, thanh toán và các yêu cầu gắn với đặt phòng của bạn.
        </p>

        {/* BỐ CỤC 2 CỘT */}
        <Row className="g-4">
          {/* CỘT TRÁI: SIDEBAR THÔNG TIN TÀI KHOẢN */}
          <Col lg={3} md={4}>
            <CustomerSidebar activeKey="bookings" />
          </Col>

          {/* CỘT PHẢI: BỘ LỌC TABS & DANH SÁCH ĐƠN PHÒNG */}
          <Col lg={9} md={8}>
            {/* THANH TABS TRẠNG THÁI */}
            <div
              className="d-flex align-items-center gap-4 flex-wrap mb-4"
              style={{
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0',
              }}
            >
              {tabList.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#0284c7' : '#64748b',
                      paddingBottom: '11px',
                      borderBottom: isActive ? '2px solid #0284c7' : '2px solid transparent',
                      marginBottom: '-1px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = '#64748b';
                    }}
                  >
                    {tab.label}
                  </div>
                );
              })}
            </div>

            {/* DANH SÁCH ĐƠN PHÒNG */}
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" style={{ width: '2.5rem', height: '2.5rem' }} />
                <div className="mt-3 text-secondary small">Đang tải lịch sử đơn đặt phòng...</div>
              </div>
            ) : error ? (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '24px',
                  color: '#991b1b',
                  textAlign: 'center',
                }}
              >
                <p className="mb-2">{error}</p>
                <Button size="sm" variant="outline-danger" onClick={fetchBookings}>
                  Thử lại
                </Button>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '48px 24px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Không có đơn đặt phòng nào trong mục này
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                  Các đơn đặt phòng của bạn sẽ hiển thị tại đây khi có phát sinh giao dịch.
                </div>
                <Link
                  to="/hotels"
                  className="btn btn-sm btn-primary px-3 py-2 rounded-2"
                  style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                >
                  Khám phá khách sạn ngay
                </Link>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {filteredBookings.map((booking) => {
                  const category = categorizeBooking(booking);
                  const detailsList = Array.isArray(booking.bookingDetails) && booking.bookingDetails.length > 0
                    ? booking.bookingDetails
                    : [];
                  const roomCount = detailsList.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0) || 1;
                  const roomName = detailsList.length > 1
                    ? `${detailsList[0].roomTypeName || 'Phòng'} (+${detailsList.length - 1} loại phòng khác)`
                    : (detailsList[0]?.roomTypeName || '');
                  const hotelName = booking.hotelName || '';
                  const totalNights = booking.totalNights || 1;
                  const stayDateStr = formatStayDates(booking.checkInDate, booking.checkOutDate);

                  // 1. Phân loại cấu hình giao diện theo trạng thái
                  let badgeConfig = {
                    text: 'Đã xác nhận',
                    style: {
                      backgroundColor: '#ecfdf5',
                      color: '#16a34a',
                      border: '1px solid #bbf7d0',
                    },
                  };

                  let detailLine = `${totalNights} đêm · ${roomCount} phòng · 2 người lớn`;
                  let paymentLine = 'Thanh toán: Đã thanh toán';
                  let actionBtn = (
                    <button
                      onClick={() =>
                        navigate(`/booking/confirmation/${booking.bookingCode}`, {
                          state: { booking },
                        })
                      }
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        color: '#1f2937',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        padding: '7px 18px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      Xem chi tiết
                    </button>
                  );

                  if (category === 'PENDING') {
                    badgeConfig = {
                      text: 'Chờ thanh toán',
                      style: {
                        backgroundColor: '#fefce8',
                        color: '#ca8a04',
                        border: '1px solid #fef08a',
                      },
                    };
                    const remainingStr = getRemainingTime(booking);
                    const expTime = getExpiresTime(booking);
                    if (expTime) {
                      const exp = new Date(expTime);
                      const expHour = String(exp.getHours()).padStart(2, '0');
                      const expMin = String(exp.getMinutes()).padStart(2, '0');
                      const expDay = String(exp.getDate()).padStart(2, '0');
                      const expMonth = String(exp.getMonth() + 1).padStart(2, '0');
                      const expYear = exp.getFullYear();
                      detailLine = `Đang giữ phòng · hết hạn ${expHour}:${expMin} ngày ${expDay}/${expMonth}/${expYear}`;
                    }
                    paymentLine = 'Thanh toán: Chưa thanh toán';
                    actionBtn = (
                      <button
                        onClick={() => {
                          navigate(`/booking/confirmation/${booking.bookingCode}`, {
                            state: { booking },
                          });
                        }}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          color: '#1f2937',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          padding: '7px 18px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        Thanh toán - còn {remainingStr}
                      </button>
                    );
                  } else if (category === 'COMPLETED') {
                    badgeConfig = {
                      text: 'Đã hoàn thành',
                      style: {
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                        border: '1px solid #e5e7eb',
                      },
                    };
                    const outDate = booking.checkOutDate ? new Date(booking.checkOutDate) : new Date();
                    const day = String(outDate.getDate()).padStart(2, '0');
                    const month = String(outDate.getMonth() + 1).padStart(2, '0');
                    const year = outDate.getFullYear();
                    detailLine = `Đã trả phòng ${day}/${month}/${year} · 12:00`;
                    paymentLine = 'Thanh toán: Đã thanh toán';
                    actionBtn = (
                      <button
                        onClick={() => handleOpenReview(booking)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          color: '#1f2937',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          padding: '7px 18px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        Đánh giá kỳ nghỉ
                      </button>
                    );
                  } else if (category === 'CANCELLED') {
                    badgeConfig = {
                      text: 'Đã hủy',
                      style: {
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                      },
                    };
                    detailLine = 'Lịch sử đặt phòng được giữ lại sau khi hủy';
                    paymentLine =
                      booking.paymentStatus === 'PAID'
                        ? 'Thanh toán: Đã thanh toán · Hoàn tiền đang xử lý'
                        : 'Thanh toán: Đã hủy';
                    actionBtn = (
                      <button
                        onClick={() => handleOpenRefund(booking)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          color: '#1f2937',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          padding: '7px 18px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        Xem thông tin hoàn tiền
                      </button>
                    );
                  }

                  return (
                    <div
                      key={booking._id || booking.bookingCode}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px 24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      {/* DÒNG TIÊU ĐỀ THẺ (MÃ ĐƠN & HUY HIỆU TRẠNG THÁI) */}
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: '#0f172a',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {booking.bookingCode}
                        </div>
                        <div
                          style={{
                            ...badgeConfig.style,
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            lineHeight: '1.4',
                          }}
                        >
                          {badgeConfig.text}
                        </div>
                      </div>

                      {/* PHẦN NỘI DUNG CHÍNH (ẢNH - THÔNG TIN - NÚT) */}
                      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-end gap-3">
                        {/* ẢNH & THÔNG TIN CHI TIẾT */}
                        <div className="d-flex gap-3 align-items-start" style={{ flex: 1, minWidth: 0 }}>
                          <img
                            src={booking.hotelImage || DEFAULT_ROOM_IMAGE}
                            alt={hotelName}
                            style={{
                              width: '135px',
                              height: '92px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '15.5px',
                                fontWeight: 700,
                                color: '#0f172a',
                                marginBottom: '3px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {hotelName}
                            </div>
                            <div
                              style={{
                                fontSize: '13px',
                                color: '#475569',
                                marginBottom: '4px',
                              }}
                            >
                              {roomName} · {stayDateStr}
                            </div>
                            <div
                              style={{
                                fontSize: '12.5px',
                                color: '#64748b',
                                marginBottom: '3px',
                              }}
                            >
                              {detailLine}
                            </div>
                            <div
                              style={{
                                fontSize: '12.5px',
                                color: '#64748b',
                                marginBottom: '6px',
                              }}
                            >
                              {paymentLine}
                            </div>
                            <div
                              style={{
                                fontSize: '15.5px',
                                fontWeight: 700,
                                color: '#0f172a',
                              }}
                            >
                              {formatPrice(booking.totalAmount)}
                            </div>
                          </div>
                        </div>

                        {/* NÚT HÀNH ĐỘNG GÓC PHẢI */}
                        <div className="text-end" style={{ flexShrink: 0 }}>
                          {actionBtn}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* HỘP LƯU Ý MÀU XANH DƯỚI CÙNG */}
            <div
              style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '13px 20px',
                marginTop: '28px',
                color: '#0284c7',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Chỉ đặt phòng đã hoàn thành và chưa đánh giá mới có thể gửi đánh giá. Đặt phòng hết hạn giữ phòng không thể tiếp tục thanh toán.
            </div>
          </Col>
        </Row>
      </Container>

      {/* MODAL ĐÁNH GIÁ KỲ NGHỈ */}
      <Modal
        show={showReviewModal}
        onHide={() => setShowReviewModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
            Đánh giá kỳ nghỉ
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          {reviewSubmitted ? (
            <div className="text-center py-4 text-success">
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>✓</div>
              <h6 className="fw-bold mb-1">Cảm ơn bạn đã gửi đánh giá!</h6>
              <p className="small text-muted mb-0">Đánh giá của bạn giúp VinaStay hoàn thiện chất lượng dịch vụ mỗi ngày.</p>
            </div>
          ) : (
            <Form onSubmit={handleSubmitReview}>
              <div className="mb-3">
                <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#1e293b' }}>
                  {selectedReviewBooking?.hotelName || 'Khách sạn'}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Mã đơn: {selectedReviewBooking?.bookingCode}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">Chấm điểm kỳ nghỉ của bạn:</label>
                <div className="d-flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      size={24}
                      style={{
                        cursor: 'pointer',
                        color: star <= rating ? '#eab308' : '#e2e8f0',
                        transition: 'color 0.15s ease',
                      }}
                      onClick={() => setRating(star)}
                    />
                  ))}
                  <span className="ms-2 small fw-semibold text-secondary align-self-center">
                    {rating === 5 ? 'Tuyệt vời (5/5)' : rating === 4 ? 'Rất tốt (4/5)' : rating === 3 ? 'Hài lòng (3/5)' : 'Chưa tốt'}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">Chia sẻ cảm nhận chi tiết:</label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Không gian phòng, thái độ nhân viên, vị trí và dịch vụ tại khách sạn..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  style={{ fontSize: '13px', borderRadius: '8px' }}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                <Button variant="light" size="sm" onClick={() => setShowReviewModal(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                >
                  Gửi đánh giá
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* MODAL THÔNG TIN HOÀN TIỀN */}
      <Modal
        show={showRefundModal}
        onHide={() => setShowRefundModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
            Thông tin hoàn tiền
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          {selectedRefundBooking && (
            <div className="small">
              <div className="p-3 rounded-2 mb-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Mã đơn phòng:</span>
                  <strong>{selectedRefundBooking.bookingCode}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Khách sạn:</span>
                  <strong>{selectedRefundBooking.hotelName}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Số tiền hoàn trả:</span>
                  <strong className="text-success">{formatPrice(selectedRefundBooking.totalAmount)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Phương thức hoàn:</span>
                  <span>Cổng thanh toán VNPAY / Tài khoản nguồn</span>
                </div>
              </div>

              <div className="text-secondary mb-3">
                <div className="fw-semibold text-dark mb-1">Tiến độ xử lý hoàn tiền:</div>
                <ul className="ps-3 mb-0">
                  <li>Yêu cầu hủy phòng đã được hệ thống tiếp nhận thành công.</li>
                  <li>Lệnh hoàn tiền đang được đối soát tự động cùng ngân hàng liên kết.</li>
                  <li>Thời gian tiền về tài khoản: từ <strong>3 đến 5 ngày làm việc</strong> (không tính Thứ 7, Chủ nhật).</li>
                </ul>
              </div>

              <div className="text-end border-top pt-3">
                <Button variant="secondary" size="sm" onClick={() => setShowRefundModal(false)}>
                  Đã hiểu
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default BookingHistoryPage;
