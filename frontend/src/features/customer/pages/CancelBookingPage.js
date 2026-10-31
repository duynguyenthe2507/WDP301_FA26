import React, { useState, useEffect, useMemo } from 'react';
import { BLANK_IMG, imgBg, onImgError } from '../imageFallback';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Spinner, Button } from 'react-bootstrap';
import CustomerSidebar from '../components/CustomerSidebar';
import { getCancelBookingInfo, cancelBooking } from '../CustomerApi';

// Định dạng tiền tệ VND
const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price || 0) + ' ₫';

// Định dạng khoảng thời gian dd/mm – dd/mm/yyyy
const formatStayRange = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return '';
  const dIn = new Date(checkIn);
  const dOut = new Date(checkOut);
  const dayIn = String(dIn.getDate()).padStart(2, '0');
  const monthIn = String(dIn.getMonth() + 1).padStart(2, '0');
  const dayOut = String(dOut.getDate()).padStart(2, '0');
  const monthOut = String(dOut.getMonth() + 1).padStart(2, '0');
  const yearOut = dOut.getFullYear();

  return `${dayIn}/${monthIn} – ${dayOut}/${monthOut}/${yearOut}`;
};


const CANCELLATION_REASONS = [
  'Thay đổi lịch trình *',
  'Tìm được giá tốt hơn hoặc nơi ở khác',
  'Lý do cá nhân / Sức khỏe',
  'Thời tiết xấu hoặc sự cố phương tiện di chuyển',
  'Kế hoạch chuyến đi bị hủy bỏ',
  'Lý do khác',
];

