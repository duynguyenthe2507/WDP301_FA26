import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import {
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiHome,
  FiMessageSquare,
  FiRefreshCw,
  FiSend,
  FiUser,
} from 'react-icons/fi';
import { getDisputes, updateDispute } from '../managerApi';

const CATEGORY_MAP = {
  INCORRECT_INFORMATION: 'Thông tin chỗ nghỉ không đúng mô tả',
  SERVICE_QUALITY: 'Chất lượng dịch vụ không đúng cam kết',
  OVERCHARGE: 'Thu thêm phụ phí không công bố',
  CANCELLATION: 'Sự cố hủy phòng / Không nhận được phòng',
  OTHER: 'Lý do khác',
};

const STATUS_MAP = {
  PENDING: { label: 'Chờ tiếp nhận', badge: 'warning' },
  IN_PROGRESS: { label: 'Đang thẩm định', badge: 'info' },
  WAITING_PARTNER: { label: 'Chờ đối tác giải trình', badge: 'secondary' },
  RESOLVED: { label: 'Đã phán quyết', badge: 'success' },
  REJECTED: { label: 'Bác bỏ khiếu nại', badge: 'danger' },
  WITHDRAWN: { label: 'Khách đã rút đơn', badge: 'dark' },
};

const OUTCOME_OPTIONS = [
  { value: 'UPHELD', label: '1. Chấp nhận khiếu nại của khách hàng (Khách sạn sai sót)' },
  { value: 'PARTIALLY_UPHELD', label: '2. Chấp nhận một phần (Hai bên cùng có thỏa thuận)' },
  { value: 'REJECTED', label: '3. Bác bỏ khiếu nại (Khách sạn thực hiện đúng quy định)' },
  { value: 'NO_ACTION', label: '4. Hòa giải thành công / Không phát sinh bồi thường' },
];

