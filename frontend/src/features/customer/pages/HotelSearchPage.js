import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchHotels } from '../customerApi';
import HotelCard from '../components/HotelCard';
import FilterSidebar from '../components/FilterSidebar';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorMessage from '../../../components/ErrorMessage';

const HotelSearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const locationParam = searchParams.get('location') || '';

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchHotels = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 10, ...filters };
        if (locationParam) params.location = locationParam;
        const res = await searchHotels(params);
        setHotels(res.data.hotels || []);
        setPagination({
          page: res.data.page,
          totalPages: res.data.total_pages,
          total: res.data.total
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải danh sách khách sạn. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    },
    [locationParam, filters]
  );

  useEffect(() => {
    fetchHotels(1);
  }, [fetchHotels]);

  const handleSearch = ({ location }) => {
    navigate(`/hotels?location=${encodeURIComponent(location)}`);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page) => {
    fetchHotels(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{ background: '#1a202c', padding: '3rem 0 2.5rem' }}>
        <Container>
          <h1
            className="text-white fw-bold mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Tìm kiếm Khách sạn
          </h1>
          {locationParam && (
            <p className="text-secondary mb-4">
              Kết quả cho:{' '}
              <span style={{ color: '#d4af37', fontWeight: 600 }}>"{locationParam}"</span>
            </p>
          )}
          {!locationParam && (
            <p className="text-secondary mb-4">Khám phá những khách sạn tốt nhất</p>
          )}
          <SearchBar initialLocation={locationParam} onSearch={handleSearch} />
        </Container>
      </div>

      <Container className="py-5">
        <Row>
          {/* Filter sidebar */}
          <Col lg={3} className="mb-4 mb-lg-0">
            <FilterSidebar onFilterChange={handleFilterChange} />
          </Col>

          {/* Results grid */}
          <Col lg={9}>
            {!loading && !error && (
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold m-0" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {pagination.total > 0
                    ? `Tìm thấy ${pagination.total} khách sạn`
                    : 'Không tìm thấy khách sạn phù hợp'}
                </h5>
              </div>
            )}

            {loading && <LoadingSpinner fullPage={false} />}

            {error && (
              <ErrorMessage message={error} onRetry={() => fetchHotels(1)} />
            )}

            {!loading && !error && hotels.length === 0 && (
              <div className="text-center py-5">
                <div
                  style={{
                    fontSize: '4rem',
                    marginBottom: '1rem',
                    opacity: 0.4
                  }}
                >
                  🏖️
                </div>
                <p className="text-muted fs-5 fw-semibold">Không tìm thấy khách sạn phù hợp</p>
                <p className="text-muted small">
                  Hãy thử tìm kiếm với địa điểm khác hoặc điều chỉnh bộ lọc
                </p>
              </div>
            )}

            {!loading && !error && hotels.length > 0 && (
              <>
                <Row className="g-4">
                  {hotels.map((hotel) => (
                    <Col md={6} xl={4} key={hotel._id}>
                      <HotelCard hotel={hotel} />
                    </Col>
                  ))}
                </Row>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HotelSearchPage;