const CancelBookingPage = () => {
  const { bookingId, bookingCode } = useParams();
  const navigate = useNavigate();
  const idOrCode = bookingId || bookingCode;

  const [booking, setBooking] = useState(null);
  const [hotelInfo, setHotelInfo] = useState(null);
  const [calculations, setCalculations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
  const [cancellationNote, setCancellationNote] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tải dữ liệu đặt phòng & chính sách hủy từ backend
  useEffect(() => {
    if (!idOrCode) {
      setError('Không tìm thấy mã đơn đặt phòng.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    getCancelBookingInfo(idOrCode)
      .then((res) => {
        if (res.data?.success) {
          setBooking(res.data.booking);
          setHotelInfo(res.data.hotelInfo);
          setCalculations(res.data.calculations);
        } else {
          setError(res.data?.message || 'Không thể tải thông tin hủy phòng.');
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải thông tin hủy đặt phòng:', err);
        setError(
          err.response?.data?.message ||
          'Không tìm thấy thông tin đơn đặt phòng hoặc bạn không có quyền thao tác.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [idOrCode]);

  // Xử lý gửi yêu cầu hủy đặt phòng
  const handleConfirmCancel = async () => {
    if (!agreed) {
      alert('Vui lòng xác nhận đã đọc chính sách hủy và thông tin hoàn tiền.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanReason = selectedReason.replace(/\s*\*$/, '').trim();
      const payload = {
        reason: cleanReason,
        note: cancellationNote.trim(),
      };

      const res = await cancelBooking(idOrCode, payload);
      if (res.data?.success) {
        navigate(`/booking/confirmation/${booking.bookingCode}`, { replace: true, state: { booking: res.data.booking } });
      } else {
        alert(res.data?.message || 'Có lỗi xảy ra khi hủy phòng.');
      }
    } catch (err) {
      console.error('Lỗi khi hủy đặt phòng:', err);
      alert(
        err.response?.data?.message ||
        'Không thể thực hiện hủy phòng lúc này. Vui lòng thử lại sau.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Tính toán số lượng khách và phòng
  const guestsAndRoomsText = useMemo(() => {
    if (!booking) return '';
    const adults = booking.guestCounts?.adults || 2;
    const children = booking.guestCounts?.children || 0;
    const totalRooms = Array.isArray(booking.bookingDetails)
      ? booking.bookingDetails.reduce((sum, d) => sum + (Number(d.quantity) || 1), 0)
      : 1;
    const totalNights = booking.totalNights || 1;

    return `${adults} người lớn · ${children} trẻ em · ${totalRooms} phòng · ${totalNights} đêm`;
  }, [booking]);

  // Render số sao
  const renderStars = (count = 4) => {
    const stars = Math.max(1, Math.min(5, Number(count) || 4));
    return '★'.repeat(stars);
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '92vh', padding: '2.5rem 0 5rem' }}>
      <Container style={{ maxWidth: '1360px' }}>
        {/* TIÊU ĐỀ TRANG */}
        <div className="mb-4">
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
            }}
          >
            Xác nhận hủy đặt phòng
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Kiểm tra chính sách và số tiền hoàn dự kiến trước khi xác nhận.
          </p>
        </div>

        <Row className="g-4">
          {/* CỘT TRÁI: SIDEBAR KHÁCH HÀNG */}
          <Col lg={3} md={4}>
            <CustomerSidebar activeKey="bookings" />
          </Col>

          {/* CỘT PHẢI: NỘI DUNG CHÍNH */}
          <Col lg={9} md={8}>
            {loading ? (
              <div
                className="d-flex flex-column align-items-center justify-content-center py-5 bg-white rounded-3 border"
                style={{ minHeight: '360px' }}
              >
                <Spinner animation="border" variant="danger" />
                <div className="mt-3 text-muted small">Đang tải thông tin đặt phòng & chính sách...</div>
              </div>
            ) : error ? (
              <div
                className="bg-white rounded-3 border p-4 text-center"
                style={{ borderColor: '#fecaca' }}
              >
                <div className="text-danger fs-5 fw-bold mb-2">Không thể tiếp tục</div>
                <div className="text-muted mb-4">{error}</div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => navigate('/booking-history')}
                >
                  Quay lại Đặt phòng của tôi
                </Button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {/* 1. THẺ THÔNG TIN KỲ NGHỈ */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '17.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '18px',
                    }}
                  >
                    Thông tin kỳ nghỉ
                  </h2>

                  {/* THÔNG TIN KHÁCH SẠN */}
                  <div className="d-flex gap-3 align-items-start mb-4">
                    <img
                      src={hotelInfo?.thumbnail || booking?.hotelImage || BLANK_IMG}
                      alt={hotelInfo?.name || booking?.hotelName}
                      onError={onImgError}
                      style={{
                        ...imgBg,
                        width: '136px',
                        height: '92px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '16.5px',
                          fontWeight: 700,
                          color: '#0f172a',
                          marginBottom: '4px',
                        }}
                      >
                        {hotelInfo?.name || booking?.hotelName}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#475569',
                          marginBottom: '4px',
                        }}
                      >
                        <span style={{ color: '#f59e0b', marginRight: '6px' }}>
                          {renderStars(hotelInfo?.starRating)}
                        </span>
                        · {hotelInfo?.address || booking?.hotelAddress}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#64748b',
                        }}
                      >
                        {hotelInfo?.roomDetailsInfo ||
                          booking?.bookingDetails?.[0]?.roomTypeName ||
                          'Phòng tiêu chuẩn'}
                      </div>
                    </div>
                  </div>

                  {/* VẠCH KẺ PHÂN CÁCH */}
                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '16px 0 18px' }} />

                  {/* CHI TIẾT ĐƠN PHÒNG */}
                  <div className="d-flex flex-column gap-2" style={{ fontSize: '13.5px' }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: '#64748b', width: '180px' }}>Mã đặt phòng</span>
                      <span style={{ color: '#0f172a', fontWeight: 600, flex: 1 }}>
                        {booking.bookingCode}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: '#64748b', width: '180px' }}>Nhận / trả phòng</span>
                      <span style={{ color: '#0f172a', fontWeight: 500, flex: 1 }}>
                        {formatStayRange(booking.checkInDate, booking.checkOutDate)}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: '#64748b', width: '180px' }}>Khách / số lượng</span>
                      <span style={{ color: '#0f172a', fontWeight: 500, flex: 1 }}>
                        {guestsAndRoomsText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. KHỐI 2 CỘT: CHÍNH SÁCH + LÝ DO (TRÁI) & CHI TIẾT SỐ TIỀN (PHẢI) */}
                <Row className="g-3">
                  {/* CỘT TRÁI */}
                  <Col lg={7}>
                    <div className="d-flex flex-column gap-3">
                      {/* THẺ CHÍNH SÁCH ĐÃ ÁP DỤNG */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '22px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#0f172a',
                            marginBottom: '12px',
                          }}
                        >
                          Chính sách đã áp dụng
                        </h3>
                        <p
                          style={{
                            fontSize: '13px',
                            color: '#334155',
                            lineHeight: 1.6,
                            marginBottom: '14px',
                          }}
                        >
                          {calculations?.policyDescription}
                        </p>

                        {/* BANNER TRẠNG THÁI HỦY */}
                        <div
                          style={{
                            backgroundColor: calculations?.isFreeCancel ? '#f0fdf4' : '#fffbeb',
                            border: `1px solid ${
                              calculations?.isFreeCancel ? '#bbf7d0' : '#fef08a'
                            }`,
                            borderRadius: '8px',
                            padding: '10px 14px',
                            color: calculations?.isFreeCancel ? '#15803d' : '#a16207',
                            fontSize: '12.5px',
                            lineHeight: 1.5,
                          }}
                        >
                          {calculations?.statusBanner}
                        </div>
                      </div>

                      {/* THẺ LÝ DO HỦY */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '22px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#0f172a',
                            marginBottom: '16px',
                          }}
                        >
                          Lý do hủy
                        </h3>

                        {/* CHỌN LÝ DO */}
                        <div className="mb-3">
                          <label
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#334155',
                              marginBottom: '6px',
                              display: 'block',
                            }}
                          >
                            Chọn lý do
                          </label>
                          <Form.Select
                            value={selectedReason}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            style={{
                              borderColor: '#cbd5e1',
                              borderRadius: '8px',
                              fontSize: '13.5px',
                              padding: '9px 12px',
                              color: '#0f172a',
                            }}
                          >
                            {CANCELLATION_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </Form.Select>
                        </div>

                        {/* THÔNG TIN THÊM (KHÔNG BẮT BUỘC) */}
                        <div className="mb-3">
                          <label
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#334155',
                              marginBottom: '6px',
                              display: 'block',
                            }}
                          >
                            Thông tin thêm (không bắt buộc)
                          </label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Tôi cần điều chỉnh kế hoạch công tác."
                            value={cancellationNote}
                            onChange={(e) => setCancellationNote(e.target.value)}
                            style={{
                              borderColor: '#cbd5e1',
                              borderRadius: '8px',
                              fontSize: '13.5px',
                              padding: '10px 12px',
                              resize: 'none',
                              color: '#0f172a',
                            }}
                          />
                        </div>

                        {/* CHECKBOX XÁC NHẬN CHÍNH SÁCH */}
                        <div className="d-flex align-items-center gap-2 mt-3 pt-1">
                          <input
                            type="checkbox"
                            id="agreeCancellation"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            style={{
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer',
                              accentColor: '#2563eb',
                            }}
                          />
                          <label
                            htmlFor="agreeCancellation"
                            style={{
                              fontSize: '13px',
                              color: '#1e293b',
                              cursor: 'pointer',
                              userSelect: 'none',
                              margin: 0,
                            }}
                          >
                            Tôi đã đọc chính sách hủy và thông tin hoàn tiền của đặt phòng.
                          </label>
                        </div>
                      </div>
                    </div>
                  </Col>

                  {/* CỘT PHẢI: CHI TIẾT SỐ TIỀN */}
                  <Col lg={5}>
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '22px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                          marginBottom: '18px',
                        }}
                      >
                        Chi tiết số tiền
                      </h3>

                      <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '13.5px' }}>
                        <span style={{ color: '#64748b' }}>Đã thanh toán</span>
                        <span style={{ color: '#0f172a', fontWeight: 500 }}>
                          {formatPrice(calculations?.paidAmount)}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-3" style={{ fontSize: '13.5px' }}>
                        <span style={{ color: '#64748b' }}>Phí hủy</span>
                        {calculations?.cancellationFee > 0 ? (
                          <span style={{ color: '#0f172a', fontWeight: 500 }}>
                            {formatPrice(calculations.cancellationFee)}
                          </span>
                        ) : (
                          <span className="text-success" style={{ fontWeight: 600 }}>Miễn phí</span>
                        )}
                      </div>

                      <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0 14px' }} />

                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '14.5px' }}>
                          Tiền được hoàn
                        </span>
                        <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '18px' }}>
                          {formatPrice(calculations?.refundAmount)}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          lineHeight: 1.5,
                          marginTop: '16px',
                        }}
                      >
                        Khoản hoàn được xử lý riêng sau khi hủy. Hủy thành công không có nghĩa là tiền đã về tài khoản.
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* 3. HỘP CẢNH BÁO MÀU VÀNG */}
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    marginTop: '4px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#92400e',
                      marginBottom: '3px',
                    }}
                  >
                    Bạn chắc chắn muốn hủy?
                  </div>
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: '#b45309',
                      lineHeight: 1.5,
                    }}
                  >
                    Sau khi xác nhận, phòng sẽ được giải phóng. Để đặt lại, bạn cần kiểm tra tình trạng phòng và mức giá mới.
                  </div>
                </div>

                {/* 4. CÁC NÚT HÀNH ĐỘNG */}
                <div className="d-flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/booking-history')}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1d5db',
                      color: '#1f2937',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      padding: '9px 22px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    Giữ đặt phòng
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    disabled={!agreed || submitting}
                    style={{
                      backgroundColor: agreed && !submitting ? '#b91c1c' : '#9ca3af',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      padding: '9px 24px',
                      cursor: agreed && !submitting ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (agreed && !submitting) e.currentTarget.style.backgroundColor = '#991b1b';
                    }}
                    onMouseLeave={(e) => {
                      if (agreed && !submitting) e.currentTarget.style.backgroundColor = '#b91c1c';
                    }}
                  >
                    {submitting ? 'Đang hủy...' : 'Xác nhận hủy'}
                  </button>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CancelBookingPage;
