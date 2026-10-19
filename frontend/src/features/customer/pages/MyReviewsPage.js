import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  FaStar,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaPlus,
  FaReply,
  FaCheckCircle,
  FaExclamationCircle,
  FaArrowLeft,
  FaClock,
} from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import CustomerSidebar from '../components/CustomerSidebar';
import {
  getMyReviews,
  getPendingReviewBookings,
  updateReview,
  deleteReview,
} from '../CustomerApi';

// Định dạng ngày giờ: HH:mm ngày DD/MM/YYYY
const formatDateTime = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} ngày ${day}/${month}/${year}`;
};

// Định dạng ngày: DD/MM/YYYY
const formatDateOnly = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Định dạng ngày đăng: DD/MM/YYYY - HH:mm
const formatPostedAt = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
};

// Định dạng kỳ nghỉ: DD – DD/MM/YYYY
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

const MyReviewsPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('SUBMITTED'); // 'SUBMITTED' | 'PENDING'
  const [reviews, setReviews] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Review đang được chọn để "Xem chi tiết / Chỉnh sửa"
  // null = đang ở chế độ xem List đánh giá
  const [selectedReview, setSelectedReview] = useState(null);

  // Dữ liệu form đang chỉnh sửa
  const [editForm, setEditForm] = useState({
    rating: 5,
    comment: '',
    images: [],
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Hộp xác nhận xóa đánh giá (hiển thị inline bên dưới thẻ đánh giá)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Tải danh sách đánh giá và các kỳ nghỉ chờ đánh giá
  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [reviewsRes, pendingRes] = await Promise.all([
        getMyReviews().catch(() => ({ data: { reviews: [] } })),
        getPendingReviewBookings().catch(() => ({ data: { pendingBookings: [] } })),
      ]);

      const reviewList = reviewsRes.data?.reviews || [];
      setReviews(reviewList);
      setPendingBookings(pendingRes.data?.pendingBookings || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu đánh giá:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mở màn hình Xem chi tiết & Chỉnh sửa review
  const handleOpenDetail = (review) => {
    setSelectedReview(review);
    setEditForm({
      rating: review.rating || 5,
      comment: review.comment || '',
      images: Array.isArray(review.images) ? [...review.images] : [],
    });
    setSuccessMsg('');
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quay lại danh sách review
  const handleBackToList = () => {
    setSelectedReview(null);
    setEditForm({ rating: 5, comment: '', images: [] });
    setNewImageUrl('');
  };

  // Lưu thay đổi đánh giá
  const handleSaveEdit = async () => {
    if (!selectedReview) return;
    if (!editForm.comment.trim()) {
      setErrorMsg('Vui lòng nhập nội dung đánh giá');
      return;
    }
    setSaveLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await updateReview(selectedReview._id, {
        rating: editForm.rating,
        comment: editForm.comment.trim(),
        images: editForm.images,
      });

      if (res.data?.success) {
        setSuccessMsg('Đã cập nhật đánh giá thành công!');
        // Cập nhật lại review trong state
        setSelectedReview((prev) => ({
          ...prev,
          ...res.data.review,
        }));
        await loadData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể cập nhật đánh giá');
    } finally {
      setSaveLoading(false);
    }
  };

  // Mở modal xóa
  const handleOpenDeleteModal = (review) => {
    setReviewToDelete(review);
    setShowDeleteModal(true);
  };

  // Xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteReview(reviewToDelete._id);
      setShowDeleteModal(false);
      setReviewToDelete(null);
      setSelectedReview(null);
      setSuccessMsg('Đã xóa đánh giá thành công. Mỗi kỳ nghỉ chỉ được đánh giá một lần.');
      await loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể xóa đánh giá');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Xóa ảnh trong lúc edit
  const handleRemoveImage = (indexToRemove) => {
    setEditForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Thêm ảnh bằng URL
  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    const fileName = url.split('/').pop()?.split('?')[0] || 'review-photo.jpg';
    setEditForm((prev) => ({
      ...prev,
      images: [...prev.images, { url, publicId: fileName }],
    }));
    setNewImageUrl('');
  };

  // Upload ảnh từ máy tính (base64)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((prev) => ({
        ...prev,
        images: [...prev.images, { url: reader.result, publicId: file.name }],
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

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
          Đánh giá của tôi
        </h1>
        <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '28px' }}>
          Quản lý nội dung bạn đã chia sẻ sau kỳ nghỉ.
        </p>

        {/* THÔNG BÁO */}
        {successMsg && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSuccessMsg('')}
            className="d-flex align-items-center gap-2 rounded-3 py-2 px-3 small mb-3"
          >
            <FaCheckCircle /> {successMsg}
          </Alert>
        )}
        {errorMsg && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setErrorMsg('')}
            className="d-flex align-items-center gap-2 rounded-3 py-2 px-3 small mb-3"
          >
            <FaExclamationCircle /> {errorMsg}
          </Alert>
        )}

        {/* BỐ CỤC 2 CỘT */}
        <Row className="g-4">
          {/* CỘT TRÁI: SIDEBAR */}
          <Col lg={3} md={4}>
            <CustomerSidebar activeKey="reviews" />
          </Col>

          {/* CỘT PHẢI: NỘI DUNG */}
          <Col lg={9} md={8}>
            {/* NẾU ĐANG CHỌN XEM CHI TIẾT & CHỈNH SỬA 1 REVIEW */}
            {selectedReview ? (
              <div>
                {/* NÚT QUAY LẠI DANH SÁCH */}
                <button
                  type="button"
                  onClick={handleBackToList}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0284c7',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '16px',
                    padding: 0,
                  }}
                >
                  <FaArrowLeft size={12} /> Quay lại danh sách đánh giá
                </button>

                {/* CARD CHI TIẾT & CHỈNH SỬA REVIEW (Khớp wireframe 1) */}
                {(() => {
                  const rev = selectedReview;
                  const booking = rev.bookingId || {};
                  const hotel = rev.hotelId || {};

                  const hotelName = hotel.name || booking.hotelName || 'Hanoi Heritage Hotel';
                  const bookingCode = booking.bookingCode || 'VS141026-024';
                  const roomTypeName =
                    booking.bookingDetails?.[0]?.roomTypeName || 'Deluxe giường đôi';

                  const stayDatesStr = formatStayDates(
                    booking.checkInDate || '2026-10-14T14:00:00.000Z',
                    booking.checkOutDate || '2026-10-16T12:00:00.000Z'
                  );

                  const postedAtStr = formatPostedAt(
                    rev.createdAt || '2026-10-16T18:00:00.000Z'
                  );

                  const canEditOrDelete = rev.canEditOrDelete !== false;
                  const editableUntilStr = formatDateTime(rev.editableUntil);
                  const todayStr = formatDateOnly(new Date());

                  return (
                    <>
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '12px',
                          padding: '24px 28px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        {/* TIÊU ĐỀ KHÁCH SẠN + BADGE "ĐÃ GỬI ĐÁNH GIÁ" */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h2
                              style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#0f172a',
                                margin: 0,
                              }}
                            >
                              {hotelName}
                            </h2>
                            <div
                              style={{
                                fontSize: '13px',
                                color: '#475569',
                                marginTop: '4px',
                              }}
                            >
                              {bookingCode} · {roomTypeName}
                            </div>
                          </div>

                          <div
                            style={{
                              border: '1px solid #94a3b8',
                              color: '#334155',
                              backgroundColor: '#f8fafc',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '4px',
                              letterSpacing: '0.01em',
                            }}
                          >
                            Đã gửi đánh giá
                          </div>
                        </div>

                        {/* THÔNG TIN KỲ NGHỈ VÀ NGÀY ĐĂNG */}
                        <div
                          className="my-3 py-2 border-top border-bottom"
                          style={{ borderColor: '#f1f5f9' }}
                        >
                          <div
                            className="d-flex justify-content-between align-items-center mb-1"
                            style={{ fontSize: '13px' }}
                          >
                            <span style={{ color: '#475569', fontWeight: 500 }}>Kỳ nghỉ</span>
                            <span style={{ color: '#0f172a', fontWeight: 500 }}>
                              {stayDatesStr || '14 – 16/10/2026'}
                            </span>
                          </div>

                          <div
                            className="d-flex justify-content-between align-items-center"
                            style={{ fontSize: '13px' }}
                          >
                            <span style={{ color: '#475569', fontWeight: 500 }}>Đăng lúc</span>
                            <span style={{ color: '#0f172a', fontWeight: 500 }}>
                              {postedAtStr || '16/10/2026 - 18:00'}
                            </span>
                          </div>
                        </div>

                        {/* KHUNG THÔNG BÁO CHÍNH SÁCH 7 NGÀY */}
                        <div
                          style={{
                            border: '1px solid #94a3b8',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            backgroundColor: canEditOrDelete ? '#f8fafc' : '#fef2f2',
                            fontSize: '13px',
                            color: canEditOrDelete ? '#1e293b' : '#991b1b',
                            lineHeight: 1.5,
                            marginBottom: '20px',
                          }}
                        >
                          {canEditOrDelete ? (
                            <>
                              Bạn có thể chỉnh sửa hoặc xóa đến{' '}
                              <strong>{editableUntilStr || '18:00 ngày 23/10/2026'}</strong> (7
                              ngày từ khi đăng). Hôm nay: {todayStr || '17/10/2026'}.
                            </>
                          ) : (
                            <>
                              Đã quá thời hạn 7 ngày kể từ khi đăng ({editableUntilStr}). Đánh giá này
                              đã được lưu cố định và không thể chỉnh sửa hoặc xóa.
                            </>
                          )}
                        </div>

                        {/* ĐIỂM ĐÁNH GIÁ (1–5) */}
                        <div className="mb-3">
                          <label
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#334155',
                              display: 'block',
                              marginBottom: '6px',
                            }}
                          >
                            Điểm đánh giá (1–5)
                          </label>

                          <div
                            style={{
                              border: '1px solid #94a3b8',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              backgroundColor: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            <div className="d-flex align-items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  size={18}
                                  onClick={() => {
                                    if (canEditOrDelete) {
                                      setEditForm({ ...editForm, rating: star });
                                    }
                                  }}
                                  style={{
                                    color: star <= editForm.rating ? '#0f172a' : '#cbd5e1',
                                    cursor: canEditOrDelete ? 'pointer' : 'default',
                                    transition: 'color 0.15s ease',
                                  }}
                                />
                              ))}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                              · {editForm.rating}/5
                            </span>
                          </div>
                        </div>

                        {/* NỘI DUNG ĐÃ GỬI – ĐANG CHỈNH SỬA */}
                        <div className="mb-3">
                          <label
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#334155',
                              display: 'block',
                              marginBottom: '6px',
                            }}
                          >
                            Nội dung đã gửi – đang chỉnh sửa
                          </label>

                          {canEditOrDelete ? (
                            <Form.Control
                              as="textarea"
                              rows={4}
                              value={editForm.comment}
                              onChange={(e) =>
                                setEditForm({ ...editForm, comment: e.target.value })
                              }
                              style={{
                                fontSize: '13.5px',
                                color: '#1e293b',
                                lineHeight: 1.6,
                                borderColor: '#94a3b8',
                                borderRadius: '8px',
                                padding: '12px 14px',
                              }}
                              placeholder="Nhập cảm nhận của bạn về kỳ nghỉ..."
                            />
                          ) : (
                            <div
                              style={{
                                border: '1px solid #94a3b8',
                                borderRadius: '8px',
                                padding: '12px 14px',
                                fontSize: '13.5px',
                                color: '#1e293b',
                                lineHeight: 1.6,
                                backgroundColor: '#ffffff',
                              }}
                            >
                              {editForm.comment}
                            </div>
                          )}
                        </div>

                        {/* HÌNH ẢNH ĐÍNH KÈM (Thumbnail, Tên file & Nút Xóa ảnh) */}
                        <div className="mb-4">
                          <div className="d-flex flex-wrap gap-3 align-items-center">
                            {editForm.images.map((img, imgIdx) => {
                              const imgSrc = typeof img === 'string' ? img : img.url;
                              const imgName =
                                (typeof img === 'object' ? img.publicId : '') ||
                                imgSrc.split('/').pop()?.split('?')[0] ||
                                'phong-deluxe.jpg';

                              return (
                                <div
                                  key={imgIdx}
                                  className="d-flex align-items-center gap-3"
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    backgroundColor: '#f8fafc',
                                  }}
                                >
                                  <img
                                    src={imgSrc}
                                    alt="Ảnh đánh giá"
                                    style={{
                                      width: '400px',
                                      height: '200px',
                                      objectFit: 'cover',
                                      borderRadius: '6px',
                                      border: '1px solid #e2e8f0',
                                      backgroundColor: '#e2e8f0',
                                    }}
                                  />
                                  <div>
                                    <div
                                      style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#334155',
                                        maxWidth: '200px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        marginBottom: '10px',
                                      }}
                                    >
                                      {imgName}
                                    </div>

                                    {canEditOrDelete && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImage(imgIdx)}
                                        style={{
                                          border: '1px solid #94a3b8',
                                          borderRadius: '6px',
                                          backgroundColor: '#ffffff',
                                          fontSize: '13.5px',
                                          padding: '6px 14px',
                                          color: '#0f172a',
                                          cursor: 'pointer',
                                          fontWeight: 500,
                                        }}
                                      >
                                        Xóa ảnh
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Thêm ảnh khi đang chỉnh sửa */}
                            {canEditOrDelete && (
                              <div className="d-flex flex-column gap-2">
                                <label
                                  style={{
                                    border: '1px dashed #94a3b8',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    fontSize: '12px',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: '#ffffff',
                                  }}
                                >
                                  <FaPlus size={11} /> Tải ảnh từ máy
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* PHẢN HỒI TỪ KHÁCH SẠN */}
                        {rev.partnerReply && rev.partnerReply.content && (
                          <div
                            className="mb-4"
                            style={{
                              backgroundColor: '#f1f5f9',
                              borderLeft: '4px solid #0284c7',
                              borderRadius: '0 8px 8px 0',
                              padding: '14px 18px',
                            }}
                          >
                            <div
                              className="d-flex align-items-center gap-2 mb-1"
                              style={{ fontSize: '13px', fontWeight: 600, color: '#0369a1' }}
                            >
                              <FaReply /> Phản hồi từ khách sạn
                              {rev.partnerReply.repliedAt && (
                                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 400 }}>
                                  ({formatPostedAt(rev.partnerReply.repliedAt)})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: '#334155', fontStyle: 'italic', lineHeight: 1.5 }}>
                              "{rev.partnerReply.content}"
                            </div>
                          </div>
                        )}

                        {/* CÁC NÚT HÀNH ĐỘNG: Lưu thay đổi >, Hủy chỉnh sửa, Xóa đánh giá */}
                        <div className="d-flex flex-wrap gap-2 pt-2">
                          {canEditOrDelete ? (
                            <>
                              <button
                                type="button"
                                disabled={saveLoading}
                                onClick={handleSaveEdit}
                                style={{
                                  border: '1px solid #0b6bde',
                                  backgroundColor: '#0b6bde',
                                  borderRadius: '6px',
                                  padding: '7px 18px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#ffffff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: saveLoading ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {saveLoading ? <Spinner size="sm" animation="border" /> : 'Lưu thay đổi'}
                                <span style={{ fontSize: '12px' }}>&gt;</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleBackToList}
                                style={{
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#f1f5f9',
                                  borderRadius: '6px',
                                  padding: '7px 18px',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  color: '#334155',
                                  cursor: 'pointer',
                                }}
                              >
                                Hủy chỉnh sửa
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(rev)}
                                style={{
                                  border: '1px solid #b91c1c',
                                  backgroundColor: '#b91c1c',
                                  borderRadius: '6px',
                                  padding: '7px 18px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                }}
                              >
                                Xóa đánh giá
                              </button>
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#64748b',
                                backgroundColor: '#f1f5f9',
                                padding: '6px 12px',
                                borderRadius: '6px',
                              }}
                            >
                              Đánh giá này đã hoàn tất và khóa sau 7 ngày.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* HỘP XÁC NHẬN XÓA: hiển thị ngay bên dưới thẻ đánh giá */}
                      {showDeleteModal && reviewToDelete && (
                        <div
                          className="mt-4"
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #f87171',
                            borderRadius: '12px',
                            padding: '24px 28px',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              color: '#b91c1c',
                              fontWeight: 500,
                              marginBottom: '14px',
                            }}
                          >
                            Trạng thái hộp xác nhận xóa
                          </div>

                          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                            Bạn muốn xóa đánh giá này?
                          </h3>

                          <p
                            style={{
                              fontSize: '13px',
                              color: '#475569',
                              lineHeight: 1.6,
                              marginBottom: '16px',
                              paddingBottom: '16px',
                              borderBottom: '1px solid #e2e8f0',
                            }}
                          >
                            Đánh giá và các ảnh đính kèm sẽ không còn hiển thị công khai. Hành động này không thể hoàn tác. Mỗi kỳ nghỉ chỉ được đánh giá một lần.
                          </p>

                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              disabled={deleteLoading}
                              onClick={() => setShowDeleteModal(false)}
                              style={{
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '6px',
                                padding: '7px 20px',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#334155',
                                cursor: 'pointer',
                              }}
                            >
                              Hủy
                            </button>

                            <button
                              type="button"
                              disabled={deleteLoading}
                              onClick={handleConfirmDelete}
                              style={{
                                border: '1px solid #b91c1c',
                                backgroundColor: '#b91c1c',
                                borderRadius: '6px',
                                padding: '7px 20px',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#ffffff',
                                cursor: deleteLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {deleteLoading ? <Spinner size="sm" animation="border" /> : 'Xác nhận xóa'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              /* NẾU ĐANG Ở MÀN HÌNH DANH SÁCH (1 LIST ĐÁNH GIÁ) */
              <div>
                {/* TAB CHUYỂN ĐỔI: ĐÃ GỬI ĐÁNH GIÁ / CHỜ ĐÁNH GIÁ */}
                <div
                  className="d-flex gap-2 mb-3 pb-2 border-bottom"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab('SUBMITTED')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      backgroundColor: activeTab === 'SUBMITTED' ? '#0f172a' : '#f1f5f9',
                      color: activeTab === 'SUBMITTED' ? '#ffffff' : '#475569',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    Đã gửi đánh giá ({reviews.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('PENDING')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      backgroundColor: activeTab === 'PENDING' ? '#0f172a' : '#f1f5f9',
                      color: activeTab === 'PENDING' ? '#ffffff' : '#475569',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    Chưa đánh giá ({pendingBookings.length})
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" style={{ color: '#0284c7' }} />
                    <p className="small text-muted mt-2">Đang tải danh sách đánh giá...</p>
                  </div>
                ) : activeTab === 'SUBMITTED' ? (
                  /* TAB 1: 1 LIST ĐÁNH GIÁ ĐÃ GỬI */
                  reviews.length === 0 ? (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '48px 24px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>✍️</div>
                      <h5 style={{ fontWeight: 700, color: '#0f172a' }}>Bạn chưa có đánh giá nào</h5>
                      <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
                        Chia sẻ cảm nhận sau mỗi chuyến đi để giúp khách sạn nâng cao dịch vụ và nhận nhiều quyền lợi từ VinaStay.
                      </p>
                      {pendingBookings.length > 0 && (
                        <Button
                          variant="dark"
                          size="sm"
                          onClick={() => setActiveTab('PENDING')}
                          className="rounded-pill px-4"
                        >
                          Xem các kỳ nghỉ chưa đánh giá ({pendingBookings.length})
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* LIST CÁC CARD ĐÁNH GIÁ */
                    <div className="d-flex flex-column gap-3">
                      {reviews.map((rev) => {
                        const booking = rev.bookingId || {};
                        const hotel = rev.hotelId || {};
                        const hotelName = hotel.name || booking.hotelName || 'Hanoi Heritage Hotel';
                        const bookingCode = booking.bookingCode || 'VS141026-024';
                        const roomTypeName =
                          booking.bookingDetails?.[0]?.roomTypeName || 'Deluxe giường đôi';

                        const stayDatesStr = formatStayDates(
                          booking.checkInDate || '2026-10-14T14:00:00.000Z',
                          booking.checkOutDate || '2026-10-16T12:00:00.000Z'
                        );
                        const postedAtStr = formatPostedAt(rev.createdAt);
                        const canEditOrDelete = rev.canEditOrDelete !== false;

                        return (
                          <div
                            key={rev._id}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '20px 24px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-2">
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
                                <div style={{ fontSize: '13px', color: '#475569' }}>
                                  Mã đơn: <strong>{bookingCode}</strong> · {roomTypeName}
                                </div>
                              </div>

                              <div className="d-flex align-items-center gap-2">
                                {canEditOrDelete ? (
                                  <span
                                    style={{
                                      backgroundColor: '#eff6ff',
                                      color: '#0284c7',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '3px 8px',
                                    }}
                                  >
                                    Có thể sửa/xóa (7 ngày)
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      backgroundColor: '#f1f5f9',
                                      color: '#64748b',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 500,
                                      padding: '3px 8px',
                                    }}
                                  >
                                    Đã khóa
                                  </span>
                                )}

                                <span
                                  style={{
                                    backgroundColor: '#f8fafc',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                  }}
                                >
                                  Đã gửi đánh giá
                                </span>
                              </div>
                            </div>

                            {/* Dòng ngày kỳ nghỉ & ngày đăng */}
                            <div
                              className="d-flex flex-wrap gap-4 align-items-center my-2"
                              style={{ fontSize: '12.5px', color: '#64748b' }}
                            >
                              <span>
                                <strong>Kỳ nghỉ:</strong> {stayDatesStr}
                              </span>
                              <span>
                                <strong>Đăng lúc:</strong> {postedAtStr}
                              </span>
                            </div>

                            {/* Điểm sao */}
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <div className="d-flex align-items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <FaStar
                                    key={star}
                                    size={14}
                                    style={{ color: star <= rev.rating ? '#f59e0b' : '#cbd5e1' }}
                                  />
                                ))}
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                                {rev.rating}/5
                              </span>
                            </div>

                            {/* Trích đoạn bình luận */}
                            <div
                              style={{
                                fontSize: '13.5px',
                                color: '#334155',
                                lineHeight: 1.6,
                                backgroundColor: '#f8fafc',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                borderLeft: '3px solid #cbd5e1',
                              }}
                            >
                              "{rev.comment}"
                            </div>

                            {/* Thumbnail ảnh (nếu có) */}
                            {rev.images && rev.images.length > 0 && (
                              <div className="d-flex gap-2 mb-3">
                                {rev.images.map((img, i) => (
                                  <img
                                    key={i}
                                    src={typeof img === 'string' ? img : img.url}
                                    alt=""
                                    style={{
                                      width: '400px',
                                      height: '200px',
                                      objectFit: 'cover',
                                      borderRadius: '6px',
                                      border: '1px solid #e2e8f0',
                                    }}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Phản hồi từ khách sạn (nếu có) */}
                            {rev.partnerReply && rev.partnerReply.content && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#0369a1',
                                  backgroundColor: '#f0f9ff',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  marginBottom: '12px',
                                }}
                              >
                                <FaReply className="me-1" /> <strong>Khách sạn đã phản hồi:</strong> "{rev.partnerReply.content}"
                              </div>
                            )}

                            {/* NÚT "XEM CHI TIẾT & CHỈNH SỬA" */}
                            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(rev)}
                                style={{
                                  backgroundColor: '#0f172a',
                                  border: 'none',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  padding: '6px 16px',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <FaEdit size={11} /> Xem chi tiết / Chỉnh sửa
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* TAB 2: CÁC KỲ NGHỈ CHƯA ĐÁNH GIÁ */
                  pendingBookings.length === 0 ? (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '48px 24px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
                      <h5 style={{ fontWeight: 700, color: '#0f172a' }}>Tất cả kỳ nghỉ đã được đánh giá</h5>
                      <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
                        Cảm ơn bạn đã luôn đóng góp phản hồi quý báu cho các chuyến đi tại VinaStay!
                      </p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {pendingBookings.map((b) => (
                        <div
                          key={b._id}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '20px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div>
                            <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                              {b.hotelName}
                            </h5>
                            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                              Mã đơn: <strong>{b.bookingCode}</strong> · {b.bookingDetails?.[0]?.roomTypeName || 'Phòng nghỉ'}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                              Kỳ nghỉ: {formatStayDates(b.checkInDate, b.checkOutDate)}
                            </div>
                          </div>

                          {/* BẤM "VIẾT ĐÁNH GIÁ" SẼ NHẢY QUA TRANG CHIA SẺ TRẢI NGHIỆM LƯU TRÚ */}
                          <Button
                            variant="primary"
                            size="sm"
                            className="rounded-pill px-4 fw-semibold"
                            style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                            onClick={() => navigate(`/write-review/${b._id}`)}
                          >
                            Viết đánh giá
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </Col>
        </Row>
      </Container>

    </div>
  );
};

export default MyReviewsPage;
