import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { FiEdit2, FiHome, FiLayers, FiPlus, FiPower, FiRefreshCw, FiSliders, FiUserCheck } from 'react-icons/fi';
import {
  createCommissionPolicy,
  getCommissionPolicies,
  getManagerHotels,
  getPartners,
  updateCommissionPolicy,
} from '../managerApi';

const SCOPE_META = {
  HOTEL: { label: 'Khách sạn cụ thể', badge: 'primary', priority: 'Ưu tiên 1 (Cao nhất)' },
  PARTNER: { label: 'Theo đối tác', badge: 'info', priority: 'Ưu tiên 2 (Theo chủ KS)' },
  GLOBAL: { label: 'Toàn hệ thống', badge: 'secondary', priority: 'Ưu tiên 3 (Mặc định)' },
};

const defaultStartOfYear = () => `${new Date().getFullYear()}-01-01`;

const initialForm = {
  name: '',
  scope: 'HOTEL',
  hotelId: '',
  partnerId: '',
  calculationType: 'PERCENTAGE',
  value: '12',
  effectiveFrom: defaultStartOfYear(),
  effectiveTo: '',
};

const formatRule = (policy) => {
  if (!policy) return 'Chưa có chính sách (0%)';
  return policy.calculationType === 'PERCENTAGE'
    ? `${policy.value}% doanh thu`
    : `${Number(policy.value || 0).toLocaleString('vi-VN')} ₫ / đơn`;
};

const calcSampleCommission = (policy, sampleGross = 10000000) => {
  if (!policy) return 0;
  return policy.calculationType === 'PERCENTAGE'
    ? Math.round((sampleGross * Number(policy.value || 0)) / 100)
    : Math.min(Number(policy.value || 0), sampleGross);
};

