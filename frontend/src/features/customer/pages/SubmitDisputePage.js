import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Alert, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaLock, FaCloudUploadAlt, FaTimes, FaPaperPlane, FaFilePdf, FaStar, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import CustomerSidebar from '../components/CustomerSidebar';
import { getBookingDisputeInfo, createDispute } from '../CustomerApi';
import { BLANK_IMG, imgBg, onImgError } from '../imageFallback';

const formatStayDates = (checkInDate, checkOutDate) => {
  if (!checkInDate || !checkOutDate) return '';
  const dIn = new Date(checkInDate);
  const dOut = new Date(checkOutDate);

  const pad = (n) => String(n).padStart(2, '0');
  const dayIn = pad(dIn.getDate());
  const monthIn = pad(dIn.getMonth() + 1);
  const dayOut = pad(dOut.getDate());
  const monthOut = pad(dOut.getMonth() + 1);
  const yearOut = dOut.getFullYear();

  return `${dayIn}/${monthIn} – ${dayOut}/${monthOut}/${yearOut}`;
};

const CATEGORY_OPTIONS = [
  { value: 'INCORRECT_INFORMATION', label: 'Thông tin chỗ nghỉ không đúng mô tả' },
  { value: 'SERVICE_QUALITY', label: 'Chất lượng dịch vụ không đúng cam kết' },
  { value: 'OVERCHARGE', label: 'Thu thêm phụ phí không công bố' },
  { value: 'CANCELLATION', label: 'Sự cố hủy phòng / Không nhận được phòng' },
  { value: 'OTHER', label: 'Lý do khác' },
];

const DISPUTE_STATUS_LABEL = {
  PENDING: 'chờ xử lý',
  IN_PROGRESS: 'đang xử lý',
  WAITING_PARTNER: 'chờ đối tác phản hồi',
};

