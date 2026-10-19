import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaStar, FaTrash, FaEdit, FaSave, FaTimes, FaPlus, FaReply, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import CustomerSidebar from '../components/CustomerSidebar';
import {
  getMyReviews,
  getPendingReviewBookings,
  createReview,
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
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('SUBMITTED'); // 'SUBMITTED' | 'PENDING'
  const [reviews, setReviews] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Trạng thái chỉnh sửa review
  // editingReviewId: id của review đang được chỉnh sửa
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editForm, setEditForm] = useState({
    rating: 5,
    comment: '',
    images: [],
  });
  const [saveLoading, setSaveLoading] = useState(false);

  // Modal Xác nhận xóa đánh giá (Wireframe: "Trạng thái hộp xác nhận xóa")
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal Tạo đánh giá mới cho kỳ nghỉ chờ đánh giá
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [newReviewForm, setNewReviewForm] = useState({
    rating: 5,
    comment: '',
    images: [],
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Input thêm ảnh bằng URL nhanh hoặc file upload
  const [newImageUrl, setNewImageUrl] = useState('');

  // Tải dữ liệu đánh giá và kỳ nghỉ chờ đánh giá
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

  // Bắt đầu chỉnh sửa review
  const handleStartEdit = (review) => {
    setEditingReviewId(review._id);
    setEditForm({
      rating: review.rating || 5,
      comment: review.comment || '',
      images: Array.isArray(review.images) ? [...review.images] : [],
    });
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Hủy chỉnh sửa
  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditForm({ rating: 5, comment: '', images: [] });
  };

  // Lưu thay đổi đánh giá
  const handleSaveEdit = async (reviewId) => {
    if (!editForm.comment.trim()) {
      setErrorMsg('Vui lòng nhập nội dung đánh giá');
      return;
    }
    setSaveLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await updateReview(reviewId, {
        rating: editForm.rating,
        comment: editForm.comment.trim(),
        images: editForm.images,
      });

      if (res.data?.success) {
        setSuccessMsg('Đã cập nhật đánh giá thành công!');
        setEditingReviewId(null);
        await loadData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể cập nhật đánh giá');
    } finally {
      setSaveLoading(false);
    }
  };

  // Mở modal xác nhận xóa
  const handleOpenDeleteModal = (review) => {
    setReviewToDelete(review);
    setShowDeleteModal(true);
  };

  // Xác nhận xóa đánh giá
  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteReview(reviewToDelete._id);
      setShowDeleteModal(false);
      setReviewToDelete(null);
      setSuccessMsg('Đã xóa đánh giá thành công. Mỗi kỳ nghỉ chỉ được đánh giá một lần.');
      setEditingReviewId(null);
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

  // Thêm ảnh mới trong lúc edit
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    const fileName = url.split('/').pop()?.split('?')[0] || 'hinh-anh.jpg';
    setEditForm((prev) => ({
      ...prev,
      images: [...prev.images, { url, publicId: fileName }],
    }));
    setNewImageUrl('');
  };

  // Xử lý chọn file ảnh từ máy tính (convert sang base64 preview)
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

  // Mở form viết đánh giá cho booking đang chờ
  const handleOpenCreateModal = (booking) => {
    setSelectedBookingForReview(booking);
    setNewReviewForm({
      rating: 5,
      comment: '',
      images: [],
    });
    setShowCreateModal(true);
  };

  // Gửi đánh giá mới
  const handleSubmitNewReview = async (e) => {
    e.preventDefault();
    if (!newReviewForm.comment.trim()) {
      alert('Vui lòng nhập nội dung đánh giá kỳ nghỉ');
      return;
    }
    setCreateLoading(true);
    try {
      await createReview({
        bookingId: selectedBookingForReview._id,
        rating: newReviewForm.rating,
        comment: newReviewForm.comment.trim(),
        images: newReviewForm.images,
      });
      setShowCreateModal(false);
      setSelectedBookingForReview(null);
      setSuccessMsg('Cảm ơn bạn đã gửi đánh giá kỳ nghỉ!');
      setActiveTab('SUBMITTED');
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '90vh', padding: '2rem 0 4rem' }}>
      <Container>
        {/* TIÊU ĐỀ TRANG */}
        <div className="mb-4">
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '32px',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '6px',
            }}
          >
            Đánh giá của tôi
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '0' }}>
            Quản lý nội dung bạn đã chia sẻ sau kỳ nghỉ.
          </p>
        </div>

        {/* THÔNG BÁO THÀNH CÔNG / THẤT BẠI */}
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
          {/* CỘT TRÁI: SIDEBAR KHÁCH HÀNG */}
          <Col lg={3} md={4}>
            <CustomerSidebar activeKey="reviews" />
          </Col>

          {/* CỘT PHẢI: NỘI DUNG ĐÁNH GIÁ */}
          <Col lg={9} md={8}>
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
                Chờ đánh giá ({pendingBookings.length})
              </button>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#0284c7' }} />
                <p className="small text-muted mt-2">Đang tải danh sách đánh giá...</p>
              </div>
            ) : activeTab === 'SUBMITTED' ? (
              /* TAB 1: DANH SÁCH ĐÁNH GIÁ ĐÃ GỬI */
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
                      Xem các kỳ nghỉ chờ đánh giá ({pendingBookings.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div className="d-flex flex-column gap-4">
                  {reviews.map((rev) => {
                    const isEditing = editingReviewId === rev._id;
                    const booking = rev.bookingId || {};
                    const hotel = rev.hotelId || {};

                    const hotelName = hotel.name || booking.hotelName || '';
                    const bookingCode = booking.bookingCode || '';
                    const roomTypeName = booking.bookingDetails?.[0]?.roomTypeName || '';

                    const stayDatesStr = formatStayDates(booking.checkInDate, booking.checkOutDate);

                    const postedAtStr = formatPostedAt(rev.createdAt);

                    // Tính toán quy tắc 7 ngày
                    const canEditOrDelete = rev.canEditOrDelete !== false;
                    const editableUntilStr = formatDateTime(rev.editableUntil);
                    const todayStr = formatDateOnly(new Date());

                    return (
                      <div
                        key={rev._id}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '22px 24px',
                        }}
                      >
                        {/* HÀNG TIÊU ĐỀ KHÁCH SẠN + BADGE TRẠNG THÁI */}
                        <h2
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontSize: '19px',
                            fontWeight: 700,
                            color: '#111827',
                            margin: '0 0 12px',
                          }}
                        >
                          {hotelName}
                        </h2>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>
                            {bookingCode} · {roomTypeName}
                          </div>

                          {/* Badge trạng thái "Đã gửi đánh giá" */}
                          <div
                            style={{
                              color: '#15803d',
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #bbf7d0',
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '3px 10px',
                              borderRadius: '4px',
                            }}
                          >
                            Đã gửi đánh giá
                          </div>
                        </div>

                        {/* THÔNG TIN KỲ NGHỈ VÀ NGÀY ĐĂNG */}
                        <div className="mb-3" style={{ fontSize: '12px' }}>
                          <div
                            className="py-2"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              borderTop: '1px solid #f3f4f6',
                            }}
                          >
                            <span style={{ color: '#6b7280' }}>Kỳ nghỉ</span>
                            <span style={{ color: '#111827' }}>
                              {stayDatesStr}
                            </span>
                          </div>

                          <div
                            className="py-2"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              borderTop: '1px solid #f3f4f6',
                            }}
                          >
                            <span style={{ color: '#6b7280' }}>Đăng lúc</span>
                            <span style={{ color: '#111827' }}>
                              {postedAtStr}
                            </span>
                          </div>
                        </div>

                        {/* KHUNG THÔNG BÁO CHÍNH SÁCH 7 NGÀY */}
                        <div
                          style={{
                            border: `1px solid ${canEditOrDelete ? '#fde68a' : '#fecaca'}`,
                            borderRadius: '4px',
                            padding: '10px 14px',
                            backgroundColor: canEditOrDelete ? '#fffbeb' : '#fef2f2',
                            fontSize: '11.5px',
                            color: canEditOrDelete ? '#a16207' : '#991b1b',
                            lineHeight: 1.5,
                            marginBottom: '16px',
                          }}
                        >
                          {canEditOrDelete ? (
                            <>
                              Bạn có thể chỉnh sửa hoặc xóa đến{' '}
                              <strong>{editableUntilStr}</strong> (7
                              ngày từ khi đăng). Hôm nay: {todayStr}.
                            </>
                          ) : (
                            <>
                              Đã quá thời hạn 7 ngày kể từ khi đăng ({editableUntilStr}). Đánh giá
                              này đã được lưu cố định và không thể chỉnh sửa hoặc xóa.
                            </>
                          )}
                        </div>

                        {/* ĐIỂM ĐÁNH GIÁ (1–5) */}
                        <div className="mb-3">
                          <label
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#111827',
                              display: 'block',
                              marginBottom: '6px',
                            }}
                          >
                            Điểm đánh giá (1–5)
                          </label>

                          <div
                            style={{
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              backgroundColor: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            {/* Hiển thị sao và cho phép chọn khi đang edit */}
                            <div className="d-flex align-items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const currentRating = isEditing ? editForm.rating : rev.rating;
                                const isFilled = star <= currentRating;
                                return (
                                  <FaStar
                                    key={star}
                                    size={13}
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditForm({ ...editForm, rating: star });
                                      }
                                    }}
                                    style={{
                                      color: isFilled ? '#111827' : '#d1d5db',
                                      cursor: isEditing ? 'pointer' : 'default',
                                      transition: 'color 0.15s ease',
                                    }}
                                  />
                                );
                              })}
                            </div>
                            <span style={{ fontSize: '12px', color: '#111827' }}>
                              · {isEditing ? editForm.rating : rev.rating}/5
                            </span>
                          </div>
                        </div>

                        {/* NỘI DUNG ĐÁNH GIÁ */}
                        <div className="mb-3">
                          <label
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#111827',
                              display: 'block',
                              marginBottom: '6px',
                            }}
                          >
                            {isEditing
                              ? 'Nội dung đã gửi – đang chỉnh sửa'
                              : 'Nội dung đã gửi'}
                          </label>

                          {isEditing ? (
                            <Form.Control
                              as="textarea"
                              rows={4}
                              value={editForm.comment}
                              onChange={(e) =>
                                setEditForm({ ...editForm, comment: e.target.value })
                              }
                              style={{
                                fontSize: '12px',
                                color: '#1f2937',
                                lineHeight: 1.6,
                                borderColor: '#d1d5db',
                                borderRadius: '6px',
                                padding: '10px 12px',
                              }}
                              placeholder="Nhập cảm nhận của bạn về kỳ nghỉ..."
                            />
                          ) : (
                            <div
                              style={{
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: '#1f2937',
                                lineHeight: 1.6,
                                backgroundColor: '#ffffff',
                              }}
                            >
                              {rev.comment}
                            </div>
                          )}
                        </div>

                        {/* HÌNH ẢNH ĐÍNH KÈM (Thumbnail, Tên file & Nút Xóa ảnh) */}
                        <div className="mb-4">
                          <div className="d-flex flex-wrap gap-3 align-items-center">
                            {(isEditing ? editForm.images : rev.images || []).map(
                              (img, imgIdx) => {
                                const imgSrc = typeof img === 'string' ? img : img.url;
                                const imgName =
                                  (typeof img === 'object' ? img.publicId : '') ||
                                  imgSrc.split('/').pop()?.split('?')[0] ||
                                  'hinh-anh.jpg';

                                return (
                                  <div
                                    key={imgIdx}
                                    className="d-flex align-items-start gap-2"
                                  >
                                    <img
                                      src={imgSrc}
                                      alt="Ảnh đánh giá"
                                      style={{
                                        width: '76px',
                                        height: '76px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        backgroundColor: '#e5e7eb',
                                      }}
                                    />
                                    <div>
                                      <div
                                        style={{
                                          fontSize: '10px',
                                          color: '#6b7280',
                                          maxWidth: '110px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          marginBottom: '6px',
                                        }}
                                      >
                                        {imgName}
                                      </div>

                                      {isEditing && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveImage(imgIdx)}
                                          style={{
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            backgroundColor: '#ffffff',
                                            fontSize: '11px',
                                            padding: '6px 12px',
                                            color: '#111827',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Xóa ảnh
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            )}

                            {/* Nút thêm ảnh khi đang chỉnh sửa */}
                            {isEditing && (
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

                        {/* PHẢN HỒI TỪ KHÁCH SẠN (NẾU CÓ) */}
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

                        {/* CÁC NÚT HÀNH ĐỘNG (Lưu thay đổi, Hủy chỉnh sửa, Xóa đánh giá) */}
                        <div className="d-flex flex-wrap gap-2 pt-2">
                          {isEditing ? (
                            <>
                              {/* Nút Lưu thay đổi */}
                              <button
                                type="button"
                                disabled={saveLoading}
                                onClick={() => handleSaveEdit(rev._id)}
                                style={{
                                  border: '1px solid #0b6bde',
                                  backgroundColor: '#0b6bde',
                                  borderRadius: '4px',
                                  padding: '7px 16px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#ffffff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: saveLoading ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {saveLoading ? (
                                  <Spinner size="sm" animation="border" />
                                ) : (
                                  'Lưu thay đổi'
                                )}
                                <span style={{ fontSize: '12px' }}>&gt;</span>
                              </button>

                              {/* Nút Hủy chỉnh sửa */}
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                style={{
                                  border: '1px solid #d1d5db',
                                  backgroundColor: '#ffffff',
                                  borderRadius: '4px',
                                  padding: '7px 16px',
                                  fontSize: '12px',
                                  color: '#111827',
                                  cursor: 'pointer',
                                }}
                              >
                                Hủy chỉnh sửa
                              </button>

                              {/* Nút Xóa đánh giá */}
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(rev)}
                                style={{
                                  border: '1px solid #b91c1c',
                                  backgroundColor: '#b91c1c',
                                  borderRadius: '4px',
                                  padding: '7px 16px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                }}
                              >
                                Xóa đánh giá
                              </button>
                            </>
                          ) : (
                            <>
                              {canEditOrDelete ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(rev)}
                                    style={{
                                      border: '1px solid #0f172a',
                                      backgroundColor: '#0f172a',
                                      color: '#ffffff',
                                      borderRadius: '6px',
                                      padding: '7px 18px',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <FaEdit size={12} /> Chỉnh sửa đánh giá
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteModal(rev)}
                                    style={{
                                      border: '1px solid #ef4444',
                                      backgroundColor: '#ffffff',
                                      color: '#ef4444',
                                      borderRadius: '6px',
                                      padding: '7px 18px',
                                      fontSize: '13px',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <FaTrash size={12} /> Xóa đánh giá
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
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* HỘP XÁC NHẬN XÓA ĐÁNH GIÁ */}
                  {showDeleteModal && reviewToDelete && (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #f87171',
                        borderRadius: '8px',
                        padding: '22px 24px',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          color: '#b91c1c',
                          marginBottom: '14px',
                        }}
                      >
                        Trạng thái hộp xác nhận xóa
                      </div>

                      <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '10px' }}>
                        Bạn muốn xóa đánh giá này?
                      </h3>

                      <p
                        style={{
                          fontSize: '12px',
                          color: '#4b5563',
                          lineHeight: 1.6,
                          marginBottom: '16px',
                          paddingBottom: '16px',
                          borderBottom: '1px solid #e5e7eb',
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
                            border: '1px solid #d1d5db',
                            backgroundColor: '#ffffff',
                            borderRadius: '4px',
                            padding: '7px 16px',
                            fontSize: '12px',
                            color: '#111827',
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
                            borderRadius: '4px',
                            padding: '7px 16px',
                            fontSize: '12px',
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
                </div>
              )
            ) : (
              /* TAB 2: CÁC KỲ NGHỈ CHỜ ĐÁNH GIÁ */
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
                          Mã đơn: <strong>{b.bookingCode}</strong> · {b.bookingDetails?.[0]?.roomTypeName}
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                          Kỳ nghỉ: {formatStayDates(b.checkInDate, b.checkOutDate)}
                        </div>
                      </div>

                      <Button
                        variant="dark"
                        size="sm"
                        className="rounded-pill px-4 fw-semibold"
                        onClick={() => handleOpenCreateModal(b)}
                      >
                        Viết đánh giá
                      </Button>
                    </div>
                  ))}
                </div>
              )
            )}
          </Col>
        </Row>
      </Container>

      {/* MODAL TẠO ĐÁNH GIÁ MỚI */}
      <Modal
        show={showCreateModal}
        onHide={() => !createLoading && setShowCreateModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Đánh giá kỳ nghỉ
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBookingForReview && (
            <Form onSubmit={handleSubmitNewReview}>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedBookingForReview.hotelName}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {selectedBookingForReview.bookingCode} ·{' '}
                  {selectedBookingForReview.bookingDetails?.[0]?.roomTypeName}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Kỳ nghỉ: {formatStayDates(selectedBookingForReview.checkInDate, selectedBookingForReview.checkOutDate)}
                </div>
              </div>

              {/* Chấm điểm sao */}
              <Form.Group className="mb-3">
                <Form.Label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Điểm đánh giá (1–5 sao)
                </Form.Label>
                <div className="d-flex align-items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      size={24}
                      style={{
                        cursor: 'pointer',
                        color: star <= newReviewForm.rating ? '#eab308' : '#e2e8f0',
                        transition: 'color 0.15s ease',
                      }}
                      onClick={() => setNewReviewForm({ ...newReviewForm, rating: star })}
                    />
                  ))}
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginLeft: '6px' }}>
                    {newReviewForm.rating}/5 sao
                  </span>
                </div>
              </Form.Group>

              {/* Nội dung đánh giá */}
              <Form.Group className="mb-3">
                <Form.Label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Chia sẻ cảm nhận chi tiết
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  required
                  placeholder="Phòng sạch sẽ, vị trí trung tâm tiện đi lại, nhân viên nhiệt tình..."
                  value={newReviewForm.comment}
                  onChange={(e) => setNewReviewForm({ ...newReviewForm, comment: e.target.value })}
                  style={{ fontSize: '13.5px', borderRadius: '8px' }}
                />
              </Form.Group>

              {/* Đính kèm ảnh */}
              <Form.Group className="mb-4">
                <Form.Label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Hình ảnh thực tế đính kèm (tùy chọn)
                </Form.Label>
                <div className="d-flex gap-2 mb-2">
                  <Form.Control
                    type="url"
                    placeholder="Dán link ảnh (https://...)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    type="button"
                    onClick={() => {
                      if (!newImageUrl.trim()) return;
                      const url = newImageUrl.trim();
                      const publicId = url.split('/').pop()?.split('?')[0] || 'review_img';
                      setNewReviewForm((prev) => ({
                        ...prev,
                        images: [...prev.images, { url, publicId }],
                      }));
                      setNewImageUrl('');
                    }}
                  >
                    Thêm
                  </Button>
                </div>

                {newReviewForm.images.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {newReviewForm.images.map((img, i) => (
                      <div
                        key={i}
                        className="position-relative"
                        style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' }}
                      >
                        <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() =>
                            setNewReviewForm((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, idx) => idx !== i),
                            }))
                          }
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Group>

              <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                <Button
                  variant="light"
                  size="sm"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  variant="dark"
                  size="sm"
                  type="submit"
                  disabled={createLoading}
                  className="rounded-pill px-4"
                >
                  {createLoading ? <Spinner size="sm" animation="border" /> : 'Gửi đánh giá'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MyReviewsPage;