const DisputeResolutionPage = () => {
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // MÀN HÌNH PHỤ (MODAL DIALOG): 3 NÚT CHỨC NĂNG CÓ CHIỀU SÂU
  const [modalAction, setModalAction] = useState({
    show: false,
    actionType: 'ACCEPT', // 'ACCEPT' | 'REQUEST_PARTNER' | 'RESOLVE'
    dispute: null,
    // Dữ liệu nhập trong màn hình phụ:
    internalMessage: '',
    customerNotice: '',
    partnerNotice: '',
    outcome: 'UPHELD',
    resolutionConclusion: '',
    compensationAmount: 0,
    compensationReason: '',
    processCompensationNow: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDisputes(statusFilter ? { status: statusFilter } : undefined);
      const list = res.data.disputes || [];
      setDisputes(list);
      // Giữ lại item đang chọn nếu có
      setSelectedDispute((prev) => {
        if (!prev) return list[0] || null;
        return list.find((d) => d._id === prev._id) || list[0] || null;
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách tranh chấp.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Mở màn hình phụ 1: TIẾP NHẬN & BÁO CHO 2 BÊN
  const openAcceptModal = (dispute) => {
    const bCode = dispute.bookingCode;
    const hotelName = dispute.hotelId?.name || 'Khách sạn';
    setModalAction({
      show: true,
      actionType: 'ACCEPT',
      dispute,
      internalMessage: `Operations Manager đã tiếp nhận thụ lý hồ sơ tranh chấp #${bCode}.`,
      customerNotice: `VinaStay đã tiếp nhận hồ sơ tranh chấp của bạn về đơn đặt phòng #${bCode} tại ${hotelName}. Chuyên viên vận hành đang đối chiếu dữ liệu đặt phòng và bằng chứng bạn cung cấp.`,
      partnerNotice: `Khách sạn ${hotelName} lưu ý: Đơn đặt phòng #${bCode} có khiếu nại về "${CATEGORY_MAP[dispute.category] || dispute.category}". Bộ phận vận hành VinaStay đang mở hồ sơ thẩm định.`,
      outcome: 'UPHELD',
      resolutionConclusion: '',
      compensationAmount: 0,
      compensationReason: '',
      processCompensationNow: false,
    });
  };

  // Mở màn hình phụ 2: YÊU CẦU ĐỐI TÁC GIẢI TRÌNH & ĐỐI CHẤT
  const openRequestPartnerModal = (dispute) => {
    const bCode = dispute.bookingCode;
    const hotelName = dispute.hotelId?.name || 'Khách sạn';
    setModalAction({
      show: true,
      actionType: 'REQUEST_PARTNER',
      dispute,
      internalMessage: `Yêu cầu khách sạn ${hotelName} giải trình phản ánh: "${dispute.description}".`,
      customerNotice: `VinaStay đã gửi yêu cầu đối chất chính thức tới đối tác quản lý ${hotelName}. Thời hạn phản hồi tối đa là 24 giờ.`,
      partnerNotice: `Yêu cầu giải trình khẩn: Khách hàng đơn #${bCode} phản ánh sai lệch dịch vụ/phòng ("${dispute.description}"). Vui lòng cung cấp giải trình và ảnh/biên bản xác minh qua hệ thống đối tác trong 24h.`,
      outcome: 'UPHELD',
      resolutionConclusion: '',
      compensationAmount: 0,
      compensationReason: '',
      processCompensationNow: false,
    });
  };

  // Mở màn hình phụ 3: ĐƯA RA PHÁN QUYẾT & BỒI THƯỜNG / THÔNG BÁO CHO HAI BÊN
  const openResolveModal = (dispute) => {
    const bCode = dispute.bookingCode;
    const hotelName = dispute.hotelId?.name || 'Khách sạn';
    const totalAmount = Number(dispute.bookingId?.totalAmount || 0);
    setModalAction({
      show: true,
      actionType: 'RESOLVE',
      dispute,
      internalMessage: '',
      outcome: 'UPHELD',
      resolutionConclusion: `Sau khi đối chiếu chứng cứ khách hàng và giải trình của khách sạn ${hotelName}, bộ phận vận hành VinaStay phán quyết chấp thuận khiếu nại. Khách sạn có trách nhiệm bồi thường theo đúng cam kết dịch vụ.`,
      customerNotice: `Kính gửi Quý khách: VinaStay đã hoàn tất thẩm định tranh chấp #${bCode}. Khiếu nại của bạn được chấp thuận. Khoản bồi thường đã được duyệt và chuyển tới bạn.`,
      partnerNotice: `Thông báo phán quyết #${bCode}: Bộ phận vận hành xác định khiếu nại của khách có căn cứ. Số tiền bồi thường được khấu trừ trực tiếp vào kỳ đối soát chi trả doanh thu của khách sạn.`,
      compensationAmount: totalAmount > 0 ? totalAmount : 500000,
      compensationReason: `Bồi thường cho khách hàng do sai sót thông tin/dịch vụ tại ${hotelName} (Đơn #${bCode})`,
      processCompensationNow: true,
    });
  };

  // GỬI PHÁN QUYẾT HOẶC CẬP NHẬT TỪ MÀN HÌNH PHỤ
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const { actionType, dispute } = modalAction;
    if (!dispute) return;

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      let payload = {};
      if (actionType === 'ACCEPT') {
        payload = {
          status: 'IN_PROGRESS',
          assignedToMe: true,
          message: modalAction.internalMessage,
          customerMessage: modalAction.customerNotice,
          partnerMessage: modalAction.partnerNotice,
        };
      } else if (actionType === 'REQUEST_PARTNER') {
        payload = {
          status: 'WAITING_PARTNER',
          message: modalAction.internalMessage,
          customerMessage: modalAction.customerNotice,
          partnerMessage: modalAction.partnerNotice,
        };
      } else if (actionType === 'RESOLVE') {
        const isReject = modalAction.outcome === 'REJECTED';
        payload = {
          status: isReject ? 'REJECTED' : 'RESOLVED',
          resolution: modalAction.outcome,
          resolutionMessage: modalAction.resolutionConclusion,
          customerMessage: modalAction.customerNotice,
          partnerMessage: modalAction.partnerNotice,
          compensationAmount: isReject ? 0 : Number(modalAction.compensationAmount || 0),
          compensationReason: modalAction.compensationReason,
          processCompensationNow: modalAction.processCompensationNow,
        };
      }

      const res = await updateDispute(dispute._id, payload);
      setNotice(res.data?.message || 'Đã cập nhật tranh chấp và gửi thông báo thành công.');
      setModalAction((prev) => ({ ...prev, show: false }));
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xử lý tranh chấp.');
    } finally {
      setSubmitting(false);
    }
  };

  const selected = selectedDispute;

  return (
    <div>
      <div className="om-page-heading">
        <div>
          <h2>Trung tâm Đối chất & Phán quyết Tranh chấp</h2>
          <p>
            Mô hình đối chất hai bên (<strong>Khách hàng ↔ Khách sạn</strong>). Operations Manager tiếp nhận thông tin,
            thẩm định bằng chứng và ban hành phán quyết kèm thông báo chính thức cho cả hai bên.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_MAP).map(([key, item]) => (
              <option key={key} value={key}>{item.label}</option>
            ))}
          </Form.Select>
          <Button className="om-action" variant="outline-primary" onClick={load} disabled={loading}>
            <FiRefreshCw /> Làm mới
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert variant="success" dismissible onClose={() => setNotice('')}>{notice}</Alert>}

      <Row className="g-3">
        {/* CỘT TRÁI: DANH SÁCH CÁC HỒ SƠ TRANH CHẤP */}
        <Col lg={4}>
          <Card className="om-card h-100">
            <div className="om-section-header">
              <h3 className="om-card-title">Hồ sơ tranh chấp ({disputes.length})</h3>
            </div>
            <div style={{ maxHeight: '720px', overflowY: 'auto' }} className="p-2">
              {loading && !disputes.length ? (
                <div className="text-center py-4"><Spinner /></div>
              ) : disputes.length === 0 ? (
                <div className="text-center text-muted py-4">Không có hồ sơ nào.</div>
              ) : (
                disputes.map((item) => {
                  const isCur = selected?._id === item._id;
                  const st = STATUS_MAP[item.status] || { label: item.status, badge: 'secondary' };
                  return (
                    <div
                      key={item._id}
                      role="button"
                      onClick={() => setSelectedDispute(item)}
                      className={`p-3 rounded-3 mb-2 border transition ${isCur ? 'bg-primary text-white shadow-sm' : 'bg-white hover-shadow'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <strong className="fs-6">#{item.bookingCode}</strong>
                        <Badge bg={isCur ? 'light' : st.badge} text={isCur ? 'dark' : undefined}>
                          {st.label}
                        </Badge>
                      </div>
                      <div className={`small ${isCur ? 'text-white-50' : 'text-muted'} mb-1`}>
                        <FiHome className="me-1" />
                        {item.hotelId?.name || 'Khách sạn'}
                      </div>
                      <div className="small fw-semibold mb-1" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {CATEGORY_MAP[item.category] || item.category}
                      </div>
                      <div className={`small d-flex justify-content-between ${isCur ? 'text-white-50' : 'text-muted'}`}>
                        <span>Khách: {item.customerId?.fullName || 'Khách hàng'}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </Col>

        {/* CỘT PHẢI: CHI TIẾT ĐỐI CHẤT 2 BÊN (CUSTOMER vs HOTEL) & 3 NÚT TÁC ĐỘNG SÂU */}
        <Col lg={8}>
          {!selected ? (
            <Card className="om-card p-5 text-center text-muted">
              Chọn một hồ sơ tranh chấp ở danh sách bên trái để đối chất thông tin.
            </Card>
          ) : (
            <Card className="om-card">
              {/* HEADER CHI TIẾT */}
              <div className="om-section-header d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h3 className="om-card-title mb-0">Hồ sơ tranh chấp #{selected.bookingCode}</h3>
                    <Badge bg={STATUS_MAP[selected.status]?.badge || 'secondary'}>
                      {STATUS_MAP[selected.status]?.label}
                    </Badge>
                  </div>
                  <small className="text-muted">
                    Khởi tạo lúc: {new Date(selected.createdAt).toLocaleString('vi-VN')} · Chuyên viên thụ lý: <strong>{selected.assignedTo?.fullName || 'Chưa nhận'}</strong>
                  </small>
                </div>

                {/* 3 NÚT CHỨC NĂNG CÓ CHIỀU SÂU MỞ MÀN HÌNH PHỤ */}
                <div className="d-flex flex-wrap gap-2">
                  {selected.status === 'PENDING' && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="d-flex align-items-center gap-1 shadow-sm"
                      onClick={() => openAcceptModal(selected)}
                    >
                      <FiCheckCircle /> 1. Tiếp nhận & Thông báo hai bên
                    </Button>
                  )}

                  {!['RESOLVED', 'REJECTED', 'WITHDRAWN'].includes(selected.status) && (
                    <>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="d-flex align-items-center gap-1"
                        onClick={() => openRequestPartnerModal(selected)}
                      >
                        <FiMessageSquare /> 2. Yêu cầu Đối tác giải trình (24h)
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        className="d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => openResolveModal(selected)}
                      >
                        <FiDollarSign /> 3. Ra phán quyết & Bồi thường
                      </Button>
                    </>
                  )}

                  {['RESOLVED', 'REJECTED', 'WITHDRAWN'].includes(selected.status) && (
                    <Badge bg="secondary" className="p-2">
                      Hồ sơ đã kết thúc ({STATUS_MAP[selected.status]?.label})
                    </Badge>
                  )}
                </div>
              </div>

              {/* MÔ HÌNH SO SÁNH 2 BÊN: KHÁCH HÀNG (TRÁI) vs KHÁCH SẠN (PHẢI) */}
              <Card.Body className="p-3">
                <div className="p-2 bg-light rounded-3 mb-3 small border">
                  <strong>Loại tranh chấp:</strong> <span className="text-primary fw-semibold">{CATEGORY_MAP[selected.category] || selected.category}</span>
                  {' · '}<strong>Giá trị đặt phòng:</strong> {Number(selected.bookingId?.totalAmount || 0).toLocaleString('vi-VN')} VND
                  {' · '}<strong>Thời gian lưu trú:</strong> {selected.bookingId?.checkInDate ? new Date(selected.bookingId.checkInDate).toLocaleDateString('vi-VN') : '—'} đến {selected.bookingId?.checkOutDate ? new Date(selected.bookingId.checkOutDate).toLocaleDateString('vi-VN') : '—'}
                </div>

                <Row className="g-3 mb-4">
                  {/* BÊN 1: PHÍA KHÁCH HÀNG (CUSTOMER) */}
                  <Col md={6}>
                    <div className="p-3 border rounded-3 h-100 bg-white border-primary border-opacity-25 shadow-sm">
                      <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom text-primary">
                        <FiUser className="fs-5" />
                        <h4 className="h6 fw-bold mb-0">1. Thông tin từ Khách hàng</h4>
                      </div>
                      <div className="small mb-2">
                        <strong>Họ tên:</strong> {selected.customerId?.fullName || selected.bookingId?.bookerFullName || 'Khách hàng'}<br />
                        <strong>Liên hệ:</strong> {selected.customerId?.email || selected.bookingId?.bookerEmail || ''} · {selected.bookingId?.bookerPhone || ''}<br />
                        <strong>Khách lưu trú:</strong> {selected.bookingId?.guestFullName ? `${selected.bookingId.guestFullName} (${selected.bookingId.guestPhone})` : 'Chính chủ đặt'}
                      </div>
                      <div className="small p-2 bg-light rounded border mb-2">
                        <strong className="text-secondary d-block mb-1">Nội dung khiếu nại của khách:</strong>
                        <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{selected.description}</p>
                      </div>
                      {selected.attachments?.length > 0 && (
                        <div>
                          <span className="small fw-semibold text-muted d-block mb-1">
                            Bằng chứng khách gửi ({selected.attachments.length}):
                          </span>
                          <div className="d-flex flex-wrap gap-2">
                            {selected.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="small text-decoration-none border rounded px-2 py-1 bg-white"
                              >
                                📎 {file.fileName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Col>

                  {/* BÊN 2: PHÍA KHÁCH SẠN / ĐỐI TÁC (HOTEL PARTNER) */}
                  <Col md={6}>
                    <div className="p-3 border rounded-3 h-100 bg-white border-warning border-opacity-50 shadow-sm">
                      <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom text-warning-emphasis">
                        <FiHome className="fs-5" />
                        <h4 className="h6 fw-bold mb-0">2. Thông tin từ Khách sạn</h4>
                      </div>
                      <div className="small mb-2">
                        <strong>Khách sạn:</strong> {selected.hotelId?.name || 'Khách sạn'}<br />
                        <strong>Địa chỉ:</strong> {selected.hotelId?.address || ''}, {selected.hotelId?.provinceCity || ''}<br />
                        <strong>Chủ cơ sở:</strong> {selected.partnerId?.fullName || 'Đối tác'} ({selected.partnerId?.email || ''} - {selected.partnerId?.phoneNumber || ''})
                      </div>

                      <div className="small p-2 bg-light rounded border mb-2">
                        <strong className="text-secondary d-block mb-1">Phản hồi / Giải trình của khách sạn:</strong>
                        {selected.responses?.filter((r) => r.respondedBy?.role === 'HOTEL_PARTNER').length === 0 ? (
                          <span className="text-muted fst-italic">Khách sạn chưa gửi giải trình cho vụ việc này.</span>
                        ) : (
                          selected.responses
                            .filter((r) => r.respondedBy?.role === 'HOTEL_PARTNER')
                            .map((r, i) => (
                              <div key={i} className="mb-2 pb-2 border-bottom border-light">
                                <div className="text-muted small">
                                  {new Date(r.respondedAt).toLocaleString('vi-VN')} - <strong>Khách sạn:</strong>
                                </div>
                                <div style={{ whiteSpace: 'pre-line' }}>{r.message}</div>
                              </div>
                            ))
                        )}
                      </div>

                      <div className="small text-muted">
                        Chính sách hủy lúc đặt: <strong>{selected.hotelId?.cancellationPolicy || 'Tiêu chuẩn'}</strong>
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* KẾT QUẢ PHÁN QUYẾT & BỒI THƯỜNG (NẾU ĐÃ CÓ) */}
                {selected.resolution?.resolvedAt && (
                  <Alert variant="success" className="p-3 rounded-3 mb-4">
                    <h5 className="h6 fw-bold text-success mb-2">
                      <FiCheckCircle className="me-1" />
                      Phán quyết chính thức từ Operations Manager ({new Date(selected.resolution.resolvedAt).toLocaleString('vi-VN')}):
                    </h5>
                    <div className="mb-2">
                      <strong>Kết luận:</strong> {OUTCOME_OPTIONS.find((o) => o.value === selected.resolution.outcome)?.label || selected.resolution.outcome}
                    </div>
                    <div className="p-2 bg-white rounded border mb-2 small" style={{ whiteSpace: 'pre-line' }}>
                      {selected.resolution.message}
                    </div>
                    {selected.compensation && (
                      <div className="small mt-2 pt-2 border-top">
                        <FiDollarSign className="text-success" />
                        <strong>Khoản bồi thường: </strong>
                        <span className="text-danger fw-bold fs-6">
                          {Number(selected.compensation.approvedAmount || selected.compensation.requestedAmount).toLocaleString('vi-VN')} VND
                        </span>
                        {' '}(Trạng thái: <strong>{selected.compensation.status}</strong>)
                      </div>
                    )}
                  </Alert>
                )}

                {/* DÒNG THỜI GIAN TRAO ĐỔI & THÔNG BÁO CHO HAI BÊN */}
                <div className="border rounded-3 p-3 bg-light">
                  <h5 className="h6 fw-bold mb-3 d-flex align-items-center gap-1">
                    <FiClock /> Lịch sử đối chất & Thông báo đã gửi hai bên ({selected.responses?.length || 0})
                  </h5>
                  {(!selected.responses || selected.responses.length === 0) ? (
                    <div className="small text-muted">Chưa có thông báo hoặc trao đổi nào.</div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {selected.responses.map((item, idx) => {
                        const isOm = !item.respondedBy?.role || item.respondedBy?.role === 'OPERATIONS_MANAGER' || item.respondedBy?.role === 'ADMIN';
                        const isPartner = item.respondedBy?.role === 'HOTEL_PARTNER';
                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded border small ${isOm ? 'bg-white border-primary border-opacity-50' : isPartner ? 'bg-white border-warning' : 'bg-white'}`}
                          >
                            <div className="d-flex justify-content-between text-muted mb-1">
                              <strong>
                                {isOm ? '⚖️ Bộ phận Vận hành (Operations Manager)' : isPartner ? '🏨 Khách sạn' : '👤 Khách hàng'}
                              </strong>
                              <span>{new Date(item.respondedAt).toLocaleString('vi-VN')}</span>
                            </div>
                            <div style={{ whiteSpace: 'pre-line' }}>{item.message}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* MÀN HÌNH PHỤ (MODAL DIALOG) CHO 3 NÚT CHỨC NĂNG */}
      <Modal
        show={modalAction.show}
        onHide={() => setModalAction((prev) => ({ ...prev, show: false }))}
        size="lg"
        centered
        backdrop="static"
      >
        <Form onSubmit={handleModalSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="h5 fw-bold">
              {modalAction.actionType === 'ACCEPT' && '1. Màn hình Tiếp nhận Thẩm định & Phát thông báo hai bên'}
              {modalAction.actionType === 'REQUEST_PARTNER' && '2. Màn hình Yêu cầu Khách sạn giải trình & Đối chất (24h)'}
              {modalAction.actionType === 'RESOLVE' && '3. Màn hình Ban hành Phán quyết & Thiết lập Bồi thường khách hàng'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {modalAction.actionType === 'ACCEPT' && (
              <>
                <Alert variant="info" className="small">
                  Khi nhấn <strong>Tiếp nhận</strong>, hệ thống sẽ phân công hồ sơ này cho bạn và tự động gửi 2 thông báo
                  chính thức: một thông báo trấn an khách hàng và một thông báo cảnh báo khách sạn.
                </Alert>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">Ghi chú nghiệp vụ / Nhật ký nội bộ</Form.Label>
                  <Form.Control
                    rows={2}
                    as="textarea"
                    value={modalAction.internalMessage}
                    onChange={(e) => setModalAction({ ...modalAction, internalMessage: e.target.value })}
                  />
                </Form.Group>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-primary">
                        <FiSend className="me-1" />
                        Nội dung gửi Khách hàng:
                      </Form.Label>
                      <Form.Control
                        rows={4}
                        as="textarea"
                        required
                        value={modalAction.customerNotice}
                        onChange={(e) => setModalAction({ ...modalAction, customerNotice: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-warning-emphasis">
                        <FiSend className="me-1" />
                        Nội dung gửi Khách sạn:
                      </Form.Label>
                      <Form.Control
                        rows={4}
                        as="textarea"
                        required
                        value={modalAction.partnerNotice}
                        onChange={(e) => setModalAction({ ...modalAction, partnerNotice: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}

            {modalAction.actionType === 'REQUEST_PARTNER' && (
              <>
                <Alert variant="warning" className="small">
                  Yêu cầu giải trình sẽ chuyển trạng thái khiếu nại thành <strong>WAITING_PARTNER</strong>,
                  hiển thị cảnh báo trực tiếp trên bảng điều khiển của khách sạn và tính giờ phản hồi SLA 24h.
                </Alert>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-warning-emphasis">
                    <FiSend className="me-1" />
                    Chỉ thị yêu cầu giải trình gửi Khách sạn *
                  </Form.Label>
                  <Form.Control
                    rows={4}
                    as="textarea"
                    required
                    value={modalAction.partnerNotice}
                    onChange={(e) => setModalAction({ ...modalAction, partnerNotice: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-primary">
                    <FiSend className="me-1" />
                    Thông báo cập nhật tiến độ cho Khách hàng:
                  </Form.Label>
                  <Form.Control
                    rows={3}
                    as="textarea"
                    required
                    value={modalAction.customerNotice}
                    onChange={(e) => setModalAction({ ...modalAction, customerNotice: e.target.value })}
                  />
                </Form.Group>
              </>
            )}

            {modalAction.actionType === 'RESOLVE' && (
              <>
                <Alert variant="primary" className="small">
                  Ban hành <strong>Phán quyết có hiệu lực bắt buộc</strong>. Nếu phán quyết chấp nhận khiếu nại,
                  hệ thống sẽ tự động lập hồ sơ bồi thường cho khách hàng và khấu trừ vào kỳ đối soát doanh thu của khách sạn.
                </Alert>

                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Kết luận phán quyết *</Form.Label>
                    <Form.Select
                      value={modalAction.outcome}
                      onChange={(e) => setModalAction({ ...modalAction, outcome: e.target.value })}
                    >
                      {OUTCOME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Form.Select>
                  </Col>

                  {modalAction.outcome !== 'REJECTED' && (
                    <Col md={6}>
                      <Form.Label className="small fw-semibold text-danger">
                        Số tiền bồi thường cho khách (VND) *
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="10000"
                        required
                        value={modalAction.compensationAmount}
                        onChange={(e) => setModalAction({ ...modalAction, compensationAmount: e.target.value })}
                      />
                      <small className="text-muted">
                        Tối đa bằng giá trị đơn: {Number(modalAction.dispute?.bookingId?.totalAmount || 0).toLocaleString('vi-VN')} VND
                      </small>
                    </Col>
                  )}
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">Nội dung phán quyết & Lập luận căn cứ *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    required
                    placeholder="Nêu rõ căn cứ từ chứng cứ khách gửi và giải trình của khách sạn..."
                    value={modalAction.resolutionConclusion}
                    onChange={(e) => setModalAction({ ...modalAction, resolutionConclusion: e.target.value })}
                  />
                </Form.Group>

                {modalAction.outcome !== 'REJECTED' && (
                  <div className="p-3 border rounded-3 bg-light mb-3">
                    <Form.Check
                      type="switch"
                      id="process-comp-now"
                      label="Giải ngân bồi thường ngay lập tức (Chuyển trạng thái PROCESSED và thanh toán)"
                      checked={modalAction.processCompensationNow}
                      onChange={(e) => setModalAction({ ...modalAction, processCompensationNow: e.target.checked })}
                    />
                    <Form.Group className="mt-2">
                      <Form.Label className="small fw-semibold">Lý do bồi thường ghi trên chứng từ:</Form.Label>
                      <Form.Control
                        size="sm"
                        value={modalAction.compensationReason}
                        onChange={(e) => setModalAction({ ...modalAction, compensationReason: e.target.value })}
                      />
                    </Form.Group>
                  </div>
                )}

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-primary">Thông báo kết quả gửi Khách hàng *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        required
                        value={modalAction.customerNotice}
                        onChange={(e) => setModalAction({ ...modalAction, customerNotice: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-warning-emphasis">Thông báo phán quyết gửi Khách sạn *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        required
                        value={modalAction.partnerNotice}
                        onChange={(e) => setModalAction({ ...modalAction, partnerNotice: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setModalAction((prev) => ({ ...prev, show: false }))}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant={modalAction.actionType === 'RESOLVE' ? 'success' : 'primary'}
              disabled={submitting}
            >
              {submitting ? 'Đang thực thi...' : 'Xác nhận & Gửi thông báo tới 2 bên'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default DisputeResolutionPage;