const SubmitDisputePage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [booking, setBooking] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [existingDispute, setExistingDispute] = useState(null);

  // Form states
  const [category, setCategory] = useState('INCORRECT_INFORMATION');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [agreeTruth, setAgreeTruth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, dispute: null });

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await getBookingDisputeInfo(bookingId);
        if (res.data?.success) {
          setBooking(res.data.booking);
          setHotel(res.data.hotel);
          setExistingDispute(res.data.existingDispute);
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin kỳ nghỉ để khiếu nại:', err);
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

  // Xử lý đính kèm file (ảnh hoặc PDF)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachments.length + files.length > 5) {
      alert('Tối đa 5 tài liệu/ảnh chứng cứ cho mỗi khiếu nại.');
      return;
    }

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Tệp "${file.name}" vượt quá dung lượng tối đa 10 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setAttachments((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileUrl: uploadEvent.target.result, // base64 payload
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = null;
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('Vui lòng nhập mô tả sự việc chi tiết.');
      return;
    }

    if (category === 'INCORRECT_INFORMATION' && attachments.length === 0) {
      alert('Với danh mục thông tin chỗ nghỉ không đúng mô tả, bạn bắt buộc phải đính kèm ít nhất 1 ảnh/chứng cứ.');
      return;
    }

    if (!agreeTruth) {
      alert('Vui lòng tích chọn cam kết thông tin và chứng cứ là đúng sự thật.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createDispute({
        bookingId: booking._id,
        category,
        description: description.trim(),
        attachments,
      });

      if (res.data?.success) {
        setSuccessModal({ show: true, dispute: res.data.dispute });
      }
    } catch (err) {
      console.error('Lỗi gửi khiếu nại:', err);
      alert(err.response?.data?.message || 'Không thể gửi khiếu nại. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const hotelCover = hotel?.images?.find((img) => img.isCover)?.url || hotel?.images?.[0]?.url || BLANK_IMG;
  const roomDetail = booking?.details?.[0] || null;

  return (
    <Container className="py-4">
      <Row className="g-4">
        {/* Sidebar trái */}
        <Col lg={3}>
          <CustomerSidebar activeKey="complaints" />
        </Col>

        {/* Nội dung chính bên phải */}
        <Col lg={9}>
          <div className="mb-4">
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Gửi khiếu nại về kỳ nghỉ
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Khiếu nại được gắn với đặt phòng thuộc tài khoản của bạn để đối chiếu thông tin.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Đang tải thông tin kỳ nghỉ...</p>
            </div>
          ) : errorMsg ? (
            <Alert variant="danger">{errorMsg}</Alert>
          ) : existingDispute ? (
            <Alert variant="warning" className="p-4 rounded-3 border-0 shadow-sm">
              <h5 className="fw-bold mb-2">Đơn đặt phòng này đã có khiếu nại đang xử lý!</h5>
              <p className="mb-2">
                Mã đặt phòng <strong>{booking?.bookingCode}</strong> hiện đang có khiếu nại ở trạng thái <strong>{DISPUTE_STATUS_LABEL[existingDispute.status] || existingDispute.status}</strong>.
              </p>
              <p className="small text-muted mb-3">
                Bộ phận Quản lý vận hành (Operations Manager) đang xem xét trường hợp của bạn. Vui lòng chờ phản hồi hoặc liên hệ CSKH.
              </p>
              <Button variant="outline-primary" size="sm" onClick={() => navigate('/booking-history')}>
                Về lịch sử đặt phòng
              </Button>
            </Alert>
          ) : (
            <>
              {/* CARD 1: THÔNG TIN KỲ NGHỈ */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
                  Thông tin kỳ nghỉ
                </h2>

                <Row className="g-3 align-items-center">
                  <Col md={3}>
                    <img
                      src={hotelCover}
                      alt={hotel?.name}
                      onError={onImgError}
                      style={{
                        width: '100%',
                        height: '130px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        ...imgBg,
                      }}
                    />
                  </Col>
                  <Col md={9}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        {hotel?.name || booking?.hotelName}
                      </h3>
                      {hotel?.starRating && (
                        <div className="d-flex align-items-center text-warning" style={{ fontSize: '13px' }}>
                          <FaStar className="me-1" />
                          <span>{hotel.starRating} sao</span>
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                      {hotel?.address || booking?.hotelAddress}, {hotel?.provinceCity}
                    </p>

                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                      {roomDetail && (
                        <div>
                          <strong>Loại phòng:</strong> {roomDetail.roomTypeName}
                        </div>
                      )}
                      <div>
                        <strong>Mã đặt phòng:</strong> <span className="text-primary fw-semibold">{booking?.bookingCode}</span>
                      </div>
                      <div>
                        <strong>Nhận / trả phòng:</strong> {formatStayDates(booking?.checkInDate, booking?.checkOutDate)}
                      </div>
                      <div>
                        <strong>Khách / số lượng:</strong> {booking?.adultsCount || 1} người lớn, {booking?.childrenCount || 0} trẻ em · {booking?.totalNights || 1} đêm
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* CARD 2: THÔNG TIN KHIẾU NẠI */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
                  Thông tin khiếu nại
                </h2>

                <Form onSubmit={handleSubmit}>
                  {/* Đặt phòng liên quan (read-only with lock) */}
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                      Đặt phòng liên quan
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="text"
                        readOnly
                        disabled
                        value={`${booking?.bookingCode} · ${formatStayDates(booking?.checkInDate, booking?.checkOutDate)}`}
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          cursor: 'not-allowed',
                          paddingRight: '36px',
                          fontSize: '13.5px',
                        }}
                      />
                      <FaLock
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94a3b8',
                        }}
                      />
                    </div>
                  </Form.Group>

                  {/* Danh mục khiếu nại */}
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                      Danh mục *
                    </Form.Label>
                    <Form.Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ fontSize: '13.5px', borderRadius: '8px' }}
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  {/* Mô tả sự việc */}
                  <Form.Group className="mb-3">
                    <Form.Label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                      Mô tả sự việc *
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      placeholder="Mô tả cụ thể sự việc, tình trạng phòng, thái độ phục vụ hoặc các chi phí phát sinh mà bạn cho rằng không thỏa đáng..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={{ fontSize: '13.5px', borderRadius: '8px', lineHeight: 1.6 }}
                      required
                    />
                  </Form.Group>

                  {/* Banner hướng dẫn khi chọn INCORRECT_INFORMATION */}
                  {category === 'INCORRECT_INFORMATION' && (
                    <div
                      className="d-flex align-items-start gap-2 mb-3 p-3 rounded-2"
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        fontSize: '13px',
                        color: '#1e40af',
                      }}
                    >
                      <FaInfoCircle className="mt-1 flex-shrink-0" />
                      <div>
                        Với danh mục <strong>thông tin chỗ nghỉ không đúng mô tả</strong>, chứng cứ là <strong>bắt buộc</strong>. Hãy gửi ảnh, hóa đơn hoặc tài liệu thể hiện sự khác biệt với thông tin đã công bố trên ứng dụng.
                      </div>
                    </div>
                  )}

                  {/* Upload chứng cứ */}
                  <Form.Group className="mb-4">
                    <Form.Label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                      Thêm ảnh hoặc hóa đơn làm chứng cứ
                    </Form.Label>
                    <div
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '10px',
                        padding: '24px 16px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                      }}
                      onClick={() => document.getElementById('dispute-file-input').click()}
                    >
                      <FaCloudUploadAlt size={36} color="#64748b" className="mb-2" />
                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                        Kéo thả hoặc chọn tệp · JPG, PNG, PDF · Tối đa 10 MB/tệp (Tối đa 5 tệp)
                      </p>
                      <Button variant="outline-primary" size="sm" style={{ pointerEvents: 'none' }}>
                        Chọn tệp
                      </Button>
                      <input
                        id="dispute-file-input"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                    </div>

                    {/* Danh sách file đã chọn */}
                    {attachments.length > 0 && (
                      <div className="mt-3 d-flex flex-column gap-2">
                        {attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="d-flex align-items-center justify-content-between p-2 rounded-2"
                            style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '12.5px' }}
                          >
                            <div className="d-flex align-items-center gap-2 text-truncate me-2">
                              {att.fileType === 'application/pdf' ? (
                                <FaFilePdf className="text-danger flex-shrink-0" size={16} />
                              ) : (
                                <img
                                  src={att.fileUrl}
                                  alt="preview"
                                  style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }}
                                />
                              )}
                              <span className="text-truncate fw-medium">{att.fileName}</span>
                              <span className="text-muted">({(att.fileSize / 1024).toFixed(0)} KB)</span>
                            </div>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-danger p-0 text-decoration-none"
                              onClick={() => removeAttachment(idx)}
                            >
                              <FaTimes />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Form.Group>

                  {/* Checkbox xác nhận cam kết */}
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="agree-truth"
                      checked={agreeTruth}
                      onChange={(e) => setAgreeTruth(e.target.checked)}
                      label={
                        <span style={{ fontSize: '13px', color: '#334155' }}>
                          Tôi xác nhận thông tin và chứng cứ phản ánh đúng sự việc của kỳ nghỉ này.
                        </span>
                      }
                    />
                  </Form.Group>

                  {/* Hộp ghi chú trạng thái Pending theo SRS */}
                  <div
                    className="p-3 rounded-2 mb-4"
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '12.5px',
                      color: '#64748b',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Lưu ý:</strong> Yêu cầu sẽ ở trạng thái <strong>Pending (Chờ xử lý)</strong> khi gửi và được chuyển đến <strong>Quản lý vận hành (Operations Manager)</strong> xem xét. Gửi khiếu nại không đồng nghĩa được duyệt hoàn tiền.
                  </div>

                  {/* Nút hành động */}
                  <div className="d-flex gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={submitting}
                      className="d-flex align-items-center gap-2 px-4 py-2"
                      style={{ fontSize: '14px', fontWeight: 600, borderRadius: '8px' }}
                    >
                      {submitting ? (
                        <>
                          <Spinner size="sm" animation="border" /> Đang gửi...
                        </>
                      ) : (
                        <>
                          Gửi khiếu nại <FaPaperPlane size={13} />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => navigate('/booking-history')}
                      style={{ fontSize: '14px', borderRadius: '8px' }}
                    >
                      Hủy
                    </Button>
                  </div>
                </Form>
              </div>
            </>
          )}
        </Col>
      </Row>

      {/* Modal thông báo gửi khiếu nại thành công */}
      <Modal show={successModal.show} onHide={() => navigate('/booking-history')} centered>
        <Modal.Body className="text-center p-4">
          <FaCheckCircle className="text-success mb-3" size={48} />
          <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Đã gửi khiếu nại thành công!
          </h4>
          <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }} className="mt-2">
            Khiếu nại cho đơn phòng <strong>{successModal.dispute?.bookingCode}</strong> đã được ghi nhận với trạng thái <strong>chờ xử lý</strong>.
          </p>
          <p style={{ fontSize: '12.5px', color: '#64748b' }}>
            Quản lý vận hành sẽ kiểm tra hồ sơ chứng cứ và phản hồi giải quyết cho bạn trong thời gian sớm nhất.
          </p>
          <Button
            variant="primary"
            className="mt-3 px-4"
            onClick={() => navigate('/booking-history')}
            style={{ borderRadius: '8px' }}
          >
            Về trang đặt phòng
          </Button>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default SubmitDisputePage;