const CommissionPolicyPage = () => {
  const [policies, setPolicies] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sampleAmount, setSampleAmount] = useState(5000000);

  // Modal gắn nhanh / chỉnh sửa chính sách cho khách sạn
  const [modalState, setModalState] = useState({
    show: false,
    mode: 'ASSIGN_HOTEL', // 'ASSIGN_HOTEL' | 'EDIT_POLICY'
    policyId: null,
    name: '',
    scope: 'HOTEL',
    hotelId: '',
    partnerId: '',
    calculationType: 'PERCENTAGE',
    value: '12',
    effectiveFrom: defaultStartOfYear(),
    effectiveTo: '',
    status: 'ACTIVE',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [polRes, hotelRes, partnerRes] = await Promise.all([
        getCommissionPolicies(),
        getManagerHotels(),
        getPartners(),
      ]);
      const loadedHotels = hotelRes.data.hotels || [];
      setPolicies(polRes.data.policies || []);
      setHotels(loadedHotels);
      setPartners(partnerRes.data.partners || []);
      setForm((prev) => ({
        ...prev,
        hotelId: prev.hotelId || (loadedHotels[0]?._id ?? ''),
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải dữ liệu chính sách hoa hồng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedHotel = useMemo(
    () => hotels.find((h) => String(h._id) === String(form.hotelId)) || null,
    [hotels, form.hotelId],
  );

  const handleScopeChange = (newScope) => {
    setForm((prev) => {
      const next = { ...prev, scope: newScope };
      if (newScope === 'HOTEL' && !next.hotelId && hotels[0]) {
        next.hotelId = hotels[0]._id;
      }
      if (newScope === 'PARTNER' && !next.partnerId && partners[0]) {
        next.partnerId = partners[0]._id;
      }
      return next;
    });
  };

  const handleHotelSelect = (hotelId) => {
    const h = hotels.find((item) => String(item._id) === String(hotelId));
    setForm((prev) => ({
      ...prev,
      hotelId,
      partnerId: h?.ownerId?._id || h?.ownerId || prev.partnerId,
      name: prev.name || (h ? `Hoa hồng khách sạn ${h.name}` : ''),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        name: form.name.trim(),
        scope: form.scope,
        hotelId: form.scope === 'HOTEL' ? form.hotelId : null,
        partnerId: form.scope === 'PARTNER' ? form.partnerId : (form.scope === 'HOTEL' ? (selectedHotel?.ownerId?._id || selectedHotel?.ownerId || null) : null),
        calculationType: form.calculationType,
        value: Number(form.value),
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
      };
      const res = await createCommissionPolicy(payload);
      setNotice(res.data?.message || 'Đã tạo và gắn chính sách hoa hồng thành công.');
      setForm({
        ...initialForm,
        hotelId: hotels[0]?._id || '',
      });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tạo chính sách hoa hồng.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (policy) => {
    setError('');
    setNotice('');
    try {
      const nextStatus = policy.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updateCommissionPolicy(policy._id, { status: nextStatus });
      setNotice(`Đã ${nextStatus === 'ACTIVE' ? 'kích hoạt' : 'ngừng áp dụng'} chính sách "${policy.name}".`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể cập nhật trạng thái chính sách.');
    }
  };

  const openAssignHotelModal = (hotel) => {
    const existingDirect = hotel.directPolicy;
    setModalState({
      show: true,
      mode: existingDirect ? 'EDIT_POLICY' : 'ASSIGN_HOTEL',
      policyId: existingDirect?._id || null,
      name: existingDirect?.name || `Hoa hồng riêng - ${hotel.name}`,
      scope: 'HOTEL',
      hotelId: hotel._id,
      partnerId: hotel.ownerId?._id || hotel.ownerId || '',
      calculationType: existingDirect?.calculationType || hotel.effectivePolicy?.calculationType || 'PERCENTAGE',
      value: String(existingDirect?.value ?? hotel.effectivePolicy?.value ?? 12),
      effectiveFrom: existingDirect?.effectiveFrom ? new Date(existingDirect.effectiveFrom).toISOString().slice(0, 10) : defaultStartOfYear(),
      effectiveTo: existingDirect?.effectiveTo ? new Date(existingDirect.effectiveTo).toISOString().slice(0, 10) : '',
      status: 'ACTIVE',
    });
  };

  const openEditPolicyModal = (policy) => {
    setModalState({
      show: true,
      mode: 'EDIT_POLICY',
      policyId: policy._id,
      name: policy.name,
      scope: policy.scope || 'GLOBAL',
      hotelId: policy.hotelId?._id || policy.hotelId || (hotels[0]?._id ?? ''),
      partnerId: policy.partnerId?._id || policy.partnerId || (partners[0]?._id ?? ''),
      calculationType: policy.calculationType,
      value: String(policy.value),
      effectiveFrom: policy.effectiveFrom ? new Date(policy.effectiveFrom).toISOString().slice(0, 10) : defaultStartOfYear(),
      effectiveTo: policy.effectiveTo ? new Date(policy.effectiveTo).toISOString().slice(0, 10) : '',
      status: policy.status || 'ACTIVE',
    });
  };

  const submitModal = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        name: modalState.name.trim(),
        scope: modalState.scope,
        hotelId: modalState.scope === 'HOTEL' ? modalState.hotelId : null,
        partnerId: modalState.scope === 'PARTNER' ? modalState.partnerId : null,
        calculationType: modalState.calculationType,
        value: Number(modalState.value),
        effectiveFrom: modalState.effectiveFrom,
        effectiveTo: modalState.effectiveTo || null,
        status: modalState.status,
      };
      if (modalState.mode === 'EDIT_POLICY' && modalState.policyId) {
        await updateCommissionPolicy(modalState.policyId, payload);
        setNotice('Đã cập nhật chính sách hoa hồng và đồng bộ tới khách sạn / đối tác.');
      } else {
        await createCommissionPolicy(payload);
        setNotice('Đã gắn chính sách hoa hồng riêng cho khách sạn thành công.');
      }
      setModalState((prev) => ({ ...prev, show: false }));
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu chính sách hoa hồng.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTargetLabel = (policy) => {
    if (policy.scope === 'HOTEL') {
      return (
        <div>
          <div className="fw-semibold text-primary">
            <FiHome className="me-1" />
            {policy.hotelId?.name || 'Khách sạn đã chọn'}
          </div>
          <small className="text-muted">
            Chủ sở hữu: {policy.partnerId?.fullName || 'Đối tác'} {policy.hotelId?.provinceCity ? `· ${policy.hotelId.provinceCity}` : ''}
          </small>
        </div>
      );
    }
    if (policy.scope === 'PARTNER') {
      return (
        <div>
          <div className="fw-semibold text-info">
            <FiUserCheck className="me-1" />
            Đối tác: {policy.partnerId?.fullName || 'Đối tác'}
          </div>
          <small className="text-muted">{policy.partnerId?.email || 'Áp dụng cho mọi KS của đối tác'}</small>
        </div>
      );
    }
    return (
      <div>
        <div className="fw-semibold text-secondary">
          <FiLayers className="me-1" />
          Mặc định Toàn hệ thống
        </div>
        <small className="text-muted">Áp dụng cho khách sạn chưa gắn chính sách riêng</small>
      </div>
    );
  };

  return (
    <div>
      <div className="om-page-heading">
        <div>
          <h2>Chính sách hoa hồng gắn theo Khách sạn</h2>
          <p>
            Thiết lập mức khấu trừ hoa hồng gắn trực tiếp cho từng Khách sạn, theo Đối tác hoặc Mặc định toàn sàn.
            Thứ tự ưu tiên khi tính doanh thu & đối soát: <strong>Khách sạn riêng (1) → Theo Đối tác (2) → Toàn hệ thống (3)</strong>.
          </p>
        </div>
        <Button className="om-action" variant="outline-primary" onClick={load} disabled={loading}>
          <FiRefreshCw /> Làm mới
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert variant="success" dismissible onClose={() => setNotice('')}>{notice}</Alert>}

      {/* FORM TẠO & GẮN CHÍNH SÁCH VÀO KHÁCH SẠN */}
      <Card className="om-card mb-4">
        <div className="om-section-header">
          <div>
            <h3 className="om-card-title">Gắn chính sách hoa hồng mới</h3>
            <p className="text-muted small mb-0 mt-1">
              Chọn khách sạn cần áp dụng để hệ thống tự động liên kết với chủ khách sạn và thay thế chính sách cũ cùng phạm vi.
            </p>
          </div>
        </div>
        <Card.Body className="pt-1">
          <Form onSubmit={submit}>
            <Row className="g-3">
              <Col md={4} lg={3}>
                <Form.Label className="fw-semibold small">Phạm vi gắn chính sách</Form.Label>
                <Form.Select value={form.scope} onChange={(e) => handleScopeChange(e.target.value)}>
                  <option value="HOTEL">1. Gắn cho Khách sạn cụ thể (Ưu tiên 1)</option>
                  <option value="PARTNER">2. Gắn theo Đối tác sở hữu (Ưu tiên 2)</option>
                  <option value="GLOBAL">3. Mặc định Toàn hệ thống (Ưu tiên 3)</option>
                </Form.Select>
              </Col>

              {form.scope === 'HOTEL' && (
                <Col md={8} lg={5}>
                  <Form.Label className="fw-semibold small">Chọn Khách sạn áp dụng *</Form.Label>
                  <Form.Select
                    required
                    value={form.hotelId}
                    onChange={(e) => handleHotelSelect(e.target.value)}
                  >
                    <option value="">-- Chọn khách sạn trên hệ thống --</option>
                    {hotels.map((hotel) => (
                      <option key={hotel._id} value={hotel._id}>
                        {hotel.name} ({hotel.provinceCity || 'VN'}) — Chủ KS: {hotel.ownerId?.fullName || 'N/A'} [{hotel.status}]
                      </option>
                    ))}
                  </Form.Select>
                  {selectedHotel && (
                    <div className="small text-muted mt-1">
                      Đang áp dụng:{' '}
                      <strong className="text-dark">{formatRule(selectedHotel.effectivePolicy)}</strong>
                      {' '}({selectedHotel.directPolicy ? 'Chính sách riêng của KS' : 'Kế thừa từ hệ thống/đối tác'})
                    </div>
                  )}
                </Col>
              )}

              {form.scope === 'PARTNER' && (
                <Col md={8} lg={5}>
                  <Form.Label className="fw-semibold small">Chọn Đối tác khách sạn *</Form.Label>
                  <Form.Select
                    required
                    value={form.partnerId}
                    onChange={(e) => {
                      const p = partners.find((item) => String(item._id) === String(e.target.value));
                      setForm({
                        ...form,
                        partnerId: e.target.value,
                        name: form.name || (p ? `Hoa hồng đối tác ${p.fullName}` : ''),
                      });
                    }}
                  >
                    <option value="">-- Chọn đối tác --</option>
                    {partners.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.fullName} — {p.email}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              )}

              {form.scope === 'GLOBAL' && (
                <Col md={8} lg={5}>
                  <Form.Label className="fw-semibold small">Đối tượng áp dụng</Form.Label>
                  <Form.Control
                    disabled
                    value="Toàn bộ khách sạn chưa có chính sách riêng trên VinaStay"
                  />
                </Col>
              )}

              <Col md={6} lg={4}>
                <Form.Label className="fw-semibold small">Tên chính sách *</Form.Label>
                <Form.Control
                  required
                  placeholder="VD: Hoa hồng ưu đãi VinaStay Grand Hanoi"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Col>

              <Col md={3} lg={2}>
                <Form.Label className="fw-semibold small">Kiểu khấu trừ</Form.Label>
                <Form.Select
                  value={form.calculationType}
                  onChange={(e) => setForm({ ...form, calculationType: e.target.value })}
                >
                  <option value="PERCENTAGE">Theo phần trăm (%)</option>
                  <option value="FIXED">Cố định mỗi đơn (VND)</option>
                </Form.Select>
              </Col>

              <Col md={3} lg={2}>
                <Form.Label className="fw-semibold small">
                  Mức thu ({form.calculationType === 'PERCENTAGE' ? '%' : 'VND'}) *
                </Form.Label>
                <Form.Control
                  required
                  min="0"
                  max={form.calculationType === 'PERCENTAGE' ? '100' : undefined}
                  step="any"
                  type="number"
                  placeholder={form.calculationType === 'PERCENTAGE' ? 'VD: 12' : 'VD: 150000'}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </Col>

              <Col md={3} lg={3}>
                <Form.Label className="fw-semibold small">Hiệu lực từ ngày *</Form.Label>
                <Form.Control
                  required
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </Col>

              <Col md={3} lg={3}>
                <Form.Label className="fw-semibold small">Đến ngày (Tùy chọn)</Form.Label>
                <Form.Control
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                />
              </Col>

              <Col md={12} lg={2} className="d-flex align-items-end">
                <Button type="submit" disabled={submitting} className="w-100 om-action">
                  <FiPlus /> {form.scope === 'HOTEL' ? 'Gắn vào KS' : 'Tạo chính sách'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* BẢNG TRA CỨU & GẮN HOA HỒNG TRỰC TIẾP THEO TỪNG KHÁCH SẠN */}
      <Card className="om-card mb-4">
        <div className="om-section-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h3 className="om-card-title">Bảng gắn kết Hoa hồng theo từng Khách sạn ({hotels.length} khách sạn)</h3>
            <p className="text-muted small mb-0 mt-1">
              Kiểm tra khách sạn nào đã có chính sách riêng và mô phỏng số tiền khấu trừ thực tế trên doanh thu.
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted text-nowrap">Mô phỏng đơn giá trị:</span>
            <Form.Control
              size="sm"
              type="number"
              min="100000"
              step="500000"
              style={{ width: 150 }}
              value={sampleAmount}
              onChange={(e) => setSampleAmount(Number(e.target.value) || 0)}
            />
            <span className="small text-muted">₫</span>
          </div>
        </div>

        {loading ? (
          <div className="om-empty"><Spinner /></div>
        ) : (
          <Table responsive hover className="om-table align-middle mb-0">
            <thead>
              <tr>
                <th>Khách sạn</th>
                <th>Đối tác sở hữu</th>
                <th>Chính sách đang gắn</th>
                <th>Mức hoa hồng</th>
                <th>Mô phỏng khấu trừ ({Number(sampleAmount).toLocaleString('vi-VN')} ₫)</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {hotels.length ? hotels.map((hotel) => {
                const eff = hotel.effectivePolicy;
                const fee = calcSampleCommission(eff, sampleAmount);
                const net = Math.max(0, sampleAmount - fee);
                const isDirect = Boolean(hotel.directPolicy);
                return (
                  <tr key={hotel._id}>
                    <td>
                      <span className="om-primary-text">{hotel.name}</span>
                      <span className="om-secondary-text">
                        {hotel.provinceCity} · {hotel.starRating} sao · Trạng thái: <strong>{hotel.status}</strong>
                      </span>
                    </td>
                    <td>
                      <div className="fw-semibold small">{hotel.ownerId?.fullName || 'Chưa rõ'}</div>
                      <div className="text-muted small">{hotel.ownerId?.email || ''}</div>
                    </td>
                    <td>
                      {eff ? (
                        <div>
                          <Badge bg={SCOPE_META[eff.scope]?.badge || 'secondary'} className="mb-1">
                            {isDirect ? 'Đã gắn riêng cho KS' : SCOPE_META[eff.scope]?.label}
                          </Badge>
                          <div className="small text-muted">{eff.name}</div>
                        </div>
                      ) : (
                        <Badge bg="warning" text="dark">Chưa có chính sách</Badge>
                      )}
                    </td>
                    <td>
                      <strong className="text-primary">{formatRule(eff)}</strong>
                    </td>
                    <td>
                      <div className="small">
                        Thu sàn: <strong className="text-danger">-{fee.toLocaleString('vi-VN')} ₫</strong>
                      </div>
                      <div className="small text-muted">
                        KS thực nhận: <strong className="text-success">{net.toLocaleString('vi-VN')} ₫</strong>
                      </div>
                    </td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant={isDirect ? 'outline-primary' : 'primary'}
                        className="om-action"
                        onClick={() => openAssignHotelModal(hotel)}
                      >
                        <FiSliders /> {isDirect ? 'Đổi mức hoa hồng KS' : 'Gắn hoa hồng riêng'}
                      </Button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="om-empty">Chưa có khách sạn nào trong hệ thống.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      {/* DANH SÁCH TẤT CẢ CHÍNH SÁCH HOA HỒNG */}
      <Card className="om-card">
        <div className="om-section-header">
          <div>
            <h3 className="om-card-title">Danh sách toàn bộ chính sách hoa hồng</h3>
            <p className="text-muted small mb-0 mt-1">{policies.length} chính sách đã được cấu hình trong hệ thống</p>
          </div>
        </div>
        <Table responsive hover className="om-table align-middle mb-0">
          <thead>
            <tr>
              <th>Tên chính sách</th>
              <th>Khách sạn / Đối tượng gắn</th>
              <th>Quy tắc khấu trừ</th>
              <th>Thời hạn hiệu lực</th>
              <th>Trạng thái</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {policies.length ? policies.map((policy) => (
              <tr key={policy._id}>
                <td>
                  <span className="om-primary-text">{policy.name}</span>
                  <span className="om-secondary-text">
                    {SCOPE_META[policy.scope]?.priority || policy.scope}
                  </span>
                </td>
                <td>{renderTargetLabel(policy)}</td>
                <td>
                  <strong className="text-dark">{formatRule(policy)}</strong>
                </td>
                <td>
                  <div className="small">
                    Từ: <strong>{new Date(policy.effectiveFrom).toLocaleDateString('vi-VN')}</strong>
                  </div>
                  <div className="small text-muted">
                    Đến: {policy.effectiveTo ? new Date(policy.effectiveTo).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                  </div>
                </td>
                <td>
                  <span className={`om-status ${policy.status === 'ACTIVE' ? 'success' : 'neutral'}`}>
                    {policy.status === 'ACTIVE' ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                  </span>
                </td>
                <td className="text-end">
                  <div className="om-actions">
                    <Button
                      size="sm"
                      className="om-action"
                      variant="outline-primary"
                      onClick={() => openEditPolicyModal(policy)}
                    >
                      <FiEdit2 /> Sửa / Đổi KS gắn
                    </Button>
                    <Button
                      size="sm"
                      className="om-action"
                      variant={policy.status === 'ACTIVE' ? 'outline-secondary' : 'success'}
                      onClick={() => toggleStatus(policy)}
                    >
                      <FiPower /> {policy.status === 'ACTIVE' ? 'Ngừng áp dụng' : 'Kích hoạt'}
                    </Button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="om-empty">Chưa có chính sách hoa hồng nào.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* MÀN HÌNH PHỤ (MODAL): GẮN / ĐIỀU CHỈNH CHÍNH SÁCH HOA HỒNG CHO KHÁCH SẠN */}
      <Modal
        show={modalState.show}
        onHide={() => setModalState((prev) => ({ ...prev, show: false }))}
        size="lg"
        centered
      >
        <Form onSubmit={submitModal}>
          <Modal.Header closeButton>
            <Modal.Title className="h5 fw-bold">
              {modalState.mode === 'ASSIGN_HOTEL'
                ? 'Gắn chính sách hoa hồng riêng cho Khách sạn'
                : 'Điều chỉnh chính sách & Khách sạn gắn kết'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info" className="small mb-3">
              Chính sách gắn trực tiếp vào <strong>Khách sạn cụ thể</strong> sẽ được ưu tiên áp dụng cao nhất khi hệ thống tính
              <strong> Thống kê doanh thu của Đối tác</strong> và khi lập <strong>Bảng kê chi trả (Payout)</strong>.
            </Alert>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-semibold">Phạm vi áp dụng</Form.Label>
                <Form.Select
                  value={modalState.scope}
                  onChange={(e) => setModalState({ ...modalState, scope: e.target.value })}
                >
                  <option value="HOTEL">Khách sạn cụ thể (Ưu tiên 1)</option>
                  <option value="PARTNER">Theo Đối tác (Ưu tiên 2)</option>
                  <option value="GLOBAL">Mặc định Toàn hệ thống (Ưu tiên 3)</option>
                </Form.Select>
              </Col>

              {modalState.scope === 'HOTEL' && (
                <Col md={6}>
                  <Form.Label className="small fw-semibold">Khách sạn được gắn *</Form.Label>
                  <Form.Select
                    required
                    value={modalState.hotelId}
                    onChange={(e) => setModalState({ ...modalState, hotelId: e.target.value })}
                  >
                    <option value="">-- Chọn khách sạn --</option>
                    {hotels.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name} ({h.provinceCity}) — Chủ: {h.ownerId?.fullName || 'N/A'}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              )}

              {modalState.scope === 'PARTNER' && (
                <Col md={6}>
                  <Form.Label className="small fw-semibold">Đối tác được gắn *</Form.Label>
                  <Form.Select
                    required
                    value={modalState.partnerId}
                    onChange={(e) => setModalState({ ...modalState, partnerId: e.target.value })}
                  >
                    <option value="">-- Chọn đối tác --</option>
                    {partners.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.fullName} ({p.email})
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              )}

              <Col md={12}>
                <Form.Label className="small fw-semibold">Tên chính sách hoa hồng *</Form.Label>
                <Form.Control
                  required
                  value={modalState.name}
                  onChange={(e) => setModalState({ ...modalState, name: e.target.value })}
                />
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Kiểu tính</Form.Label>
                <Form.Select
                  value={modalState.calculationType}
                  onChange={(e) => setModalState({ ...modalState, calculationType: e.target.value })}
                >
                  <option value="PERCENTAGE">Phần trăm doanh thu (%)</option>
                  <option value="FIXED">Số tiền cố định (VND)</option>
                </Form.Select>
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">
                  Giá trị ({modalState.calculationType === 'PERCENTAGE' ? '%' : 'VND'}) *
                </Form.Label>
                <Form.Control
                  required
                  type="number"
                  min="0"
                  max={modalState.calculationType === 'PERCENTAGE' ? '100' : undefined}
                  step="any"
                  value={modalState.value}
                  onChange={(e) => setModalState({ ...modalState, value: e.target.value })}
                />
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Trạng thái</Form.Label>
                <Form.Select
                  value={modalState.status}
                  onChange={(e) => setModalState({ ...modalState, status: e.target.value })}
                >
                  <option value="ACTIVE">Kích hoạt ngay (ACTIVE)</option>
                  <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                </Form.Select>
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold">Ngày bắt đầu hiệu lực *</Form.Label>
                <Form.Control
                  required
                  type="date"
                  value={modalState.effectiveFrom}
                  onChange={(e) => setModalState({ ...modalState, effectiveFrom: e.target.value })}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold">Ngày kết thúc hiệu lực (Tùy chọn)</Form.Label>
                <Form.Control
                  type="date"
                  value={modalState.effectiveTo}
                  onChange={(e) => setModalState({ ...modalState, effectiveTo: e.target.value })}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setModalState((prev) => ({ ...prev, show: false }))}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu & Đồng bộ sang Khách sạn'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default CommissionPolicyPage;
