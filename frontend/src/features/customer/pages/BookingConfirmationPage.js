import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Container, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaClock, FaCreditCard } from 'react-icons/fa';
import { getBookingByCode } from '../CustomerApi';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

const formatDate = (date) =>
  new Date(date).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

// Một dòng "nhãn — giá trị" dùng chung cho các mục thông tin
const InfoRow = ({ label, children }) => (
  <div className="d-flex justify-content-between gap-3 py-1">
    <span className="text-secondary">{label}</span>
    <span className="fw-semibold text-dark text-end">{children}</span>
  </div>
);

const Section = ({ title, children, last }) => (
  <div className={last ? '' : 'pb-3 mb-3 border-bottom'}>
    <div className="fw-semibold text-secondary mb-2" style={{ fontSize: '0.8rem' }}>
      {title}
    </div>
    {children}
  </div>
);

const BookingConfirmationPage = () => {
  const { bookingCode } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState('');

  const isCancelled = booking?.bookingStatus === 'CANCELLED';
  const isPaid = !isCancelled && (booking?.paymentStatus === 'PAID' || booking?.bookingStatus === 'CONFIRMED');
  const isPending = !isCancelled && !isPaid;

  const [isExpired, setIsExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (bookingCode) {
      if (!booking) setLoading(true);
      getBookingByCode(bookingCode)
        .then((res) => {
          if (res.data?.booking) {
            setBooking(res.data.booking);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi tải thông tin đơn đặt phòng:', err);
          if (!booking) {
            setError(err.response?.data?.message || 'Không tìm thấy thông tin đơn đặt phòng');
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [bookingCode]);

  useEffect(() => {
    if (!booking || !isPending) return;

    const calculateRemaining = () => {
      const expiresAt = new Date(booking.createdAt).getTime() + 15 * 60 * 1000;
      return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    };

    const initialLeft = calculateRemaining();
    setRemainingSeconds(initialLeft);
    if (initialLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      const left = calculateRemaining();
      setRemainingSeconds(left);
      if (left <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPending, booking]);

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-secondary small">Đang tải phiếu xác nhận đặt phòng...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <Container className="py-5" style={{ minHeight: '60vh' }}>
        <Alert variant="danger" className="text-center p-4 rounded-3 border-0 shadow-sm">
          <h5 className="fw-bold mb-2">Không tìm thấy đơn đặt phòng</h5>
          <p className="small mb-3">{error || 'Mã đơn không tồn tại hoặc đã bị hủy/xóa do hết hạn.'}</p>
          <Link to="/" className="btn btn-outline-secondary btn-sm">
            Quay về trang chủ
          </Link>
        </Alert>
      </Container>
    );
  }

  const bookingDetails =
    Array.isArray(booking.bookingDetails) && booking.bookingDetails.length > 0
      ? booking.bookingDetails
      : [
        {
          roomTypeName: booking.roomTypeName || '',
          quantity: booking.roomQuantity || 1,
          pricePerNight:
            booking.pricePerNight ||
            Math.round((booking.totalAmount || 0) / (booking.totalNights || 1)),
          totalPrice: booking.totalAmount || 0,
        },
      ];

  // Khách nhận phòng: chính chủ thì là người đặt, ngược lại lấy guestInfo
  const guest = booking.isSelfGuest || !booking.guestInfo?.fullName ? booking.bookerInfo : booking.guestInfo;

  const nights = Number(booking.totalNights) || 1;
  const lineTotal = (r) =>
    Number(r.totalPrice) || (Number(r.pricePerNight) || 0) * (Number(r.quantity) || 1) * nights;

  const totalRoomCost = bookingDetails.reduce((sum, r) => sum + lineTotal(r), 0);
  const serviceFee = Math.max(0, (booking.totalAmount || 0) - totalRoomCost);

  // Đơn đã hủy nhưng từng thanh toán -> hiện phần hoàn tiền
  const wasPaid = booking.paymentStatus === 'PAID';
  const refundAmount = booking.refundAmount !== undefined ? booking.refundAmount : booking.totalAmount;
  const refundStatusText = {
    PENDING: 'Đang xử lý',
    PROCESSED: 'Đã hoàn tiền',
  }[booking.refundStatus] || (wasPaid ? 'Đang xử lý' : 'Không áp dụng');

  const countdown =`${Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;

  const status = isPaid
    ? { icon: <FaCheckCircle className="text-success" size={36} />, title: 'Đặt phòng thành công', text: 'Đơn phòng đã được xác nhận và thanh toán qua VNPAY.' }
    : isCancelled
      ? { icon: <FaTimesCircle className="text-danger" size={36} />, title: 'Đơn đã bị hủy', text: wasPaid ? 'Yêu cầu hủy đã được tiếp nhận, tiền hoàn đang được xử lý.' : 'Đơn đặt phòng này đã được hủy.' }
      : isExpired
        ? { icon: <FaTimesCircle className="text-danger" size={36} />, title: 'Đơn đã quá hạn thanh toán', text: 'Đơn quá 15 phút chưa thanh toán nên đã bị hủy. Vui lòng đặt lại.' }
        : { icon: <FaClock className="text-secondary" size={36} />, title: 'Đang chờ thanh toán', text: 'Vui lòng thanh toán trước khi hết giờ để giữ phòng.' };

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '90vh', padding: '2.5rem 0 4rem' }}>
      <Container style={{ maxWidth: '720px' }}>
        <Card className="border rounded-3">
          {/* TRẠNG THÁI */}
          <Card.Body className="p-4 text-center border-bottom">
            <div className="mb-2">{status.icon}</div>
            <h4 className="fw-bold text-dark mb-1">{status.title}</h4>
            <p className="text-secondary small mb-2">{status.text}</p>

            {isPending && !isExpired && (
              <div className="mb-3">
                <div className="text-secondary small">Thời gian giữ phòng còn lại</div>
                <div className="fs-4 fw-bold text-dark font-monospace">{countdown}</div>
              </div>
            )}

            <div className="small text-secondary">
              Mã đặt phòng: <strong className="font-monospace text-dark">{booking.bookingCode}</strong>
            </div>
          </Card.Body>

          <Card.Body className="p-4" style={{ fontSize: '0.92rem' }}>
            {/* KHÁCH SẠN & NGÀY */}
            <Section title="Khách sạn">
              <div className="fw-bold text-dark">{booking.hotelName}</div>
              <div className="text-muted mb-2">{booking.hotelAddress || 'Địa chỉ khách sạn đối tác'}</div>
              <InfoRow label="Nhận phòng">{formatDate(booking.checkInDate)} · từ 14:00</InfoRow>
              <InfoRow label="Trả phòng">{formatDate(booking.checkOutDate)} · trước 12:00</InfoRow>
              <InfoRow label="Số đêm">{nights} đêm</InfoRow>
            </Section>

            {/* PHÒNG ĐÃ ĐẶT */}
            <Section title="Phòng đã đặt">
              {bookingDetails.map((room, idx) => (
                <div key={idx} className="d-flex justify-content-between gap-3 py-1">
                  <div>
                    <div className="fw-semibold text-dark">{room.roomTypeName || 'Phòng'} × {Number(room.quantity) || 1}</div>
                    <div className="text-muted small">{formatPrice(Number(room.pricePerNight) || 0)} / phòng / đêm</div>
                  </div>
                  <span className="fw-semibold text-dark">{formatPrice(lineTotal(room))}</span>
                </div>
              ))}
            </Section>

            {/* KHÁCH */}
            <Section title="Thông tin khách nhận phòng">
              <InfoRow label="Họ tên">{guest?.fullName}</InfoRow>
              <InfoRow label="Điện thoại">{guest?.phoneNumber}</InfoRow>
              {booking.isSelfGuest && <InfoRow label="Email">{booking.bookerInfo?.email}</InfoRow>}
              {!booking.isSelfGuest && (
                <InfoRow label="Người đặt hộ">
                  {booking.bookerInfo?.fullName} ({booking.bookerInfo?.phoneNumber})
                </InfoRow>
              )}
              {Boolean(booking.specialRequests) && (
                <InfoRow label="Yêu cầu đặc biệt">{booking.specialRequests}</InfoRow>
              )}
            </Section>

            {/* THANH TOÁN */}
            <Section title="Thanh toán" last={!isCancelled}>
              <InfoRow label="Tiền phòng">{formatPrice(totalRoomCost)}</InfoRow>
              {serviceFee > 0 && <InfoRow label="Thuế & phí dịch vụ">{formatPrice(serviceFee)}</InfoRow>}
              {(isPaid || wasPaid) && booking.vnpayTransaction?.vnp_TransactionNo && (
                <InfoRow label="Mã giao dịch VNPAY">
                  <span className="font-monospace">{booking.vnpayTransaction.vnp_TransactionNo}</span>
                  {booking.vnpayTransaction.vnp_BankCode && ` · ${booking.vnpayTransaction.vnp_BankCode}`}
                </InfoRow>
              )}
              <div className="d-flex justify-content-between align-items-center pt-2 mt-2 border-top">
                <span className={`fw-bold ${isPaid ? 'text-success' : 'text-dark'}`}>{isPaid || wasPaid ? 'Đã thanh toán' : 'Tổng cần thanh toán'}</span>
                <span className={`fw-bold fs-5 ${isPaid ? 'text-success' : 'text-dark'}`}>
                  {formatPrice(booking.totalAmount)}
                </span>
              </div>
            </Section>

            {/* HOÀN TIỀN (chỉ đơn đã hủy) */}
            {isCancelled && (
              <Section title="Thông tin hoàn tiền" last>
                {booking.cancelledAt && (
                  <InfoRow label="Thời gian hủy">
                    {new Date(booking.cancelledAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </InfoRow>
                )}
                {booking.cancellationReason && <InfoRow label="Lý do hủy">{booking.cancellationReason}</InfoRow>}
                <InfoRow label="Phí hủy">
                  {booking.cancellationFee > 0 ? formatPrice(booking.cancellationFee) : 'Miễn phí'}
                </InfoRow>
                {wasPaid && <InfoRow label="Phương thức hoàn">VNPAY / tài khoản nguồn</InfoRow>}
                <InfoRow label="Trạng thái">{refundStatusText}</InfoRow>
                {wasPaid && (
                  <>
                    <div className="d-flex justify-content-between align-items-center pt-2 mt-2 border-top">
                      <span className="fw-bold text-success">Tiền được hoàn</span>
                      <span className="fw-bold fs-5 text-success">{formatPrice(refundAmount)}</span>
                    </div>
                    <div className="text-muted small mt-2">
                      Tiền về tài khoản trong 3–5 ngày làm việc (không tính Thứ 7, Chủ nhật).
                    </div>
                  </>
                )}
              </Section>
            )}
          </Card.Body>
        </Card>

        {/* NÚT HÀNH ĐỘNG */}
        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 mt-4">
          {isPending && !isExpired && (
            <Button
              as={Link}
              to="/booking"
              state={{ booking }}
              variant="warning"
              className="fw-semibold d-inline-flex align-items-center justify-content-center gap-1"
            >
              <FaCreditCard /> Thanh toán ngay
            </Button>
          )}
          <Link to="/booking-history" className="btn btn-dark px-4">
            Lịch sử đặt phòng
          </Link>
          {isPaid && (
            <Link
              to={`/booking/cancel/${booking.bookingCode || booking._id}`}
              className="btn btn-outline-danger px-4"
            >
              Hủy đặt phòng
            </Link>
          )}
          <Link to="/hotels" className="btn btn-outline-secondary px-4">
            {isPending && isExpired ? 'Đặt lại phòng' : 'Đặt thêm phòng'}
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default BookingConfirmationPage;
