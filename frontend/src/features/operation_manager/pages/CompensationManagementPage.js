import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import {
  FiCheck,
  FiCreditCard,
  FiEdit3,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiUserCheck,
  FiX,
} from 'react-icons/fi';
import {
  createCompensation,
  getManagerBookings,
  getRefunds,
  reviewRefund,
} from '../managerApi';

const STATUS_LABELS = {
  REQUESTED: 'Chờ thẩm định',
  UNDER_REVIEW: 'Đang xác minh sai lệch',
  APPROVED: 'Đã duyệt bồi thường',
  REJECTED: 'Từ chối bồi thường',
  PROCESSED: 'Đã hoàn tiền bồi thường',
};

const STATUS_TONE = {
  REQUESTED: 'pending',
  UNDER_REVIEW: 'progress',
  APPROVED: 'success',
  REJECTED: 'danger',
  PROCESSED: 'success',
};

const ISSUE_TYPES = [
  { value: 'INCORRECT_CUSTOMER_INFO', label: '1. Nhập sai / Thông tin khách hàng không đúng' },
  { value: 'INCORRECT_HOTEL_INFO', label: '2. Thông tin khách sạn / phòng không đúng thực tế' },
  { value: 'SERVICE_COMPENSATION', label: '3. Bồi thường chất lượng dịch vụ lưu trú' },
  { value: 'OVERCHARGE_COMPENSATION', label: '4. Bồi thường thu phí phát sinh không hợp lệ' },
];

