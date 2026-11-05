import { useContext, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Form, Modal, ProgressBar, Spinner } from "react-bootstrap";
import { FaRegStar, FaStar } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import TablePagination from "../components/TablePagination";
import { formatDate, formatDateTime, isInvalidRange, MAX_RANGE_DAYS, MESSAGES } from "../data/bookingOptions";
import { getPartnerReviews } from "../partnerApi";

const SORT_OPTIONS = [
  ["newest", "Mới nhất"],
  ["oldest", "Cũ nhất"],
  ["highest", "Điểm cao nhất"],
  ["lowest", "Điểm thấp nhất"],
];
const RATING_LABELS = { 1: "Rất tệ", 2: "Không hài lòng", 3: "Bình thường", 4: "Hài lòng", 5: "Rất hài lòng" };
const NO_REVIEWS = "Khách sạn chưa có đánh giá nào."; // MSG07
const NO_MATCH = "Không có đánh giá nào phù hợp với bộ lọc.";
const FILTER_KEYS = ["rating", "from", "to", "roomTypeId", "withComment"];
const readFilters = (params) => Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) || ""]));

const Stars = ({ value, size = 14 }) => (
  <span className="text-warning text-nowrap" aria-label={`${value}/5 sao`}>
    {[1, 2, 3, 4, 5].map((star) => (star <= Math.round(value) ? <FaStar key={star} size={size} /> : <FaRegStar key={star} size={size} />))}
  </span>
);

const StayInfo = ({ review }) => (
  <span className="text-muted small">
    {review.roomTypeNames.join(", ") || "—"} · Lưu trú {formatDate(review.checkInDate)} – {formatDate(review.checkOutDate)}
  </span>
);

