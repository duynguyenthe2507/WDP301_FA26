import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Badge } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaBed } from 'react-icons/fa';
import { getHotelById, checkAvailability } from '../CustomerApi';
import ImageGallery from '../components/ImageGallery';
import RoomTypeCard from '../components/RoomTypeCard';
import BookingSummaryCard from '../components/BookingSummaryCard';
import RatingStars from '../components/RatingStars';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorMessage from '../../../components/ErrorMessage';

// Helper xử lý ngày chuẩn giờ địa phương (tránh lỗi lệch ngày do múi giờ UTC)
const getLocalDateString = (d = new Date()) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateStr, days = 1) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
};

const calculateNights = (checkInStr, checkOutStr) => {
  if (!checkInStr || !checkOutStr) return 1;
  const [y1, m1, d1] = checkInStr.split('-').map(Number);
  const [y2, m2, d2] = checkOutStr.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diff = Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
};

const HotelDetailsPage = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();

  const today = getLocalDateString(new Date());

  // Hotel state
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Date state
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDays(today, 1));
  const minCheckOut = addDays(checkIn, 1);
  const nights = calculateNights(checkIn, checkOut);

  // Availability & Room Quantities state
  const [availability, setAvailability] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [roomQuantities, setRoomQuantities] = useState({});

  // 1. Tải thông tin khách sạn
  useEffect(() => {
    if (!hotelId) return;
    const fetchHotel = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getHotelById(hotelId);
        setHotel(res.data.hotel);
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Không tìm thấy khách sạn này.');
        } else {
          setError(err.response?.data?.message || 'Không thể tải thông tin khách sạn.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHotel();
  }, [hotelId]);

  // 2. Tải và đồng bộ tình trạng phòng trống khi ngày checkIn/checkOut thay đổi
  useEffect(() => {
    if (!hotelId || !checkIn || !checkOut || checkOut <= checkIn) return;

    let isMounted = true;
    setAvailLoading(true);
    setAvailError('');

    checkAvailability(hotelId, checkIn, checkOut)
      .then((res) => {
        if (!isMounted) return;
        const roomAvail = res.data?.room_availability || [];
        setAvailability(roomAvail);

        // Kiểm tra và tự động điều chỉnh số lượng nếu vượt quá tồn kho mới
        setRoomQuantities((prev) => {
          let adjusted = false;
          const next = { ...prev };

          roomAvail.forEach((item) => {
            const rtId = item.room_type_id?.toString();
            if (next[rtId] && next[rtId] > item.available_rooms) {
              next[rtId] = Math.max(0, item.available_rooms);
              adjusted = true;
            }
          });

          if (adjusted) {
            setWarningMessage(
              'Số lượng một số loại phòng đã được điều chỉnh do số phòng trống thay đổi theo ngày mới.'
            );
          }
          return next;
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setAvailError(err.response?.data?.message || 'Không thể kiểm tra phòng trống.');
      })
      .finally(() => {
        if (isMounted) setAvailLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [hotelId, checkIn, checkOut]);

  // Thay đổi ngày nhận phòng (Tự động cập nhật ngày trả phòng nếu ngày trả <= ngày nhận)
  const handleCheckInChange = (newCheckIn) => {
    setCheckIn(newCheckIn);
    setWarningMessage('');
    if (newCheckIn >= checkOut) {
      setCheckOut(addDays(newCheckIn, 1));
    }
  };

  // Thay đổi ngày trả phòng
  const handleCheckOutChange = (newCheckOut) => {
    setCheckOut(newCheckOut);
    setWarningMessage('');
  };

  // Thay đổi số lượng phòng cho một loại phòng cụ thể
  const handleQuantityChange = useCallback((roomTypeId, newQty) => {
    setRoomQuantities((prev) => {
      const next = { ...prev };
      if (newQty <= 0) {
        delete next[roomTypeId];
      } else {
        next[roomTypeId] = newQty;
      }
      return next;
    });
    setWarningMessage('');
  }, []);

  // Tìm thông tin phòng trống theo ID loại phòng
  const getAvailabilityForRoom = (roomTypeId) => {
    return availability.find(
      (a) => a.room_type_id?.toString() === roomTypeId?.toString()
    );
  };

  // 3. TÍNH TOÁN TẬP TRUNG (Single Source of Truth)
  const selectedRoomsList = (hotel?.room_types || [])
    .filter((rt) => (roomQuantities[rt._id] || 0) > 0)
    .map((rt) => ({
      ...rt,
      quantity: roomQuantities[rt._id],
    }));

  const totalRooms = selectedRoomsList.reduce((sum, item) => sum + item.quantity, 0);
  const roomCost = selectedRoomsList.reduce(
    (sum, item) => sum + item.base_price * item.quantity * nights,
    0
  );
  const serviceFee = Math.round(roomCost * 0.1); // 10% thuế & phí
  const totalAmount = roomCost + serviceFee;

  // 4. Xử lý chuyển sang trang Đặt phòng
  const handleSubmitBooking = () => {
    if (totalRooms <= 0) {
      alert('Vui lòng chọn số lượng phòng bạn muốn đặt.');
      return;
    }
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      alert('Khoảng thời gian nhận phòng và trả phòng không hợp lệ.');
      return;
    }

    const bookingDetails = selectedRoomsList.map((item) => ({
      roomTypeId: item._id,
      roomTypeName: item.name,
      quantity: item.quantity,
      pricePerNight: item.base_price,
      totalPrice: item.base_price * item.quantity * nights,
    }));

    navigate('/booking', {
      state: {
        hotel,
        roomType: selectedRoomsList[0], // Giữ tương thích ngược
        quantity: totalRooms,
        selectedRooms: selectedRoomsList,
        bookingDetails,
        checkIn,
        checkOut,
        nights,
        roomCost,
        serviceFee,
        totalAmount,
      },
    });
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <Container className="py-5">
        <ErrorMessage message={error} />
        <div className="text-center mt-3">
          <Link to="/hotels" style={{ color: '#d4af37' }}>
            ← Quay lại danh sách khách sạn
          </Link>
        </div>
      </Container>
    );
  }

  if (!hotel) return null;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Header & Breadcrumb */}
      <div style={{ background: '#1a202c', padding: '2rem 0' }}>
        <Container>
          <div className="d-flex align-items-center small mb-2">
            <Link to="/hotels" style={{ color: '#d4af37', textDecoration: 'none' }}>
              Khách sạn
            </Link>
            <span className="mx-2 text-secondary">/</span>
            <span className="text-white">{hotel.name}</span>
          </div>
          <h1
            className="text-white fw-bold mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            {hotel.name}
          </h1>
          <div className="d-flex align-items-center flex-wrap gap-3">
            <span className="text-muted d-flex align-items-center">
              <FaMapMarkerAlt className="me-1" style={{ color: '#d4af37' }} />
              {hotel.address}
            </span>
            {hotel.rating_summary && (
              <RatingStars
                rating={hotel.rating_summary.average_rating}
                count={hotel.rating_summary.total_reviews}
              />
            )}
            <Badge
              style={{ background: '#d4af37' }}
              className="px-3 py-1 rounded-pill"
            >
              {hotel.location}
            </Badge>
          </div>
        </Container>
      </div>

      <Container className="mt-4">
        <Row className="gy-4">
          {/* CỘT TRÁI: ẢNH, MÔ TẢ & DANH SÁCH LOẠI PHÒNG */}
          <Col lg={7} xl={8}>
            {/* Gallery ảnh */}
            <ImageGallery images={hotel.images || []} />

            {/* Giới thiệu */}
            {hotel.description && (
              <div className="mt-4 p-4 bg-white rounded-4 shadow-sm border">
                <h4 className="fw-bold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Giới thiệu khách sạn
                </h4>
                <p className="text-secondary lh-lg mb-0">{hotel.description}</p>
              </div>
            )}

            {/* Danh sách loại phòng */}
            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold mb-0" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <FaBed className="me-2" style={{ color: '#d4af37' }} />
                  Loại phòng
                </h4>
                <small className="text-muted">
                  Thời gian: <strong>{nights} đêm</strong> ({checkIn} → {checkOut})
                </small>
              </div>

              {availError && <ErrorMessage message={availError} />}

              {hotel.room_types?.length > 0 ? (
                hotel.room_types
                  .filter((rt) => rt.status !== 'MAINTENANCE' && !rt.isDeleted)
                  .map((roomType) => (
                    <RoomTypeCard
                      key={roomType._id}
                      roomType={roomType}
                      availability={getAvailabilityForRoom(roomType._id)}
                      nights={nights}
                      quantity={roomQuantities[roomType._id] || 0}
                      onQuantityChange={handleQuantityChange}
                    />
                  ))
              ) : (
                <p className="text-muted py-3">Khách sạn này chưa có thông tin phòng.</p>
              )}
            </div>
          </Col>

          {/* CỘT PHẢI: CARD THÔNG TIN ĐẶT PHÒNG */}
          <Col lg={5} xl={4}>
            <BookingSummaryCard
              checkIn={checkIn}
              checkOut={checkOut}
              today={today}
              minCheckOut={minCheckOut}
              nights={nights}
              onCheckInChange={handleCheckInChange}
              onCheckOutChange={handleCheckOutChange}
              selectedRoomsList={selectedRoomsList}
              totalRooms={totalRooms}
              roomCost={roomCost}
              serviceFee={serviceFee}
              totalAmount={totalAmount}
              availLoading={availLoading}
              warningMessage={warningMessage}
              onSubmitBooking={handleSubmitBooking}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HotelDetailsPage;
