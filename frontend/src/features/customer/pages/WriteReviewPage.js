import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaStar, FaCloudUploadAlt, FaTimes, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import CustomerSidebar from '../components/CustomerSidebar';
import { getBookingReviewInfo, createReview } from '../CustomerApi';

// Format ngày: DD/MM/YYYY
const formatDateOnly = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Format ngày kỳ nghỉ: DD/MM – DD/MM/YYYY
const formatStayDates = (checkInDate, checkOutDate) => {
  if (!checkInDate || !checkOutDate) return '';
  const dIn = new Date(checkInDate);
  const dOut = new Date(checkOutDate);

  const dayIn = String(dIn.getDate()).padStart(2, '0');
  const monthIn = String(dIn.getMonth() + 1).padStart(2, '0');
  const dayOut = String(dOut.getDate()).padStart(2, '0');
  const monthOut = String(dOut.getMonth() + 1).padStart(2, '0');
  const yearOut = dOut.getFullYear();

  return `${dayIn}/${monthIn} – ${dayOut}/${monthOut}/${yearOut}`;
};

const RATING_LABELS = {
  1: '1/5 · Rất tệ',
  2: '2/5 · Không hài lòng',
  3: '3/5 · Bình thường',
  4: '4/5 · Hài lòng',
  5: '5/5 · Rất hài lòng',
};

const DEFAULT_HOTEL_IMAGE =
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';

const WriteReviewPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [booking, setBooking] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tải thông tin kỳ nghỉ
  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await getBookingReviewInfo(bookingId);
        if (res.data?.success) {
          setBooking(res.data.booking);
          setHotel(res.data.hotel);
          if (res.data.hasReviewed) {
            setHasReviewed(true);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin kỳ nghỉ để đánh giá:', err);
        setErrorMsg(
          err.response?.data?.message || 'Không thể tải thông tin kỳ nghỉ. Vui lòng thử lại.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchInfo();
    }
  }, [bookingId]);

  // Xử lý upload ảnh từ máy (base64)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} vượt quá dung lượng tối đa 10 MB`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, { url: reader.result, publicId: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = null;
  };

  // Xóa ảnh
  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Nộp đánh giá
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      alert('Vui lòng chọn số sao đánh giá (1 đến 5 sao)');
      return;
    }
    if (!comment.trim()) {
      alert('Vui lòng nhập nội dung cảm nhận về kỳ nghỉ của bạn');
      return;
    }
    if (!agreeTerms) {
      alert('Vui lòng xác nhận bạn chia sẻ trải nghiệm thực tế trước khi gửi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createReview({
        bookingId: booking._id,
        rating,
        comment: comment.trim(),
        images,
      });

      if (res.data?.success) {
        alert('Cảm ơn bạn đã chia sẻ trải nghiệm lưu trú!');
        navigate('/my-reviews');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  const hotelCoverImage =
    hotel?.images?.find((img) => img.isCover)?.url ||
    hotel?.images?.[0]?.url ||
    DEFAULT_HOTEL_IMAGE;

  const roomDetail = booking?.bookingDetails?.[0] || {};
  const hotelName = hotel?.name || booking?.hotelName || 'Hanoi Heritage Hotel';
  const hotelAddress = hotel?.address || booking?.hotelAddress || '28 Hàng Trống, Hoàn Kiếm, Hà Nội';
  const starCount = hotel?.starRating || 4;
  const stayDatesStr = formatStayDates(booking?.checkInDate, booking?.checkOutDate);
  const totalNights = booking?.totalNights || 2;
  const activeRating = hoverRating || rating;

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        padding: '24px 0 64px',
      }}
    >
      <Container style={{ maxWidth: '1440px' }}>
        {/* HEADER TOP ROW (06 · ĐÁNH GIÁ SAU KỲ NGHỈ & Ngày tham chiếu) */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#d97706',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            06 · ĐÁNH GIÁ SAU KỲ NGHỈ
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Ngày tham chiếu: {formatDateOnly(new Date())}
          </span>
        </div>

        {/* TIÊU ĐỀ TRANG: Chia sẻ trải nghiệm lưu trú */}
        <div className="mb-4">
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            Chia sẻ trải nghiệm lưu trú
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: 0 }}>
            Đánh giá của bạn giúp những khách tiếp theo lựa chọn nơi nghỉ phù hợp.
          </p>
        </div>

        {/* BỐ CỤC 2 CỘT */}
        <Row className="g-4">
          {/* CỘT TRÁI: SIDEBAR */}
          <Col lg={3} md={4}>
            <CustomerSidebar activeKey="reviews" />
          </Col>

          {/* CỘT PHẢI: FORM CHIA SẺ TRẢI NGHIỆM */}
          <Col lg={9} md={8}>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#0284c7' }} />
                <p className="small text-muted mt-2">Đang tải thông tin kỳ nghỉ...</p>
              </div>
            ) : errorMsg ? (
              <Alert variant="danger" className="rounded-3">
                <FaExclamationCircle className="me-2" />
                {errorMsg}
                <div className="mt-3">
                  <Button variant="outline-danger" size="sm" onClick={() => navigate('/my-reviews')}>
                    Quay lại Đánh giá của tôi
                  </Button>
                </div>
              </Alert>
            ) : hasReviewed ? (
              <Alert variant="info" className="rounded-3">
                <FaCheckCircle className="me-2" />
                Kỳ nghỉ này đã có đánh giá. Bạn có thể xem và chỉnh sửa trong danh sách đánh giá của bạn.
                <div className="mt-3">
                  <Button variant="primary" size="sm" onClick={() => navigate('/my-reviews')}>
                    Xem đánh giá của tôi
                  </Button>
                </div>
              </Alert>
            ) : (
              <div>
                {/* 2 BADGE TRÊN CÙNG: Đã hoàn thành & Chưa đánh giá */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span
                    style={{
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 10px',
                    }}
                  >
                    Đặt phòng: Đã hoàn thành
                  </span>

                  <span
                    style={{
                      backgroundColor: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 10px',
                    }}
                  >
                    Chưa đánh giá
                  </span>
                </div>

                {/* CARD 1: THÔNG TIN KỲ NGHỈ */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '18px',
                    }}
                  >
                    Thông tin kỳ nghỉ
                  </h4>

                  <div className="d-flex flex-column flex-md-row gap-3 align-items-start mb-3">
                    <img
                      src={hotelCoverImage}
                      alt={hotelName}
                      style={{
                        width: '130px',
                        height: '92px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <h3
                        style={{
                          fontSize: '17px',
                          fontWeight: 700,
                          color: '#0f172a',
                          marginBottom: '4px',
                        }}
                      >
                        {hotelName}
                      </h3>
                      <div
                        className="d-flex align-items-center gap-2 mb-1"
                        style={{ fontSize: '13px', color: '#475569' }}
                      >
                        <span style={{ color: '#eab308' }}>
                          {'★'.repeat(starCount)}
                        </span>
                        <span>· {hotelAddress}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {roomDetail.roomTypeName || 'Deluxe giường đôi'} · 32 m² · 1 giường King
                      </div>
                    </div>
                  </div>

                  <hr style={{ borderColor: '#f1f5f9', margin: '16px 0' }} />

                  {/* THÔNG TIN CHI TIẾT ĐƠN */}
                  <div className="d-flex flex-column gap-2" style={{ fontSize: '13px' }}>
                    <div className="d-flex justify-content-between">
                      <span style={{ color: '#64748b' }}>Mã đặt phòng</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {booking?.bookingCode || 'VS141026-024'}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span style={{ color: '#64748b' }}>Nhận / trả phòng</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {stayDatesStr || '14/10 – 16/10/2026'}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span style={{ color: '#64748b' }}>Khách / số lượng</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        2 người lớn · 0 trẻ em · 1 phòng · {totalNights} đêm
                      </span>
                    </div>
                  </div>
                </div>

                {/* BANNER XANH DƯƠNG THÔNG BÁO CHÍNH SÁCH */}
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '12px 18px',
                    fontSize: '13px',
                    color: '#1d4ed8',
                    lineHeight: 1.5,
                    marginBottom: '20px',
                  }}
                >
                  Chỉ khách đã hoàn thành kỳ nghỉ mới được đánh giá. Mỗi đặt phòng chỉ gửi một đánh
                  giá; sau khi gửi, bạn có thể sửa hoặc xóa trong 7 ngày.
                </div>

                {/* CARD 2: BẠN ĐÁNH GIÁ KỲ NGHỈ THẾ NÀO? */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '28px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '18px',
                    }}
                  >
                    Bạn đánh giá kỳ nghỉ thế nào?
                  </h4>

                  <Form onSubmit={handleSubmit}>
                    {/* ĐIỂM ĐÁNH GIÁ (1 ĐẾN 5 SAO) */}
                    <Form.Group className="mb-4">
                      <Form.Label
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '8px',
                          display: 'block',
                        }}
                      >
                        Điểm đánh giá * · Từ 1 đến 5 sao
                      </Form.Label>

                      <div className="d-flex gap-4 align-items-center mb-2">
                        {[1, 2, 3, 4, 5].map((num) => {
                          const isFilled = num <= activeRating;
                          return (
                            <div
                              key={num}
                              className="text-center"
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => setRating(num)}
                              onMouseEnter={() => setHoverRating(num)}
                              onMouseLeave={() => setHoverRating(0)}
                            >
                              <FaStar
                                size={32}
                                style={{
                                  color: isFilled ? '#f59e0b' : '#e2e8f0',
                                  transition: 'color 0.15s ease',
                                }}
                              />
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#64748b',
                                  marginTop: '4px',
                                  fontWeight: 500,
                                }}
                              >
                                {num}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* BADGE HIỂN THỊ ĐIỂM ĐÃ CHỌN */}
                      <div
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          marginTop: '6px',
                        }}
                      >
                        Đã chọn {RATING_LABELS[rating]}
                      </div>
                    </Form.Group>

                    {/* BÌNH LUẬN */}
                    <Form.Group className="mb-4">
                      <Form.Label
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '6px',
                        }}
                      >
                        Bình luận *
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        required
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Phòng sạch, yên tĩnh và vị trí rất thuận tiện. Nhân viên hỗ trợ chu đáo, nhận và trả phòng nhanh chóng."
                        style={{
                          fontSize: '13.5px',
                          lineHeight: 1.6,
                          borderRadius: '8px',
                          borderColor: '#cbd5e1',
                          padding: '12px 14px',
                        }}
                      />
                    </Form.Group>

                    {/* KHUNG THÊM ẢNH TỪ KỲ NGHỈ */}
                    <div className="mb-4">
                      <div
                        style={{
                          border: '2px dashed #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          padding: '24px 16px',
                          textAlign: 'center',
                        }}
                      >
                        <FaCloudUploadAlt size={38} color="#0284c7" className="mb-2" />
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                          Thêm ảnh từ kỳ nghỉ của bạn
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 14px' }}>
                          Kéo thả hoặc chọn tệp · JPG, PNG, PDF · Tối đa 10 MB/tệp
                        </div>

                        <label
                          style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            padding: '6px 18px',
                            fontSize: '12.5px',
                            fontWeight: 500,
                            color: '#1e293b',
                            cursor: 'pointer',
                            display: 'inline-block',
                          }}
                        >
                          Chọn tệp
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>

                      {/* DANH SÁCH ẢNH ĐÍNH KÈM */}
                      {images.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mt-3">
                          {images.map((img, i) => (
                            <div
                              key={i}
                              className="position-relative"
                              style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              <img
                                src={img.url}
                                alt="Ảnh tải lên"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(i)}
                                style={{
                                  position: 'absolute',
                                  top: 3,
                                  right: 3,
                                  backgroundColor: 'rgba(0,0,0,0.6)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  fontSize: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CHECKBOX CAM KẾT */}
                    <div className="mb-2">
                      <Form.Check
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        label={
                          <span style={{ fontSize: '13px', color: '#1e293b' }}>
                            Tôi chia sẻ trải nghiệm thực tế và không đưa thông tin liên hệ cá nhân
                            vào nội dung công khai.
                          </span>
                        }
                      />
                    </div>

                    {/* GHI CHÚ BẢO MẬT & KIỂM DUYỆT */}
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: '#64748b',
                        lineHeight: 1.5,
                        marginBottom: '20px',
                      }}
                    >
                      Nội dung không phù hợp có thể được gắn cờ để kiểm tra. Hệ thống sẽ kiểm tra
                      đặt phòng đã có đánh giá trước khi nhận bài gửi mới.
                    </div>

                    {/* CÁC NÚT HÀNH ĐỘNG: Gửi đánh giá > & Hủy */}
                    <div className="d-flex gap-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          backgroundColor: '#0284c7',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '9px 24px',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {submitting ? (
                          <Spinner size="sm" animation="border" />
                        ) : (
                          <>
                            Gửi đánh giá <span>&gt;</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/my-reviews')}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          color: '#0f172a',
                          padding: '9px 20px',
                          fontSize: '13.5px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  </Form>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default WriteReviewPage;
