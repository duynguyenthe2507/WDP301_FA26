import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import {
  FaUser,
  FaPhoneAlt,
  FaEnvelope,
  FaShieldAlt,
  FaArrowLeft,
  FaCheck,
  FaInfoCircle,
  FaCheckCircle,
  FaClock,
} from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import { createPendingBooking } from '../CustomerApi';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Nhận thông tin đặt phòng từ trang chi tiết hoặc dùng dữ liệu mặc định
  const rawState = location.state || {};
  const pendingBooking = rawState.booking;

  // Quay về từ VNPAY với giao dịch thất bại -> hiện modal
  const [paymentFailedMsg, setPaymentFailedMsg] = useState(rawState.paymentFailed || '');
  const closePaymentFailed = () => {
    setPaymentFailedMsg('');
    // Bỏ cờ khỏi history để F5 không hiện lại modal
    navigate(location.pathname, { replace: true, state: { booking: pendingBooking } });
  };

  // Thanh toán lại đơn cũ: dựng dữ liệu từ đơn đã lưu thay vì dùng giá mặc định
  const stateData = pendingBooking
    ? {
      hotel: { _id: pendingBooking.hotelId, name: pendingBooking.hotelName, address: pendingBooking.hotelAddress },
      checkIn: new Date(pendingBooking.checkInDate).toISOString().split('T')[0],
      checkOut: new Date(pendingBooking.checkOutDate).toISOString().split('T')[0],
      nights: pendingBooking.totalNights,
      bookingDetails: pendingBooking.bookingDetails,
      selectedRooms: (pendingBooking.bookingDetails || []).map((d) => ({
        _id: d.roomTypeId,
        name: d.roomTypeName,
        quantity: d.quantity,
        base_price: d.pricePerNight,
      })),
      totalAmount: pendingBooking.totalAmount,
    }
    : rawState;
  const hotel = stateData.hotel || {};

  // Chưa chọn phòng (vào thẳng /booking) -> quay về danh sách khách sạn
  const hasBookingData = Array.isArray(stateData.selectedRooms) && stateData.selectedRooms.length > 0;
  useEffect(() => {
    if (!hasBookingData) navigate('/hotels', { replace: true });
  }, [hasBookingData, navigate]);

  // Nếu người dùng nhấn vào thanh toán lại một đơn cũ nhưng đã quá 15 phút
  useEffect(() => {
    if (pendingBooking) {
      const expiresAt = new Date(pendingBooking.createdAt).getTime() + 15 * 60 * 1000;
      if (Date.now() >= expiresAt) {
        alert('Đơn đặt phòng này đã quá thời hạn 15 phút để thanh toán và đã bị xóa trên hệ thống. Vui lòng đặt lại phòng mới.');
        navigate('/hotels');
      }
    }
  }, [pendingBooking, navigate]);

  const checkIn = stateData.checkIn || '';
  const checkOut = stateData.checkOut || '';
  const nights = Math.max(
    1,
    Number(stateData.nights) ||
    Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)) ||
    1
  );

  const selectedRooms = stateData.selectedRooms || [];
  const bookingDetailsList = stateData.bookingDetails || [];

  const totalQuantity = selectedRooms.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0);

  const roomCost =
    stateData.roomCost ??
    bookingDetailsList.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalAmount = stateData.totalAmount ?? Math.round(roomCost * 1.1);
  const serviceFee = stateData.serviceFee ?? Math.max(0, totalAmount - roomCost); // 10% thuế & phí

  // 1. Thông tin người đặt
  const [bookerInfo, setBookerInfo] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (user) {
      setBookerInfo((prev) => ({
        fullName: prev.fullName || user.fullName || '',
        phoneNumber: prev.phoneNumber || user.phoneNumber || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  // 2. Lựa chọn người nhận phòng
  const [isSelfGuest, setIsSelfGuest] = useState(true);

  // 3. Thông tin khách nhận phòng (nếu đặt cho người khác)
  const [guestInfo, setGuestInfo] = useState({
    fullName: '',
    phoneNumber: '',
  });

  // 4. Yêu cầu đặc biệt cho khách sạn
  const [specialRequests, setSpecialRequests] = useState('');

  // State lỗi validation và xử lý submit
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Tự động reset trạng thái loading khi quay lại trang bằng nút Back của trình duyệt (bfcache)
  useEffect(() => {
    setIsSubmitting(false);

    const handlePageShow = () => {
      setIsSubmitting(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsSubmitting(false);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleBookerChange = (e) => {
    const { name, value } = e.target;
    setBookerInfo((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleGuestChange = (e) => {
    const { name, value } = e.target;
    setGuestInfo((prev) => ({ ...prev, [name]: value }));
    if (errors[`guest_${name}`]) {
      setErrors((prev) => ({ ...prev, [`guest_${name}`]: '' }));
    }
  };

  // Validate thông tin trước khi thanh toán
  const validateForm = () => {
    const newErrors = {};

    if (!bookerInfo.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên người đặt phòng';
    }

    if (!bookerInfo.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vui lòng nhập số điện thoại liên hệ';
    } else {
      const phoneClean = bookerInfo.phoneNumber.replace(/\s+/g, '');
      if (!/^[0-9]{9,12}$/.test(phoneClean)) {
        newErrors.phoneNumber = 'Số điện thoại không hợp lệ (từ 9 đến 12 số)';
      }
    }

    if (!bookerInfo.email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookerInfo.email.trim())) {
      newErrors.email = 'Địa chỉ email không đúng định dạng';
    }

    if (!isSelfGuest) {
      if (!guestInfo.fullName.trim()) {
        newErrors.guest_fullName = 'Vui lòng nhập họ và tên khách nhận phòng';
      }
      if (!guestInfo.phoneNumber.trim()) {
        newErrors.guest_phoneNumber = 'Vui lòng nhập số điện thoại khách nhận phòng';
      } else {
        const guestPhoneClean = guestInfo.phoneNumber.replace(/\s+/g, '');
        if (!/^[0-9]{9,12}$/.test(guestPhoneClean)) {
          newErrors.guest_phoneNumber = 'Số điện thoại khách không hợp lệ';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý khi nhấn nút thanh toán VNPAY
  const handlePayment = async () => {
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        hotelId: hotel._id || hotel.id,
        hotelName: hotel.name,
        hotelAddress: hotel.address,
        bookerInfo: {
          fullName: bookerInfo.fullName.trim(),
          phoneNumber: bookerInfo.phoneNumber.trim(),
          email: bookerInfo.email.trim(),
        },
        isSelfGuest,
        guestInfo: isSelfGuest
          ? { fullName: '', phoneNumber: '' }
          : {
            fullName: guestInfo.fullName.trim(),
            phoneNumber: guestInfo.phoneNumber.trim(),
          },
        specialRequests: specialRequests.trim(),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        totalNights: nights,
        bookingDetails: bookingDetailsList,
        totalAmount,
      };

      const res = await createPendingBooking(payload);
      const paymentUrl = res.data?.paymentUrl;

      if (paymentUrl) {
        // Chuyển hướng trực tiếp sang cổng thanh toán VNPAY Sandbox
        window.location.href = paymentUrl;

        // Reset lại nút sau 1.5s phòng khi người dùng ấn nút Back trên trình duyệt quay lại
        setTimeout(() => {
          setIsSubmitting(false);
        }, 1500);
      } else {
        throw new Error('Không nhận được URL thanh toán từ VNPAY');
      }
    } catch (err) {
      console.error('Lỗi khởi tạo thanh toán VNPAY:', err);
      setSubmitError(
        err.response?.data?.message || err.message || 'Không thể tạo giao dịch thanh toán. Vui lòng thử lại.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '90vh', padding: '2rem 0 4rem' }}>
      <Container>
        {/* Breadcrumb / Quay lại */}
        <div className="mb-4">
          <Link
            to={hotel._id ? `/hotels/${hotel._id}` : '/hotels'}
            className="text-decoration-none text-secondary small d-inline-flex align-items-center"
          >
            <FaArrowLeft className="me-1" /> Quay lại thông tin khách sạn
          </Link>
          <h3 className="fw-bold text-dark mt-2 mb-1" style={{ fontSize: '1.75rem' }}>
            Kiểm tra & Xác nhận đặt phòng
          </h3>
          <p className="text-muted small mb-0">
            Vui lòng kiểm tra chi tiết các loại phòng và thông tin liên hệ trước khi thanh toán qua VNPAY.
          </p>
        </div>

        {submitError && (
          <Alert variant="danger" className="mb-4 py-3 border-0 rounded-3 shadow-sm" onClose={() => setSubmitError('')} dismissible>
            <strong>Lỗi:</strong> {submitError}
          </Alert>
        )}

        <Row className="g-4">
          {/* CỘT TRÁI: FORM KIỂM TRA THÔNG TIN */}
          <Col lg={7}>
            {/* KHỐI 1: THÔNG TIN NGƯỜI ĐẶT */}
            <Card className="border-0 shadow-sm rounded-3 mb-4 bg-white">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                  <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <FaUser className="text-primary" /> Thông tin người đặt phòng
                  </h5>
                  {user && (
                    <span className="badge bg-light text-secondary border">
                      Đã đăng nhập ({user.fullName || user.email})
                    </span>
                  )}
                </div>

                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        Họ và tên <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="fullName"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={bookerInfo.fullName}
                        onChange={handleBookerChange}
                        isInvalid={!!errors.fullName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.fullName}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        Số điện thoại <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        name="phoneNumber"
                        placeholder="Ví dụ: 0912345678"
                        value={bookerInfo.phoneNumber}
                        onChange={handleBookerChange}
                        isInvalid={!!errors.phoneNumber}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phoneNumber}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-secondary">
                        Email nhận xác nhận <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="email@example.com"
                        value={bookerInfo.email}
                        onChange={handleBookerChange}
                        isInvalid={!!errors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                <div className="text-muted small mt-2">
                  Mã đặt phòng và hóa đơn điện tử sẽ được gửi về địa chỉ email này.
                </div>
              </Card.Body>
            </Card>

            {/* KHỐI 3: THÔNG TIN KHÁCH NHẬN PHÒNG */}
            <Card className="border-0 shadow-sm rounded-3 mb-4 bg-white">
              <Card.Body className="p-4">
                <h5 className="fw-bold text-dark mb-3 pb-2 border-bottom">
                  Khách lưu trú nhận phòng
                </h5>

                <div className="mb-3">
                  <Form.Check
                    type="radio"
                    id="guest-self"
                    name="guestOption"
                    label="Tôi là người nhận phòng"
                    checked={isSelfGuest}
                    onChange={() => setIsSelfGuest(true)}
                    className="fw-semibold text-dark mb-2"
                  />
                  <Form.Check
                    type="radio"
                    id="guest-other"
                    name="guestOption"
                    label="Tôi đặt phòng cho người khác (hoặc đại diện đoàn nhận)"
                    checked={!isSelfGuest}
                    onChange={() => setIsSelfGuest(false)}
                    className="fw-semibold text-dark"
                  />
                </div>

                {!isSelfGuest && (
                  <div className="p-3 bg-light rounded-3 border mt-3">
                    <h6 className="fw-bold text-dark mb-3">
                      Thông tin người đại diện nhận phòng tại khách sạn
                    </h6>
                    <Row className="g-3">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-secondary">
                            Họ và tên khách nhận phòng <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="fullName"
                            placeholder="Nhập họ và tên người lưu trú"
                            value={guestInfo.fullName}
                            onChange={handleGuestChange}
                            isInvalid={!!errors.guest_fullName}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.guest_fullName}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>

                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-secondary">
                            Số điện thoại khách <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            type="tel"
                            name="phoneNumber"
                            placeholder="Số điện thoại liên hệ của khách nhận phòng"
                            value={guestInfo.phoneNumber}
                            onChange={handleGuestChange}
                            isInvalid={!!errors.guest_phoneNumber}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.guest_phoneNumber}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* KHỐI 4: YÊU CẦU ĐẶC BIỆT CHO KHÁCH SẠN */}
            <Card className="border-0 shadow-sm rounded-3 mb-4 bg-white">
              <Card.Body className="p-4">
                <h5 className="fw-bold text-dark mb-2 pb-2 border-bottom">
                  Yêu cầu đặc biệt cho khách sạn
                </h5>
                <p className="text-secondary small mb-3">
                  Yêu cầu này áp dụng chung cho cả đơn đặt phòng và sẽ được chuyển trực tiếp tới khách sạn (ví dụ: giờ dự kiến check-in, phòng tầng cao, giường phụ, phòng yên tĩnh...).
                </p>
                <Form.Group>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Nhập yêu cầu đặc biệt của bạn tại đây (tùy chọn)..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            {/* KHỐI 5: PHƯƠNG THỨC THANH TOÁN VNPAY */}
            <Card className="border-0 shadow-sm rounded-3 mb-4 bg-white">
              <Card.Body className="p-4">
                <h5 className="fw-bold text-dark mb-3 pb-2 border-bottom">
                  Phương thức thanh toán
                </h5>

                <div
                  className="p-3 rounded-3 border d-flex align-items-center justify-content-between"
                  style={{ backgroundColor: '#f0f7ff', borderColor: '#b9d9eb' }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src="https://sandbox.vnpayment.vn/paymentv2/Images/brands/logo.svg"
                      alt="VNPAY"
                      style={{ height: '32px' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://vnpay.vn/assets/images/logo-vnpay.svg';
                      }}
                    />
                    <div>
                      <div className="fw-bold text-dark">
                        Cổng thanh toán VNPAY
                      </div>
                      <div className="text-muted small">
                        Hỗ trợ VNPAY-QR, Thẻ ATM/Tài khoản nội địa, Thẻ quốc tế Visa/Mastercard.
                      </div>
                    </div>
                  </div>
                  <FaCheck className="text-primary" />
                </div>

                <div className="small text-muted mt-3">
                  <FaShieldAlt className="text-success me-1" />
                  Giao dịch an toàn và bảo mật qua cổng thanh toán VNPAY. Sau khi xác nhận, bạn sẽ được chuyển sang giao diện VNPAY để thực hiện thanh toán.
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* CỘT PHẢI: TÓM TẮT ĐẶT PHÒNG VÀ GIÁ TIỀN */}
          <Col lg={5}>
            <div style={{ position: 'sticky', top: '1.5rem' }}>
              <Card className="border-0 shadow-sm rounded-3 bg-white overflow-hidden mb-3">
                {hotel.featured_image && (
                  <div style={{ height: '160px', overflow: 'hidden' }}>
                    <img
                      src={hotel.featured_image}
                      alt={hotel.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <Card.Body className="p-4">
                  <h6 className="fw-bold text-dark mb-1">{hotel.name}</h6>
                  <p className="text-muted small mb-3">{hotel.address}</p>

                  {/* THỜI GIAN LƯU TRÚ */}
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="d-flex justify-content-between text-secondary small mb-1">
                      <span>Nhận phòng:</span>
                      <strong className="text-dark">{checkIn} (14:00)</strong>
                    </div>
                    <div className="d-flex justify-content-between text-secondary small mb-1">
                      <span>Trả phòng:</span>
                      <strong className="text-dark">{checkOut} (12:00)</strong>
                    </div>
                    <div className="d-flex justify-content-between text-secondary small pt-1 border-top">
                      <span>Thời gian:</span>
                      <strong className="text-dark">{nights} đêm, {totalQuantity} phòng</strong>
                    </div>
                  </div>

                  {/* CHI TIẾT TÍNH TIỀN TỪNG LOẠI PHÒNG */}
                  <div className="mb-3">
                    <div className="fw-bold text-dark small text-uppercase mb-2 pb-1 border-bottom">
                      Bảng phân tích chi phí ({selectedRooms.length} loại phòng)
                    </div>

                    <div className="d-flex flex-column gap-2 mb-3">
                      {selectedRooms.map((r, idx) => {
                        const qty = Number(r.quantity) || 1;
                        const price = Number(r.base_price || r.basePrice || r.price_per_night) || 0;
                        const itemTotal = price * qty * nights;
                        return (
                          <div key={r._id || r.id || idx} className="d-flex justify-content-between align-items-start small">
                            <div className="pe-2 text-truncate" style={{ maxWidth: '68%' }}>
                              <div className="fw-medium text-dark text-truncate" title={r.name}>
                                {r.name}
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {formatPrice(price)} × {qty} phòng × {nights} đêm
                              </div>
                            </div>
                            <span className="fw-semibold text-dark text-nowrap">
                              {formatPrice(itemTotal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="d-flex justify-content-between text-secondary small mb-1 pt-2 border-top">
                      <span>Tạm tính tiền phòng:</span>
                      <span className="text-dark fw-semibold">{formatPrice(roomCost)}</span>
                    </div>
                    <div className="d-flex justify-content-between text-secondary small mb-2">
                      <span>Thuế & phí dịch vụ (10%):</span>
                      <span className="text-dark fw-semibold">{formatPrice(serviceFee)}</span>
                    </div>

                    <div className="pt-2 border-top d-flex justify-content-between align-items-center">
                      <div>
                        <span className="fw-bold text-dark d-block">Tổng tiền thanh toán:</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Đã bao gồm thuế & phí</span>
                      </div>
                      <span className="fs-4 fw-bold text-primary">
                        {formatPrice(totalAmount)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePayment}
                    disabled={isSubmitting}
                    className="w-100 py-3 fw-bold rounded-3 shadow-sm border-0 d-flex align-items-center justify-content-center gap-2 mt-2"
                    style={{ backgroundColor: '#005baa', fontSize: '1.05rem' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        Đang chuyển hướng sang VNPAY...
                      </>
                    ) : (
                      'Thanh toán qua VNPAY'
                    )}
                  </Button>

                  <div className="text-center text-muted small mt-2" style={{ fontSize: '0.78rem' }}>
                    Nhấn thanh toán đồng nghĩa bạn đồng ý với Điều khoản đặt phòng của VinaStay.
                  </div>

                  <div className="p-2 bg-warning-subtle text-warning-emphasis border border-warning rounded-2 text-center small mt-2" style={{ fontSize: '0.8rem' }}>
                    <FaClock className="text-danger me-1" />
                    Đơn phòng chỉ được giữ chỗ trong <strong>15 phút</strong>. Sau 15 phút chưa thanh toán, hệ thống sẽ tự động hủy và xóa đơn.
                  </div>

                  {/* CAM KẾT VÀ BẢO MẬT */}
                  <div className="mt-3 pt-3 border-top small text-secondary d-flex flex-column gap-1">
                    <div className="d-flex align-items-center gap-2">
                      <FaCheckCircle className="text-success" size={13} />
                      <span>Xác nhận đặt phòng ngay lập tức</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <FaShieldAlt className="text-primary" size={13} />
                      <span>Giao dịch an toàn & bảo mật VNPAY Sandbox</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <FaInfoCircle className="text-info" size={13} />
                      <span>Hỗ trợ khách hàng 24/7 qua tổng đài</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>

      {/* MODAL THANH TOÁN THẤT BẠI */}
      <Modal show={!!paymentFailedMsg} onHide={closePaymentFailed} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontSize: '17px', fontWeight: 700, color: '#dc3545' }}>
            Thanh toán chưa hoàn tất
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 small">
          <p className="mb-2">{paymentFailedMsg}</p>
          <p className="text-muted mb-3">
            Giao dịch chưa được trừ tiền. Bạn có thể thanh toán lại đơn <strong>{pendingBooking?.bookingCode}</strong> trong vòng 15 phút kể từ lúc đặt.
          </p>
          <div className="text-end border-top pt-3">
            <Button variant="secondary" size="sm" onClick={closePaymentFailed}>
              Đã hiểu
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default BookingPage;