const CompensationManagementPage = () => {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // MÀN HÌNH PHỤ 1: TẠO HỒ SƠ BỒI THƯỜNG / ĐÍNH CHÍNH THÔNG TIN CHO ĐƠN
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundBookings, setFoundBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [createForm, setCreateForm] = useState({
    issueType: 'INCORRECT_CUSTOMER_INFO',
    requestedAmount: '',
    reason: '',
    note: '',
    autoApprove: true,
    autoProcess: true,
    customerCorrection: {
      bookerFullName: '',
      bookerPhone: '',
      bookerEmail: '',
      guestFullName: '',
      guestPhone: '',
      specialRequests: '',
    },
  });

  // MÀN HÌNH PHỤ 2: THẨM ĐỊNH & PHÊ DUYỆT BỒI THƯỜNG / SỬA THÔNG TIN KHÁCH
  const [reviewModal, setReviewModal] = useState({
    show: false,
    item: null,
    decision: 'APPROVE', // 'UNDER_REVIEW' | 'APPROVE' | 'REJECT' | 'MARK_PROCESSED'
    approvedAmount: '',
    note: '',
    paymentReference: '',
    customerCorrection: {
      bookerFullName: '',
      bookerPhone: '',
      bookerEmail: '',
      guestFullName: '',
      guestPhone: '',
      specialRequests: '',
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRefunds(statusFilter ? { status: statusFilter } : undefined);
      setItems(res.data.refunds || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách hồ sơ bồi thường.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Tìm kiếm đơn đặt phòng để tạo bồi thường
  const searchBookings = async (e) => {
    if (e) e.preventDefault();
    setSearching(true);
    setError('');
    try {
      const res = await getManagerBookings({ q: searchQuery });
      setFoundBookings(res.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tìm kiếm đơn đặt phòng.');
    } finally {
      setSearching(false);
    }
  };

  const selectBookingToCompensate = (booking) => {
    setSelectedBooking(booking);
    setCreateForm({
      issueType: 'INCORRECT_CUSTOMER_INFO',
      requestedAmount: String(booking.totalAmount || 0),
      reason: `Khách hàng phản ánh thông tin người lưu trú/đặt phòng bị nhập sai hoặc khách sạn không khớp phòng lúc nhận.`,
      note: 'Đã xác minh và đính chính lại thông tin khách lưu trú trên hệ thống.',
      autoApprove: true,
      autoProcess: true,
      customerCorrection: {
        bookerFullName: booking.bookerFullName || '',
        bookerPhone: booking.bookerPhone || '',
        bookerEmail: booking.bookerEmail || '',
        guestFullName: booking.guestFullName || '',
        guestPhone: booking.guestPhone || '',
        specialRequests: booking.specialRequests || '',
      },
    });
  };

  // Submit tạo hồ sơ bồi thường mới
  const submitCreate = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        bookingId: selectedBooking._id,
        issueType: createForm.issueType,
        requestedAmount: Number(createForm.requestedAmount),
        reason: createForm.reason.trim(),
        note: createForm.note.trim(),
        autoApprove: createForm.autoApprove,
        autoProcess: createForm.autoProcess,
        customerCorrection: createForm.customerCorrection,
      };
      const res = await createCompensation(payload);
      setNotice(res.data?.message || 'Đã tạo hồ sơ bồi thường thành công.');
      setShowCreateModal(false);
      setSelectedBooking(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo hồ sơ bồi thường.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở màn hình phụ duyệt bồi thường
  const openReviewModal = (item, decision) => {
    const booking = item.bookingId;
    setReviewModal({
      show: true,
      item,
      decision,
      approvedAmount: String(item.approvedAmount > 0 ? item.approvedAmount : item.requestedAmount),
      note: item.reviewNote || '',
      paymentReference: item.paymentId?.txnRef || '',
      customerCorrection: {
        bookerFullName: booking?.bookerFullName || '',
        bookerPhone: booking?.bookerPhone || '',
        bookerEmail: booking?.bookerEmail || '',
        guestFullName: booking?.guestFullName || '',
        guestPhone: booking?.guestPhone || '',
        specialRequests: booking?.specialRequests || '',
      },
    });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    const { item, decision, approvedAmount, note, paymentReference, customerCorrection } = reviewModal;
    if (!item) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await reviewRefund(item._id, {
        decision,
        approvedAmount: Number(approvedAmount),
        note: note.trim(),
        paymentReference: paymentReference.trim(),
        customerCorrection,
      });
      setNotice('Đã cập nhật trạng thái bồi thường và gửi thông báo tới các bên.');
      setReviewModal((prev) => ({ ...prev, show: false }));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật hồ sơ bồi thường.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="om-page-heading">
        <div>
          <h2>Bồi thường Khách hàng & Đính chính Sai lệch Thông tin</h2>
          <p>
            Xử lý đền bù / bồi thường cho khách hàng khi <strong>nhập sai thông tin khách hàng</strong> hoặc
            <strong> thông tin khách sạn không đúng thực tế</strong>.
            <em>(Lưu ý: Nghiệp vụ hoàn tiền hủy phòng tự động do Hotel Partner quản lý theo chính sách lưu trú).</em>
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            className="om-action"
            variant="primary"
            onClick={() => {
              setShowCreateModal(true);
              searchBookings();
            }}
          >
            <FiPlus /> Lập hồ sơ bồi thường mới
          </Button>
          <Button className="om-action" variant="outline-primary" onClick={load} disabled={loading}>
            <FiRefreshCw /> Làm mới
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert variant="success" dismissible onClose={() => setNotice('')}>{notice}</Alert>}

      {/* DANH SÁCH HỒ SƠ BỒI THƯỜNG */}
      <Card className="om-card">
        <div className="om-section-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h3 className="om-card-title mb-0">Danh sách hồ sơ bồi thường ({items.length})</h3>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ maxWidth: 240 }}
            size="sm"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Form.Select>
        </div>

        {loading ? (
          <div className="om-empty"><Spinner /></div>
        ) : (
          <Table responsive hover className="om-table align-middle mb-0">
            <thead>
              <tr>
                <th>Mã đơn / Khách sạn</th>
                <th>Khách hàng & Thông tin liên hệ</th>
                <th>Số tiền bồi thường</th>
                <th>Lý do bồi thường / Sai lệch</th>
                <th>Trạng thái</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map((item) => {
                const b = item.bookingId;
                const reqAmt = Number(item.requestedAmount || 0);
                const appAmt = Number(item.approvedAmount || 0);
                return (
                  <tr key={item._id}>
                    <td>
                      <span className="om-primary-text">#{b?.bookingCode || 'Đơn đặt phòng'}</span>
                      <span className="om-secondary-text">
                        {item.hotelId?.name || 'Khách sạn'}
                      </span>
                      <small className="text-muted d-block">
                        Giá trị đơn: {Number(b?.totalAmount || 0).toLocaleString('vi-VN')} VND
                      </small>
                    </td>

                    <td>
                      <div className="fw-semibold text-primary">{b?.bookerFullName || item.customerId?.fullName}</div>
                      <div className="small text-muted">{b?.bookerPhone || item.customerId?.phoneNumber}</div>
                      {b?.guestFullName && (
                        <small className="text-secondary d-block">Khách ở: {b.guestFullName}</small>
                      )}
                    </td>

                    <td>
                      {appAmt > 0 ? (
                        <div>
                          <strong className="text-success fs-6">{appAmt.toLocaleString('vi-VN')} VND</strong>
                          {reqAmt !== appAmt && (
                            <small className="text-muted d-block text-decoration-line-through">
                              Yêu cầu: {reqAmt.toLocaleString('vi-VN')} VND
                            </small>
                          )}
                        </div>
                      ) : (
                        <strong className="text-dark">{reqAmt.toLocaleString('vi-VN')} VND</strong>
                      )}
                    </td>

                    <td style={{ maxWidth: 280 }}>
                      <div className="small text-dark fw-semibold" style={{ whiteSpace: 'pre-line' }}>
                        {item.reason}
                      </div>
                      {item.reviewNote && (
                        <small className="text-muted d-block mt-1">
                          Ghi chú: {item.reviewNote}
                        </small>
                      )}
                    </td>

                    <td>
                      <span className={`om-status ${STATUS_TONE[item.status] || 'neutral'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                      {item.reviewedBy && (
                        <small className="d-block text-muted">
                          Bởi: {item.reviewedBy?.fullName}
                        </small>
                      )}
                    </td>

                    <td className="text-end">
                      <div className="om-actions justify-content-end">
                        {item.status === 'REQUESTED' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="om-action"
                              onClick={() => openReviewModal(item, 'UNDER_REVIEW')}
                            >
                              <FiEdit3 /> Thẩm định & Đính chính
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              className="om-action"
                              onClick={() => openReviewModal(item, 'APPROVE')}
                            >
                              <FiCheck /> Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="om-action"
                              onClick={() => openReviewModal(item, 'REJECT')}
                            >
                              <FiX /> Từ chối
                            </Button>
                          </>
                        )}

                        {item.status === 'UNDER_REVIEW' && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              className="om-action"
                              onClick={() => openReviewModal(item, 'APPROVE')}
                            >
                              <FiCheck /> Duyệt bồi thường
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="om-action"
                              onClick={() => openReviewModal(item, 'REJECT')}
                            >
                              <FiX /> Bác bỏ
                            </Button>
                          </>
                        )}

                        {item.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="om-action"
                            onClick={() => openReviewModal(item, 'MARK_PROCESSED')}
                          >
                            <FiCreditCard /> Giải ngân tiền bồi thường
                          </Button>
                        )}

                        {item.status === 'PROCESSED' && (
                          <Badge bg="success" className="p-2">
                            Đã giải ngân ({item.paymentId?.txnRef || 'Thành công'})
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="om-empty">Chưa có hồ sơ bồi thường nào.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      {/* MÀN HÌNH PHỤ 1: LẬP HỒ SƠ BỒI THƯỜNG / ĐÍNH CHÍNH THÔNG TIN KHÁCH HÀNG */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold">
            Lập Hồ sơ Bồi thường Khách hàng & Đính chính Sai lệch Thông tin
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="small mb-3">
            Sử dụng tính năng này khi khách hàng gặp sự cố thông tin đặt phòng bị sai, người lưu trú thực tế không khớp,
            hoặc khách sạn cung cấp phòng không đúng mô tả. Operations Manager có thể cập nhật lại thông tin chuẩn xác của khách
            và thiết lập khoản tiền bồi thường trực tiếp.
          </Alert>

          {/* BƯỚC 1: TÌM & CHỌN ĐƠN ĐẶT PHÒNG */}
          <div className="p-3 border rounded-3 bg-light mb-3">
            <h6 className="fw-bold mb-2">Bước 1: Tra cứu đơn đặt phòng cần xử lý</h6>
            <Form onSubmit={searchBookings} className="d-flex gap-2 mb-2">
              <Form.Control
                placeholder="Nhập mã đơn (VNS...), tên khách, số điện thoại hoặc tên khách sạn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" variant="primary" disabled={searching} className="text-nowrap">
                <FiSearch /> Tìm kiếm
              </Button>
            </Form>

            <div style={{ maxHeight: 180, overflowY: 'auto' }} className="border rounded bg-white">
              <Table size="sm" hover className="align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách đặt</th>
                    <th>Khách sạn</th>
                    <th>Giá trị</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Chọn</th>
                  </tr>
                </thead>
                <tbody>
                  {foundBookings.map((b) => {
                    const isPicked = selectedBooking?._id === b._id;
                    return (
                      <tr key={b._id} className={isPicked ? 'table-primary' : ''}>
                        <td className="fw-semibold">#{b.bookingCode}</td>
                        <td>{b.bookerFullName} ({b.bookerPhone})</td>
                        <td>{b.hotelName || b.hotelId?.name}</td>
                        <td>{Number(b.totalAmount || 0).toLocaleString('vi-VN')} VND</td>
                        <td><Badge bg="secondary">{b.bookingStatus}</Badge></td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant={isPicked ? 'success' : 'outline-primary'}
                            onClick={() => selectBookingToCompensate(b)}
                          >
                            {isPicked ? 'Đang chọn' : 'Chọn đơn này'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {!foundBookings.length && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-3">
                        {searching ? 'Đang tra cứu...' : 'Chưa có kết quả tra cứu. Hãy nhập từ khóa tìm kiếm.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>

          {/* BƯỚC 2: ĐÍNH CHÍNH THÔNG TIN KHÁCH HÀNG & MỨC BỒI THƯỜNG */}
          {selectedBooking && (
            <Form onSubmit={submitCreate}>
              <div className="p-3 border rounded-3 bg-white mb-3">
                <h6 className="fw-bold text-primary mb-3">
                  Bước 2: Chi tiết sai lệch & Đính chính thông tin cho đơn #{selectedBooking.bookingCode}
                </h6>

                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Phân loại lý do bồi thường *</Form.Label>
                    <Form.Select
                      value={createForm.issueType}
                      onChange={(e) => setCreateForm({ ...createForm, issueType: e.target.value })}
                    >
                      {ISSUE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold text-danger">
                      Số tiền bồi thường khách hàng (VND) *
                    </Form.Label>
                    <Form.Control
                      required
                      type="number"
                      min="0"
                      max={selectedBooking.totalAmount}
                      value={createForm.requestedAmount}
                      onChange={(e) => setCreateForm({ ...createForm, requestedAmount: e.target.value })}
                    />
                    <small className="text-muted">
                      Tối đa 100% giá trị đơn: {Number(selectedBooking.totalAmount || 0).toLocaleString('vi-VN')} VND
                    </small>
                  </Col>
                </Row>

                {/* KHUNG ĐÍNH CHÍNH THÔNG TIN KHÁCH HÀNG TRỰC TIẾP */}
                <div className="p-3 border rounded-3 bg-light mb-3">
                  <h6 className="fw-semibold text-dark mb-2">
                    <FiUserCheck className="me-1 text-primary" />
                    Đính chính lại thông tin khách hàng trên đơn đặt phòng (Nếu bị sai lệch)
                  </h6>
                  <Row className="g-2">
                    <Col md={4}>
                      <Form.Label className="small">Họ tên người đặt</Form.Label>
                      <Form.Control
                        size="sm"
                        value={createForm.customerCorrection.bookerFullName}
                        onChange={(e) => setCreateForm({
                          ...createForm,
                          customerCorrection: { ...createForm.customerCorrection, bookerFullName: e.target.value },
                        })}
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label className="small">Số điện thoại liên hệ</Form.Label>
                      <Form.Control
                        size="sm"
                        value={createForm.customerCorrection.bookerPhone}
                        onChange={(e) => setCreateForm({
                          ...createForm,
                          customerCorrection: { ...createForm.customerCorrection, bookerPhone: e.target.value },
                        })}
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label className="small">Email người đặt</Form.Label>
                      <Form.Control
                        size="sm"
                        type="email"
                        value={createForm.customerCorrection.bookerEmail}
                        onChange={(e) => setCreateForm({
                          ...createForm,
                          customerCorrection: { ...createForm.customerCorrection, bookerEmail: e.target.value },
                        })}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="small">Tên khách lưu trú thực tế</Form.Label>
                      <Form.Control
                        size="sm"
                        value={createForm.customerCorrection.guestFullName}
                        onChange={(e) => setCreateForm({
                          ...createForm,
                          customerCorrection: { ...createForm.customerCorrection, guestFullName: e.target.value },
                        })}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="small">SĐT khách lưu trú</Form.Label>
                      <Form.Control
                        size="sm"
                        value={createForm.customerCorrection.guestPhone}
                        onChange={(e) => setCreateForm({
                          ...createForm,
                          customerCorrection: { ...createForm.customerCorrection, guestPhone: e.target.value },
                        })}
                      />
                    </Col>
                  </Row>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">Giải trình chi tiết lý do bồi thường *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    required
                    value={createForm.reason}
                    onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  />
                </Form.Group>

                <div className="d-flex flex-wrap gap-4 p-2 bg-light rounded border">
                  <Form.Check
                    type="checkbox"
                    id="auto-approve"
                    label="Phê duyệt ngay (Trạng thái APPROVED)"
                    checked={createForm.autoApprove}
                    onChange={(e) => setCreateForm({ ...createForm, autoApprove: e.target.checked })}
                  />
                  <Form.Check
                    type="checkbox"
                    id="auto-process"
                    label="Giải ngân bồi thường ngay (Trạng thái PROCESSED và thanh toán)"
                    checked={createForm.autoProcess}
                    onChange={(e) => setCreateForm({ ...createForm, autoProcess: e.target.checked })}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="outline-secondary" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Xác nhận tạo hồ sơ bồi thường'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* MÀN HÌNH PHỤ 2: THẨM ĐỊNH & PHÊ DUYỆT BỒI THƯỜNG */}
      <Modal
        show={reviewModal.show}
        onHide={() => setReviewModal((prev) => ({ ...prev, show: false }))}
        size="lg"
        centered
        backdrop="static"
      >
        <Form onSubmit={submitReview}>
          <Modal.Header closeButton>
            <Modal.Title className="h5 fw-bold">
              Xử lý Hồ sơ Bồi thường #{reviewModal.item?.bookingId?.bookingCode || ''}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="warning" className="small">
              Hành động: <strong>{STATUS_LABELS[reviewModal.decision] || reviewModal.decision}</strong>.
              Hệ thống sẽ đồng thời gửi thông báo chính thức tới cả Khách hàng và Khách sạn.
            </Alert>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Label className="small fw-semibold">Quyết định xử lý</Form.Label>
                <Form.Select
                  value={reviewModal.decision}
                  onChange={(e) => setReviewModal({ ...reviewModal, decision: e.target.value })}
                >
                  <option value="UNDER_REVIEW">Đang thẩm định sai lệch thông tin (UNDER_REVIEW)</option>
                  <option value="APPROVE">Phê duyệt số tiền bồi thường (APPROVED)</option>
                  <option value="MARK_PROCESSED">Giải ngân hoàn tiền bồi thường (PROCESSED)</option>
                  <option value="REJECT">Từ chối bồi thường (REJECTED)</option>
                </Form.Select>
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold">
                  Số tiền duyệt bồi thường (VND)
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  disabled={reviewModal.decision === 'REJECT'}
                  value={reviewModal.approvedAmount}
                  onChange={(e) => setReviewModal({ ...reviewModal, approvedAmount: e.target.value })}
                />
              </Col>
            </Row>

            {/* ĐÍNH CHÍNH THÔNG TIN KHÁCH HÀNG NẾU CÓ */}
            <div className="p-3 border rounded-3 bg-light mb-3">
              <h6 className="fw-semibold text-dark mb-2">Đính chính thông tin khách hàng (Nếu phát hiện sai sót):</h6>
              <Row className="g-2">
                <Col md={4}>
                  <Form.Label className="small">Tên người đặt</Form.Label>
                  <Form.Control
                    size="sm"
                    value={reviewModal.customerCorrection.bookerFullName}
                    onChange={(e) => setReviewModal({
                      ...reviewModal,
                      customerCorrection: { ...reviewModal.customerCorrection, bookerFullName: e.target.value },
                    })}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="small">SĐT liên hệ</Form.Label>
                  <Form.Control
                    size="sm"
                    value={reviewModal.customerCorrection.bookerPhone}
                    onChange={(e) => setReviewModal({
                      ...reviewModal,
                      customerCorrection: { ...reviewModal.customerCorrection, bookerPhone: e.target.value },
                    })}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="small">Email</Form.Label>
                  <Form.Control
                    size="sm"
                    value={reviewModal.customerCorrection.bookerEmail}
                    onChange={(e) => setReviewModal({
                      ...reviewModal,
                      customerCorrection: { ...reviewModal.customerCorrection, bookerEmail: e.target.value },
                    })}
                  />
                </Col>
              </Row>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                Nội dung kết luận / Lý do xử lý (Gửi đến Khách hàng & Đối tác) *
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required
                placeholder="Nhập lý do duyệt, căn cứ sai lệch thông tin hoặc lý do từ chối..."
                value={reviewModal.note}
                onChange={(e) => setReviewModal({ ...reviewModal, note: e.target.value })}
              />
            </Form.Group>

            {reviewModal.decision === 'MARK_PROCESSED' && (
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Mã tham chiếu ngân hàng / giao dịch</Form.Label>
                <Form.Control
                  placeholder="VD: FT260012938491..."
                  value={reviewModal.paymentReference}
                  onChange={(e) => setReviewModal({ ...reviewModal, paymentReference: e.target.value })}
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setReviewModal((prev) => ({ ...prev, show: false }))}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Đang thực thi...' : 'Xác nhận xử lý & Gửi thông báo'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default CompensationManagementPage;

