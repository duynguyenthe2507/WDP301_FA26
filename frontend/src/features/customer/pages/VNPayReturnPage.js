import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button, Row, Col } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaArrowLeft, FaRedo, FaFileInvoice, FaShieldAlt, FaHistory } from 'react-icons/fa';
import { verifyVNPayPayment } from '../CustomerApi';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

const VNPayReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [booking, setBooking] = useState(null);

  const responseCode = searchParams.get('vnp_ResponseCode');
  const bookingCode = searchParams.get('vnp_TxnRef');
  const transactionNo = searchParams.get('vnp_TransactionNo');
  const bankCode = searchParams.get('vnp_BankCode');
  const amount = Number(searchParams.get('vnp_Amount')) / 100 || 0;

  useEffect(() => {
    const processReturn = async () => {
      const params = Object.fromEntries([...searchParams]);

      if (!responseCode || !bookingCode) {
        setLoading(false);
        setSuccess(false);
        setMessage('Không tìm thấy thông tin giao dịch thanh toán từ VNPAY.');
        return;
      }

      try {
        const res = await verifyVNPayPayment(params);
        setLoading(false);
        if (res.data?.success && responseCode === '00') {
          setSuccess(true);
          setMessage('Giao dịch thanh toán thành công!');
          setBooking(res.data.booking);
        } else {
          setSuccess(false);
          setMessage(
            res.data?.message ||
              'Giao dịch không thành công hoặc bạn đã hủy thao tác thanh toán trên VNPAY.'
          );
          setBooking(res.data?.booking);
        }
      } catch (err) {
        console.error('Lỗi kiểm tra kết quả VNPAY:', err);
        setLoading(false);
        if (responseCode === '00') {
          setSuccess(true);
          setMessage('Giao dịch thanh toán thành công!');
        } else {
          setSuccess(false);
          setMessage('Giao dịch thanh toán không hoàn tất.');
        }
      }
    };

    processReturn();
  }, [searchParams, responseCode, bookingCode]);

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '85vh', padding: '3rem 0' }}>
      <Container style={{ maxWidth: '680px' }}>
        <Card className="border-0 shadow-sm rounded-3 overflow-hidden bg-white">
          <Card.Body className="p-4 p-md-5 text-center">
            {loading ? (
              <div className="py-4">
                <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                <h5 className="mt-3 text-dark fw-bold">Đang xác thực kết quả thanh toán từ VNPAY...</h5>
                <p className="text-muted small">Vui lòng đợi trong giây lát.</p>
              </div>
            ) : success ? (
              <div>
                <FaCheckCircle className="text-success mb-3" size={56} />
                <h3 className="fw-bold text-dark mb-2">Thanh Toán Thành Công!</h3>
                <p className="text-muted small mb-4">
                  Cảm ơn bạn. Đơn đặt phòng của bạn đã được xác nhận và thanh toán qua cổng VNPAY.
                </p>

                {/* BẢNG TÓM TẮT GIAO DỊCH */}
                <div className="bg-light p-3 p-md-4 rounded-3 text-start small mb-4 border">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-secondary">Mã đặt phòng:</span>
                    <strong className="text-dark font-monospace">{bookingCode}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-secondary">Mã giao dịch VNPAY:</span>
                    <strong className="text-primary font-monospace">{transactionNo || 'N/A'}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-secondary">Ngân hàng thanh toán:</span>
                    <strong className="text-dark">{bankCode || 'VNPAY'}</strong>
                  </div>
                  <div className="d-flex justify-content-between pt-2 border-top">
                    <span className="text-secondary fw-semibold">Số tiền đã thanh toán:</span>
                    <strong className="text-success fs-6">{formatPrice(amount)}</strong>
                  </div>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
                  <Link
                    to={`/booking/confirmation/${bookingCode}`}
                    state={{ booking }}
                    className="btn btn-primary px-4 py-2 fw-semibold"
                    style={{ backgroundColor: '#005baa', borderColor: '#005baa' }}
                  >
                    <FaFileInvoice className="me-1" /> Xem phiếu xác nhận đặt phòng
                  </Link>
                  <Link to="/booking-history" className="btn btn-outline-primary px-4 py-2 fw-semibold">
                    <FaHistory className="me-1" /> Lịch sử đặt phòng
                  </Link>
                  <Link to="/" className="btn btn-outline-secondary px-4 py-2">
                    Về trang chủ
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <FaTimesCircle className="text-danger mb-3" size={56} />
                <h3 className="fw-bold text-danger mb-2">Thanh Toán Chưa Hoàn Tất</h3>
                <p className="text-muted small mb-4">{message}</p>

                <div className="bg-light p-3 rounded-3 text-start small mb-4 border">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-secondary">Mã đơn đặt phòng:</span>
                    <strong className="text-dark font-monospace">{bookingCode || 'N/A'}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-secondary">Mã phản hồi VNPAY:</span>
                    <span className="badge bg-danger">{responseCode || 'FAILED'}</span>
                  </div>
                  <div className="text-muted mt-2 pt-2 border-top" style={{ fontSize: '0.85rem' }}>
                    Giao dịch chưa được trừ tiền hoặc bạn đã hủy trong quá trình thanh toán trên VNPAY. Bạn có thể tiến hành thanh toán lại đơn phòng này.
                  </div>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
                  <Button
                    onClick={() => navigate('/booking', { state: { booking } })}
                    className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-1"
                    style={{ backgroundColor: '#005baa', borderColor: '#005baa' }}
                  >
                    <FaRedo /> Thử thanh toán lại
                  </Button>
                  <Link to="/hotels" className="btn btn-outline-secondary px-4 py-2">
                    Quay lại danh sách khách sạn
                  </Link>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default VNPayReturnPage;
