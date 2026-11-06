import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import CustomerSidebar from '../components/CustomerSidebar';
import { getMyDisputes } from '../CustomerApi';

const STATUS = {
  PENDING: { label: 'Chờ xử lý', bg: 'warning' },
  IN_PROGRESS: { label: 'Đang xử lý', bg: 'info' },
  WAITING_PARTNER: { label: 'Chờ đối tác phản hồi', bg: 'info' },
  RESOLVED: { label: 'Đã giải quyết', bg: 'success' },
  REJECTED: { label: 'Bị từ chối', bg: 'danger' },
};

const CATEGORY = {
  INCORRECT_INFORMATION: 'Thông tin chỗ nghỉ không đúng mô tả',
  SERVICE_QUALITY: 'Chất lượng dịch vụ không đúng cam kết',
  OVERCHARGE: 'Thu thêm phụ phí không công bố',
  CANCELLATION: 'Sự cố hủy phòng / Không nhận được phòng',
  OTHER: 'Lý do khác',
};

const MyDisputesPage = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getMyDisputes()
      .then((res) => setDisputes(res.data?.disputes || []))
      .catch((err) => setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách khiếu nại.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '90vh', padding: '2rem 0 4rem' }}>
    <Container style={{ maxWidth: '1440px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.02em' }}>
        Khiếu nại của tôi
      </h1>
      <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '28px' }}>
        Theo dõi các khiếu nại bạn đã gửi về kỳ nghỉ và phản hồi từ VinaStay.
      </p>
      <Row className="g-4">
        <Col lg={3} md={4}>
          <CustomerSidebar activeKey="complaints" />
        </Col>
        <Col lg={9} md={8}>
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : errorMsg ? (
            <Alert variant="danger">{errorMsg}</Alert>
          ) : disputes.length === 0 ? (
            <div className="text-center text-muted py-5 border rounded-3 bg-white">
              Bạn chưa có khiếu nại nào.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {disputes.map((d) => {
                const st = STATUS[d.status] || { label: d.status, bg: 'secondary' };
                return (
                  <div key={d._id} className="bg-white border rounded-3 p-3">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div>
                        <div className="fw-bold">{d.hotelId?.name || 'Khách sạn'}</div>
                        <div className="small text-muted">
                          Mã đặt phòng: <span className="text-primary fw-semibold">{d.bookingCode}</span>
                          {' · '}Gửi ngày {new Date(d.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                      <Badge bg={st.bg} text={st.bg === 'warning' ? 'dark' : undefined}>{st.label}</Badge>
                    </div>
                    <div className="small"><strong>Danh mục:</strong> {CATEGORY[d.category] || d.category}</div>
                    <div className="small text-secondary mt-1" style={{ whiteSpace: 'pre-line' }}>{d.description}</div>
                    {d.resolution?.message && (
                      <div className="small mt-2 p-2 rounded bg-light">
                        <strong>Phản hồi:</strong> {d.resolution.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Col>
      </Row>
    </Container>
    </div>
  );
};

export default MyDisputesPage;