const PartnerReviews = () => {
  const { token } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => readFilters(searchParams));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getPartnerReviews({ ...readFilters(searchParams), sort: searchParams.get("sort") || "newest", page: searchParams.get("page") || 1 }, token)
      .then(({ data }) => { if (active) setResult(data); })
      .catch((requestError) => { if (active) setLoadError(requestError.response?.data?.message || "Không thể tải danh sách đánh giá."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchParams, token, retryCount]);

  const updateFilter = (event) => {
    const { name, type, checked, value } = event.target;
    setFilters((current) => ({ ...current, [name]: type === "checkbox" ? (checked ? "true" : "") : value }));
  };
  const setParam = (key, value) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    return next;
  });
  const applyFilters = (event) => {
    event.preventDefault();
    if (isInvalidRange(filters.from, filters.to)) { setRangeError(MESSAGES.invalidRange(MAX_RANGE_DAYS)); return; }
    setRangeError("");
    const next = new URLSearchParams();
    FILTER_KEYS.forEach((key) => { if (filters[key]) next.set(key, filters[key]); });
    if (searchParams.get("sort")) next.set("sort", searchParams.get("sort"));
    setSearchParams(next);
  };
  const clearFilters = () => {
    setFilters(readFilters(new URLSearchParams()));
    setRangeError("");
    setSearchParams(new URLSearchParams());
  };

  const summary = result?.summary;

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Đánh giá của khách</div>
      <h1 className="h3 fw-bold mb-1">Đánh giá của khách</h1>
      {result && <p className="text-muted mb-4">{result.hotel.name}</p>}

      {loadError && <Alert variant="danger" className="d-flex justify-content-between align-items-center">{loadError}<Button size="sm" variant="outline-danger" onClick={() => setRetryCount((count) => count + 1)}>Thử lại</Button></Alert>}
      {loading && !result && <div className="text-center p-5"><Spinner /></div>}

      {result && summary.totalReviews === 0 && (
        <Card className="border-0 shadow-sm rounded-4"><Card.Body className="text-center text-muted py-5">{NO_REVIEWS}</Card.Body></Card>
      )}

      {result && summary.totalReviews > 0 && (
        <>
          <Card className="border-0 shadow-sm rounded-4 mb-3">
            <Card.Body className="p-4 row g-4 align-items-center">
              <div className="col-md-4 text-center">
                <div className="display-5 fw-bold">{summary.averageRating.toLocaleString("vi-VN")}<span className="fs-5 text-muted">/5</span></div>
                <Stars value={summary.averageRating} size={20} />
                <div className="text-muted small mt-1">{summary.totalReviews} đánh giá</div>
              </div>
              <div className="col-md-8">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.distribution[star] || 0;
                  return (
                    <div key={star} className="d-flex align-items-center gap-2 small mb-1">
                      <span className="text-nowrap" style={{ width: 48 }}>{star} <FaStar className="text-warning" /></span>
                      <ProgressBar now={(count / summary.totalReviews) * 100} variant="warning" className="flex-grow-1" style={{ height: 8 }} />
                      <span className="text-muted text-end" style={{ width: 32 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm rounded-4 mb-3">
            <Card.Body className="p-3">
              <Form onSubmit={applyFilters} className="row g-2 align-items-end">
                <Form.Group className="col-6 col-md-2" controlId="review-rating"><Form.Label className="small fw-semibold">Số sao</Form.Label><Form.Select name="rating" value={filters.rating} onChange={updateFilter}><option value="">Tất cả</option>{[5, 4, 3, 2, 1].map((star) => <option key={star} value={star}>{star} sao</option>)}</Form.Select></Form.Group>
                <Form.Group className="col-6 col-md-3" controlId="review-room-type"><Form.Label className="small fw-semibold">Loại phòng</Form.Label><Form.Select name="roomTypeId" value={filters.roomTypeId} onChange={updateFilter}><option value="">Tất cả</option>{result.roomTypes.map((roomType) => <option key={roomType._id} value={roomType._id}>{roomType.name}</option>)}</Form.Select></Form.Group>
                <Form.Group className="col-6 col-md-2" controlId="review-from"><Form.Label className="small fw-semibold">Đánh giá từ ngày</Form.Label><Form.Control type="date" name="from" value={filters.from} onChange={updateFilter} /></Form.Group>
                <Form.Group className="col-6 col-md-2" controlId="review-to"><Form.Label className="small fw-semibold">Đến ngày</Form.Label><Form.Control type="date" name="to" value={filters.to} onChange={updateFilter} /></Form.Group>
                <Form.Group className="col-md-3 pb-2" controlId="review-with-comment"><Form.Check type="checkbox" name="withComment" label="Chỉ hiển thị đánh giá có bình luận" checked={filters.withComment === "true"} onChange={updateFilter} /></Form.Group>
                <div className="col-12 d-flex flex-wrap gap-2 align-items-center">
                  <Button type="submit" variant="dark" size="sm">Lọc</Button>
                  <Button type="button" variant="outline-secondary" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button>
                  <Form.Select aria-label="Sắp xếp" size="sm" className="ms-auto w-auto" value={searchParams.get("sort") || "newest"} onChange={(event) => setParam("sort", event.target.value)}>{SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Form.Select>
                </div>
                {rangeError && <div className="col-12 text-danger small">{rangeError}</div>}
              </Form>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm rounded-4 overflow-hidden" style={{ opacity: loading ? 0.6 : 1 }}>
            {result.reviews.map((review) => (
              <div key={review._id} className="p-3 border-bottom" role="button" onClick={() => setSelected(review)}>
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                  <div><span className="fw-semibold me-2">{review.reviewerName}</span><Stars value={review.rating} /> <Badge bg="light" text="dark" className="fw-normal ms-1">{RATING_LABELS[review.rating]}</Badge></div>
                  <span className="text-muted small">{formatDateTime(review.createdAt)}</span>
                </div>
                <StayInfo review={review} />
                <p className="mb-2 mt-2" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-line" }}>{review.comment}</p>
                {review.images.length > 0 && (
                  <div className="d-flex gap-2">
                    {review.images.slice(0, 4).map((image) => <img key={image.url} src={image.url} alt="Ảnh đánh giá" className="rounded" style={{ width: 64, height: 64, objectFit: "cover" }} />)}
                    {review.images.length > 4 && <span className="small text-muted align-self-center">+{review.images.length - 4} ảnh</span>}
                  </div>
                )}
              </div>
            ))}
            {!result.reviews.length && <div className="text-center text-muted py-5">{NO_MATCH}</div>}
            {result.pagination.totalPages > 1 && <Card.Footer className="bg-white"><TablePagination pagination={result.pagination} onChange={(page) => setParam("page", String(page))} /></Card.Footer>}
          </Card>
        </>
      )}

      <Modal show={Boolean(selected)} onHide={() => setSelected(null)} size="lg" centered>
        {selected && (
          <>
            <Modal.Header closeButton>
              <Modal.Title className="h5">{selected.reviewerName} · <Stars value={selected.rating} size={16} /></Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-1"><Badge bg="light" text="dark" className="fw-normal">{RATING_LABELS[selected.rating]}</Badge> <span className="text-muted small ms-2">{formatDateTime(selected.createdAt)}</span></div>
              <StayInfo review={selected} />
              <p className="mt-3" style={{ whiteSpace: "pre-line" }}>{selected.comment}</p>
              {selected.images.length > 0 && (
                <div className="row g-2">
                  {selected.images.map((image) => (
                    <div key={image.url} className="col-6 col-md-4"><a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt="Ảnh đánh giá" className="rounded w-100" style={{ height: 160, objectFit: "cover" }} /></a></div>
                  ))}
                </div>
              )}
            </Modal.Body>
          </>
        )}
      </Modal>
    </div>
  );
};

export default PartnerReviews;
