import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import { FaStar, FaFilter, FaChevronDown, FaChevronUp, FaReply, FaCheckCircle, FaUser } from 'react-icons/fa';
import { getHotelReviews } from '../CustomerApi';
import RatingStars from './RatingStars';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const HotelReviews = ({ hotelId, initialRatingSummary }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStar, setSelectedStar] = useState(null); // null = Tat ca
  const [showAll, setShowAll] = useState(false); // false = vai danh gia moi nhat

  const [stats, setStats] = useState({
    totalReviews: initialRatingSummary?.total_reviews || initialRatingSummary?.totalReviews || 0,
    averageRating: initialRatingSummary?.average_rating || initialRatingSummary?.averageRating || 0,
    starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getHotelReviews(hotelId)
      .then((res) => {
        if (!isMounted) return;
        const apiReviews = res.data?.reviews || [];
        const apiStats = res.data?.stats;

        setReviews(apiReviews);
        if (apiStats) {
          setStats(apiStats);
        } else {
          setStats({
            totalReviews: apiReviews.length,
            averageRating: initialRatingSummary?.average_rating || 0,
            starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Lỗi khi tải đánh giá từ database:', err.message);
        setReviews([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [hotelId, initialRatingSummary]);

  // Loc danh gia theo so sao da chon
  const filteredReviews = reviews.filter((r) => {
    if (selectedStar === null) return true;
    return Math.round(r.rating) === selectedStar;
  });

  // Che do hien thi: 3 danh gia moi nhat hoac tat ca
  const DISPLAY_LIMIT = 3;
  const displayedReviews = showAll ? filteredReviews : filteredReviews.slice(0, DISPLAY_LIMIT);
  const hasMore = filteredReviews.length > DISPLAY_LIMIT;

  const totalStarCount = Object.values(stats.starCounts).reduce((acc, count) => acc + count, 0) || stats.totalReviews || 1;

  return (
    <div className="mt-5 p-4 bg-white rounded-4 shadow-sm border">
      {/* Tieu de section */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Đánh giá từ khách hàng
          </h4>
          <p className="text-muted small mb-0">
            Trải nghiệm thực tế từ những khách đã từng lưu trú
          </p>
        </div>
        <Badge bg="dark" className="px-3 py-2 rounded-pill fs-6 fw-normal">
          {stats.totalReviews > 0 ? (
            <>⭐ {stats.averageRating.toFixed(1)} / 5 ({stats.totalReviews} đánh giá)</>
          ) : (
            <>Chưa có đánh giá</>
          )}
        </Badge>
      </div>

      {/* Tong quan diem so & Thong ke phan bo sao */}
      <Row className="g-4 align-items-center mb-4 pb-4 border-bottom">
        <Col md={4} className="text-center border-end-md">
          <div className="display-4 fw-bold text-dark mb-1">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
          </div>
          <RatingStars rating={stats.averageRating || 0} size="1.25rem" />
          <div className="text-muted small mt-2">
            Dựa trên <strong>{stats.totalReviews}</strong> lượt đánh giá
          </div>
        </Col>

        <Col md={8}>
          <div className="d-flex flex-column gap-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.starCounts[star] || 0;
              const percentage = stats.totalReviews > 0 ? Math.round((count / totalStarCount) * 100) : 0;
              const isActive = selectedStar === star;

              return (
                <div
                  key={star}
                  className="d-flex align-items-center gap-2"
                  style={{ cursor: count > 0 ? 'pointer' : 'default' }}
                  onClick={() => count > 0 && setSelectedStar(isActive ? null : star)}
                  title={`Lọc theo ${star} sao`}
                >
                  <span className={`small fw-semibold ${isActive ? 'text-warning' : 'text-secondary'}`} style={{ width: '45px' }}>
                    {star} sao
                  </span>
                  <div className="flex-grow-1">
                    <ProgressBar
                      now={percentage}
                      variant={star >= 4 ? 'warning' : star === 3 ? 'info' : 'secondary'}
                      style={{ height: '8px', borderRadius: '4px' }}
                    />
                  </div>
                  <span className="small text-muted text-end" style={{ width: '45px' }}>
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Col>
      </Row>

      {/* Bo loc theo sao */}
      {reviews.length > 0 && (
        <div className="d-flex align-items-center flex-wrap gap-2 mb-4">
          <span className="text-secondary small fw-bold d-flex align-items-center me-1">
            <FaFilter className="me-1 text-warning" /> Lọc theo:
          </span>

          <Button
            variant={selectedStar === null ? 'warning' : 'outline-secondary'}
            size="sm"
            className="rounded-pill px-3 py-1 fw-semibold"
            onClick={() => setSelectedStar(null)}
          >
            Tất cả ({reviews.length})
          </Button>

          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => Math.round(r.rating) === star).length;
            const isSelected = selectedStar === star;

            return (
              <Button
                key={star}
                variant={isSelected ? 'warning' : 'outline-secondary'}
                size="sm"
                className="rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1"
                disabled={count === 0}
                onClick={() => setSelectedStar(isSelected ? null : star)}
              >
                <span>{star}</span>
                <FaStar className={isSelected ? 'text-dark' : 'text-warning'} style={{ fontSize: '0.8rem' }} />
                <span>({count})</span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Danh sach danh gia */}
      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" variant="warning" size="sm" />
          <span className="ms-2 text-muted small">Đang tải đánh giá...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4">
          <p className="text-muted mb-0">Khách sạn này chưa có đánh giá nào từ khách hàng.</p>
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4">
          <p className="text-muted mb-2">Chưa có đánh giá nào cho mức {selectedStar} sao này.</p>
          <Button
            variant="outline-dark"
            size="sm"
            className="rounded-pill px-3"
            onClick={() => setSelectedStar(null)}
          >
            Xem tất cả ({reviews.length}) đánh giá
          </Button>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {displayedReviews.map((rev) => {
            const customerName = rev.customer?.fullName || 'Khách hàng';
            const initialLetter = customerName.charAt(0).toUpperCase();

            return (
              <Card key={rev._id} className="border-0 bg-light rounded-4 p-3">
                <Card.Body className="p-0">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-3">
                      {rev.customer?.avatarUrl ? (
                        <img
                          src={rev.customer.avatarUrl}
                          alt={customerName}
                          className="rounded-circle object-fit-cover"
                          style={{ width: '42px', height: '42px' }}
                        />
                      ) : (
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                          style={{
                            width: '42px',
                            height: '42px',
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
                          }}
                        >
                          {initialLetter || <FaUser size={14} />}
                        </div>
                      )}

                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h6 className="fw-bold mb-0 text-dark">{customerName}</h6>
                          <Badge bg="success" className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-normal" style={{ fontSize: '0.7rem' }}>
                            <FaCheckCircle size={10} /> Đã lưu trú
                          </Badge>
                        </div>
                        <small className="text-muted">{formatDate(rev.createdAt)}</small>
                      </div>
                    </div>

                    <RatingStars rating={rev.rating} size="0.9rem" />
                  </div>

                  {/* Noi dung danh gia */}
                  <p className="text-dark mb-2 mt-2 lh-base" style={{ fontSize: '0.95rem' }}>
                    {rev.comment}
                  </p>

                  {/* Anh dinh kem cua khach neu co */}
                  {rev.images && rev.images.length > 0 && (
                    <div className="d-flex gap-2 flex-wrap my-2">
                      {rev.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img.url}
                          alt="Review attachment"
                          className="rounded-3 object-fit-cover border"
                          style={{ width: '80px', height: '80px' }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Phan hoi tu chu khach san */}
                  {rev.partnerReply?.content && (
                    <div className="mt-3 p-3 bg-white rounded-3 border-start border-warning border-3 shadow-2xs">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                          <FaReply className="text-warning" style={{ transform: 'rotate(180deg)' }} />
                          Phản hồi từ chủ khách sạn
                        </span>
                        {rev.partnerReply.repliedAt && (
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {formatDate(rev.partnerReply.repliedAt)}
                          </small>
                        )}
                      </div>
                      <p className="small text-secondary mb-0">
                        {rev.partnerReply.content}
                      </p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}

          {/* Nut chuyen doi giua "Xem tat ca" va "Thu gon" */}
          {hasMore && (
            <div className="text-center mt-3">
              <Button
                variant="outline-dark"
                className="rounded-pill px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <FaChevronUp size={12} /> Thu gọn đánh giá
                  </>
                ) : (
                  <>
                    <FaChevronDown size={12} /> Xem tất cả ({filteredReviews.length}) đánh giá
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HotelReviews;
