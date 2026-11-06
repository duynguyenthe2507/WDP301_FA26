import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Container, Card, Spinner, Button } from 'react-bootstrap';
import { FaTimesCircle, FaRedo } from 'react-icons/fa';
import { verifyVNPayPayment } from '../CustomerApi';

const VNPayReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [booking, setBooking] = useState(null);

  const responseCode = searchParams.get('vnp_ResponseCode');
  // Lần thanh toán lại có dạng <bookingCode>R<timestamp>
  const bookingCode = searchParams.get('vnp_TxnRef')?.split('R')[0];

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const processReturn = async () => {
      const params = Object.fromEntries([...searchParams]);

      if (!responseCode || !bookingCode) {
        setLoading(false);
        setMessage('Không tìm thấy thông tin giao dịch thanh toán từ VNPAY.');
        return;
      }

      try {
        const res = await verifyVNPayPayment(params);
        if (res.data?.success && responseCode === '00') {
          // replace: để nút Back không quay lại trang return và verify lại lần nữa
          navigate(`/booking/confirmation/${bookingCode}`, { replace: true, state: { booking: res.data.booking } });
          return;
        }
        if (res.data?.booking) {
          // Đơn hết hạn: BookingPage tự báo và đưa về /hotels, nên không gửi paymentFailed
          navigate('/booking', {
            replace: true,
            state: {
              booking: res.data.booking,
              paymentFailed: res.data.isExpired ? undefined : res.data.message,
            },
          });
          return;
        }
        setLoading(false);
        if (res.data?.isExpired) {
          setIsExpired(true);
        }
        setMessage(
          res.data?.message ||
            'Giao dịch không thành công hoặc bạn đã hủy thao tác thanh toán trên VNPAY.'
        );
        setBooking(res.data?.booking);
      } catch (err) {
        console.error('Lỗi kiểm tra kết quả VNPAY:', err);
        setLoading(false);
        if (responseCode === '00') {
          navigate(`/booking/confirmation/${bookingCode}`, { replace: true });
          return;
        }
        setMessage('Giao dịch thanh toán không hoàn tất.');
      }
    };

    processReturn();
  }, [searchParams, responseCode, bookingCode, navigate]);

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
                    {isExpired ? (
                      <span className="text-danger fw-semibold">
                        Đơn đặt phòng này đã quá thời hạn thanh toán 15 phút và đã được hệ thống tự động xóa. Vui lòng chọn và đặt phòng mới.
                      </span>
                    ) : (
                      <span>
                        Giao dịch chưa được trừ tiền hoặc bạn đã hủy trong quá trình thanh toán trên VNPAY. Bạn có thể tiến hành thanh toán lại đơn phòng này trong vòng 15 phút.
                      </span>
                    )}
                  </div>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
                  {!isExpired && (
                    <Button
                      onClick={() => navigate('/booking', { state: { booking } })}
                      className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-1"
                      style={{ backgroundColor: '#005baa', borderColor: '#005baa' }}
                    >
                      <FaRedo /> Thử thanh toán lại
                    </Button>
                  )}
                  <Link to="/hotels" className="btn btn-outline-primary px-4 py-2 fw-semibold">
                    {isExpired ? 'Đặt lại phòng mới' : 'Quay lại danh sách khách sạn'}
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
