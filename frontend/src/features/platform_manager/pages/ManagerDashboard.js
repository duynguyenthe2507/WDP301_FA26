import { useEffect, useState } from 'react';
import { Alert, Col, Row, Spinner } from 'react-bootstrap';
import { getManagerDashboard } from '../managerApi';

const ManagerDashboard = () => {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { getManagerDashboard().then((response) => setData(response.data)).catch((requestError) => setError(requestError.response?.data?.message || 'Không thể tải tổng quan.')); }, []);
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!data) return <div className="om-empty"><Spinner /></div>;
  const cards = [['Chờ xác minh', data.stats.verificationPending], ['Tranh chấp mở', data.stats.disputeOpen], ['Chờ hoàn tiền', data.stats.refundPending]];
  return <div><div className="om-page-heading"><div><h2>Tổng quan vận hành</h2><p>Theo dõi các công việc cần xử lý trên toàn nền tảng.</p></div></div><Row className="g-3">{cards.map(([label, value]) => <Col md={4} key={label}><div className="om-kpi"><span>{label}</span><strong>{value}</strong></div></Col>)}</Row></div>;
};

export default ManagerDashboard;
