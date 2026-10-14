import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaCalendarAlt, FaUser, FaPhoneAlt, FaEnvelope, FaBed, FaShieldAlt, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import { createPendingBooking } from '../CustomerApi';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Nhận thông tin đặt phòng từ trang chi tiết hoặc dùng dữ liệu mặc định
  const stateData = location.state || {};
  const hotel = stateData.hotel || {
    _id: 'hotel_01',
    name: 'Khách sạn VinaStay Grand Luxury',
    address: '123 Đường Trần Phú, Phường Lộc Thọ, TP. Nha Trang',
    featured_image:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  };

  const roomType = stateData.roomType || {
    id: 'room_deluxe',
    name: 'Phòng Deluxe Hướng Biển',
    price_per_night: 1500000,
    base_price: 1500000,
  };

  const checkIn =
    stateData.checkIn ||
    new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const checkOut =
    stateData.checkOut ||
    new Date(Date.now() + 172800000).toISOString().split('T')[0];
  const nights = Math.max(
    1,
    Number(stateData.nights) ||
    Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)) ||
    1
  );
  const quantity = Number(stateData.quantity) || 1;

  // Tính toán chi phí
  const pricePerNight = Number(roomType.price_per_night || roomType.base_price) || 1500000;
  const roomCost = pricePerNight * nights * quantity;
  const serviceFee = Math.round(roomCost * 0.1); // 10% thuế & phí
  const totalAmount = roomCost + serviceFee;

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

  // 4. Yêu cầu đặc biệt cho khách sạn (dùng chung cho cả đơn phòng)
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
        bookingDetails: [
          {
            roomTypeId: roomType.id || roomType._id || 'standard',
            roomTypeName: roomType.name,
            quantity,
            pricePerNight,
            totalPrice: roomCost,
          },
        ],
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
        <div className="mb-3">
          <Link
            to={hotel._id ? `/hotels/${hotel._id}` : '/hotels'}
            className="text-decoration-none text-secondary small d-inline-flex align-items-center"
          >
            <FaArrowLeft className="me-1" /> Quay lại thông tin khách sạn
          </Link>
          <h3 className="fw-bold text-dark mt-2 mb-1" style={{ fontSize: '1.65rem' }}>
            Thông tin đặt phòng
          </h3>
          <p className="text-muted small mb-0">
            Vui lòng kiểm tra kỹ thông tin liên hệ và chi tiết phòng trước khi tiến hành thanh toán qua VNPAY.
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
            {/* 1. THÔNG TIN NGƯỜI ĐẶT */}
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

            {/* 2. THÔNG TIN KHÁCH NHẬN PHÒNG */}
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
                    label="Tôi đặt phòng cho người khác"
                    checked={!isSelfGuest}
                    onChange={() => setIsSelfGuest(false)}
                    className="fw-semibold text-dark"
                  />
                </div>

                {!isSelfGuest && (
                  <div className="p-3 bg-light rounded-3 border mt-3">
                    <h6 className="fw-bold text-dark mb-3">
                      Thông tin khách sẽ nhận phòng tại khách sạn
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

            {/* 3. YÊU CẦU ĐẶC BIỆT CHO KHÁCH SẠN (DÙNG CHUNG CẢ ĐƠN PHÒNG) */}
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

            {/* 4. PHƯƠNG THỨC THANH TOÁN VNPAY */}
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
              <Card className="border-0 shadow-sm rounded-3 bg-white overflow-hidden">
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

                  <div className="p-3 bg-light rounded-3 mb-3">
                    <div className="fw-semibold text-dark mb-2 d-flex align-items-center gap-2">
                      <FaBed className="text-primary" /> {roomType.name}
                    </div>
                    <div className="d-flex justify-content-between text-secondary small mb-1">
                      <span>Nhận phòng:</span>
                      <strong className="text-dark">{checkIn} (14:00)</strong>
                    </div>
                    <div className="d-flex justify-content-between text-secondary small mb-1">
                      <span>Trả phòng:</span>
                      <strong className="text-dark">{checkOut} (12:00)</strong>
                    </div>
                    <div className="d-flex justify-content-between text-secondary small">
                      <span>Thời gian:</span>
                      <strong className="text-dark">{nights} đêm, {quantity} phòng</strong>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-2">Chi tiết thanh toán</h6>
                  <div className="d-flex justify-content-between text-secondary small mb-2">
                    <span>Giá phòng ({nights} đêm × {quantity} phòng):</span>
                    <span className="text-dark">{formatPrice(roomCost)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary small mb-3">
                    <span>Thuế & phí dịch vụ (10%):</span>
                    <span className="text-dark">{formatPrice(serviceFee)}</span>
                  </div>

                  <div className="pt-2 border-top d-flex justify-content-between align-items-center mb-4">
                    <span className="fw-bold text-dark">Tổng tiền thanh toán:</span>
                    <span className="fs-4 fw-bold text-primary">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>

                  <Button
                    onClick={handlePayment}
                    disabled={isSubmitting}
                    className="w-100 py-3 fw-bold rounded-3 shadow-sm border-0 d-flex align-items-center justify-content-center gap-2"
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

                  <div className="text-center text-muted small mt-2" style={{ fontSize: '0.8rem' }}>
                    Nhấn thanh toán đồng nghĩa bạn đồng ý với Điều khoản đặt phòng của VinaStay.
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default BookingPage;
