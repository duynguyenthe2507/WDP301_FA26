import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Badge } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaBed } from 'react-icons/fa';
import { getHotelById, checkAvailability } from '../customerApi';
import ImageGallery from '../components/ImageGallery';
import RoomTypeCard from '../components/RoomTypeCard';
import AvailabilityChecker from '../components/AvailabilityChecker';
import RatingStars from '../components/RatingStars';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorMessage from '../../../components/ErrorMessage';

const HotelDetailsPage = () => {
  const { hotelId } = useParams();

  // Hotel state
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Availability state
  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState('');
  const [selectedDates, setSelectedDates] = useState({ checkIn: '', checkOut: '' });
  const [nights, setNights] = useState(1);

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

  const handleCheckAvailability = async ({ checkIn, checkOut }) => {
    setAvailLoading(true);
    setAvailError('');
    setSelectedDates({ checkIn, checkOut });
    const nightCount = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
    setNights(nightCount);
    try {
      const res = await checkAvailability(hotelId, checkIn, checkOut);
      setAvailability(res.data.room_availability || []);
    } catch (err) {
      setAvailError(err.response?.data?.message || 'Không thể kiểm tra phòng trống.');
    } finally {
      setAvailLoading(false);
    }
  };

  const getAvailabilityForRoom = (roomTypeId) => {
    if (!availability) return undefined;
    return availability.find(
      (a) => a.room_type_id?.toString() === roomTypeId?.toString()
    );
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
      {/* Breadcrumb + header */}
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
          {/* LEFT CONTENT */}
          <Col lg={8}>
            {/* Image gallery */}
            <ImageGallery images={hotel.images || []} />

            {/* Description */}
            {hotel.description && (
              <div className="mt-4 p-4 bg-white rounded-4 shadow-sm border">
                <h4 className="fw-bold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Giới thiệu khách sạn
                </h4>
                <p className="text-secondary lh-lg mb-0">{hotel.description}</p>
              </div>
            )}

            {/* Room types */}
            <div className="mt-4">
              <h4 className="fw-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                <FaBed className="me-2" style={{ color: '#d4af37' }} />
                Loại phòng
              </h4>

              {availability !== null && (
                <p className="text-muted small mb-3">
                  Kết quả phòng trống cho{' '}
                  <strong>{selectedDates.checkIn}</strong> →{' '}
                  <strong>{selectedDates.checkOut}</strong> ({nights} đêm)
                </p>
              )}

              {availError && <ErrorMessage message={availError} />}

              {hotel.room_types?.length > 0 ? (
                hotel.room_types
                  .filter((rt) => rt.status !== 'MAINTENANCE')
                  .map((roomType) => (
                    <RoomTypeCard
                      key={roomType._id}
                      roomType={roomType}
                      availability={getAvailabilityForRoom(roomType._id)}
                      nights={nights}
                    />
                  ))
              ) : (
                <p className="text-muted py-3">
                  Khách sạn này chưa có thông tin phòng.
                </p>
              )}
            </div>
          </Col>

          {/* RIGHT SIDEBAR */}
          <Col lg={4}>
            <AvailabilityChecker
              onCheck={handleCheckAvailability}
              loading={availLoading}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HotelDetailsPage;
