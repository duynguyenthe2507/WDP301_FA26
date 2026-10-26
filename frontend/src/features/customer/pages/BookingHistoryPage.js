import React, { useState, useEffect, useContext, useMemo } from 'react';
import { BLANK_IMG, imgBg, onImgError } from '../imageFallback';
import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import CustomerSidebar from '../components/CustomerSidebar';
import { getMyBookings, getMyReviews } from '../CustomerApi';

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



const BookingHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [reviewedIds, setReviewedIds] = useState(new Set());

  // Timer đồng hồ đếm ngược thời gian thực cho đơn chờ thanh toán
  const [currentTime, setCurrentTime] = useState(Date.now());


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
    getMyReviews()
      .then((res) =>
        setReviewedIds(
          new Set((res.data?.reviews || []).map((r) => String(r.bookingId?._id || r.bookingId)))
        )
      )
      .catch(() => { }); // lỗi tải đánh giá: mặc định hiện nút "Đánh giá kỳ nghỉ"
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

  // Lấy mốc thời gian hết hạn thanh toán (createdAt + 15 phút)
  const getExpiresTime = (booking) => {
    if (booking?.createdAt) {
      return new Date(booking.createdAt).getTime() + 15 * 60 * 1000;
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
      <Container style={{ maxWidth: '1440px' }}>

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

                  const totalAdults = booking.totalAdults || detailsList.reduce((sum, r) => sum + (Number(r.adults) || 1), 0) || 2;
                  const totalChildren = booking.totalChildren || detailsList.reduce((sum, r) => sum + (Number(r.children) || 0), 0) || 0;
                  const guestsText = `${totalAdults} người lớn${totalChildren > 0 ? `, ${totalChildren} trẻ em` : ''}`;

                  let detailLine = `${totalNights} đêm · ${roomCount} phòng · ${guestsText}`;
                  let paymentLine = 'Thanh toán: Đã thanh toán';
                  let actionBtn = (
                    <div className="d-flex flex-wrap gap-2 justify-content-end">
                      <button
                        onClick={() =>
                          navigate(`/booking/cancel/${booking.bookingCode || booking._id}`)
                        }
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          padding: '7px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        Hủy đặt phòng
                      </button>
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
                    </div>
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
                        onClick={() =>
                          navigate(
                            reviewedIds.has(String(booking._id))
                              ? '/my-reviews'
                              : `/write-review/${booking._id}`
                          )
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
                        {reviewedIds.has(String(booking._id)) ? 'Xem đánh giá' : 'Đánh giá kỳ nghỉ'}
                      </button>
                    );
                  } else if (category === 'CANCELLED') {
                    badgeConfig = {
                      text: 'Đã hủy',
                      style: {
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                      },
                    };
                    detailLine = 'Lịch sử đặt phòng được giữ lại sau khi hủy';
                    paymentLine =
                      booking.paymentStatus === 'PAID'
                        ? 'Thanh toán: Đã thanh toán · Hoàn tiền đang xử lý'
                        : 'Thanh toán: Đã hủy';
                    actionBtn = (
                      <button
                        onClick={() => navigate(`/booking/confirmation/${booking.bookingCode}`, { state: { booking } })}
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
                            src={booking.hotelImage || BLANK_IMG}
                            alt={hotelName}
                            onError={onImgError}
                            style={{
                              ...imgBg,
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
    </div>
  );
};

export default BookingHistoryPage;
