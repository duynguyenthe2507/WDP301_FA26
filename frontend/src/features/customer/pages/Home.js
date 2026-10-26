import React, { useState, useEffect } from "react";
import { BLANK_IMG, imgBg, onImgError } from '../imageFallback';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Carousel,
  Spinner,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  FaSwimmingPool,
  FaWifi,
  FaSpa,
  FaConciergeBell,
  FaMapMarkerAlt,
  FaStar,
} from "react-icons/fa";
import { searchHotels } from "../CustomerApi";

const Home = () => {
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lay 3 khach san moi nhat lam noi bat
  useEffect(() => {
    let isMounted = true;

    searchHotels({ limit: 3 })
      .then((res) => {
        if (isMounted && res.data?.hotels) {
          setFeaturedHotels(res.data.hotels);
        }
      })
      .catch((err) => {
        console.error("Loi tai khach san noi bat:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      {/* Hero Section Carousel */}
      <Carousel fade>
        <Carousel.Item style={{ height: "80vh" }}>
          <div
            className="d-flex align-items-center text-center text-light w-100 h-100"
            style={{
              background:
                'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80") no-repeat center center/cover',
            }}
          >
            <Container>
              <h1 className="display-3 fw-bold mb-4">
                Chào mừng đến với VinaStay Hotels
              </h1>
              <p className="lead mb-5 fs-4">
                Trải nghiệm sự sang trọng và thoải mái chưa từng có.
              </p>
              <Button
                as={Link}
                to="/hotels"
                variant="warning"
                size="lg"
                className="px-5 py-3 fw-bold rounded-pill shadow-lg"
              >
                Khám phá phòng
              </Button>
            </Container>
          </div>
        </Carousel.Item>

        <Carousel.Item style={{ height: "80vh" }}>
          <div
            className="d-flex align-items-center text-center text-light w-100 h-100"
            style={{
              background:
                'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80") no-repeat center center/cover',
            }}
          >
            <Container>
              <h1 className="display-3 fw-bold mb-4">
                Dịch vụ đẳng cấp quốc tế
              </h1>
              <p className="lead mb-5 fs-4">
                Nơi mọi nhu cầu của bạn đều được đáp ứng hoàn hảo.
              </p>
              <Button
                as={Link}
                to="/hotels"
                variant="outline-light"
                size="lg"
                className="px-5 py-3 fw-bold rounded-pill shadow-lg border-2"
              >
                Xem chi tiết
              </Button>
            </Container>
          </div>
        </Carousel.Item>

        <Carousel.Item style={{ height: "80vh" }}>
          <div
            className="d-flex align-items-center text-center text-light w-100 h-100"
            style={{
              background:
                'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80") no-repeat center center/cover',
            }}
          >
            <Container>
              <h1 className="display-3 fw-bold mb-4">Nghỉ dưỡng tuyệt vời</h1>
              <p className="lead mb-5 fs-4">
                Đắm chìm trong không gian thư giãn tuyệt đối.
              </p>
              <Button
                as={Link}
                to="/hotels"
                variant="warning"
                size="lg"
                className="px-5 py-3 fw-bold rounded-pill shadow-lg"
              >
                Đặt phòng ngay
              </Button>
            </Container>
          </div>
        </Carousel.Item>
      </Carousel>

      {/* Featured Hotels */}
      <div className="bg-light py-5">
        <Container className="my-5">
          <div className="d-flex justify-content-between align-items-end mb-5">
            <div>
              <h2 className="fw-bold display-5 m-0">Khách sạn Nổi bật</h2>
              <div
                className="mt-3 bg-warning"
                style={{ width: "60px", height: "4px" }}
              ></div>
            </div>
            <Link
              to="/hotels"
              className="text-decoration-none text-dark fw-bold border-bottom border-warning border-2 pb-1"
            >
              Xem tất cả &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="warning" />
              <p className="text-muted mt-2">Đang tải khách sạn nổi bật...</p>
            </div>
          ) : (
            <Row className="g-4">
              {featuredHotels.map((hotel) => {
                const coverImage = hotel.primary_image || BLANK_IMG;
                const formattedPrice = hotel.min_price
                  ? `${hotel.min_price.toLocaleString("vi-VN")}đ / đêm`
                  : "Liên hệ";

                return (
                  <Col lg={4} md={6} key={hotel._id}>
                    <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-lift transition-all">
                      <div className="position-relative">
                        <Card.Img
                          variant="top"
                          src={coverImage}
                          alt={hotel.name}
                          style={{ height: "240px", objectFit: "cover", ...imgBg }}
                          onError={onImgError}
                        />
                        <div className="position-absolute top-0 end-0 m-3 bg-warning text-dark px-3 py-1 fw-bold rounded-pill shadow-sm">
                          {formattedPrice}
                        </div>
                      </div>

                      <Card.Body className="p-4 d-flex flex-column justify-content-between">
                        <div>
                          <Card.Title
                            className="fw-bold fs-5 mb-2 text-truncate"
                            title={hotel.name}
                          >
                            {hotel.name}
                          </Card.Title>

                          {hotel.location && (
                            <p className="text-muted small mb-2 d-flex align-items-center gap-1">
                              <FaMapMarkerAlt className="text-danger flex-shrink-0" />
                              <span className="text-truncate">
                                {hotel.location}
                              </span>
                            </p>
                          )}

                          <Card.Text
                            className="text-secondary small mb-3"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              minHeight: "2.5rem",
                            }}
                          >
                            {hotel.description ||
                              "Khách sạn tiện nghi, dịch vụ tiêu chuẩn cao."}
                          </Card.Text>
                        </div>

                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                          <div className="text-secondary small d-flex align-items-center gap-1">
                            {hotel.rating_summary?.average_rating > 0 ? (
                              <>
                                <FaStar className="text-warning" />
                                <span className="fw-bold text-dark">
                                  {hotel.rating_summary.average_rating}
                                </span>
                                <span>
                                  ({hotel.rating_summary.total_reviews})
                                </span>
                              </>
                            ) : (
                              <span>Mới</span>
                            )}
                          </div>
                          <Button
                            as={Link}
                            to={`/hotels/${hotel._id}`}
                            variant="outline-dark"
                            className="rounded-pill px-3 py-1 fw-semibold btn-sm"
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </Container>
      </div>

      {/* Amenities Section */}
      <Container className="py-5 my-5">
        <div className="text-center mb-5">
          <h2 className="fw-bold display-5">Tiện ích Cao cấp</h2>
          <div
            className="mx-auto mt-3 bg-warning"
            style={{ width: "60px", height: "4px" }}
          ></div>
        </div>
        <Row className="g-4 text-center">
          <Col md={3} sm={6}>
            <div className="p-4 shadow-sm rounded-4 bg-white h-100 hover-lift transition-all">
              <FaSwimmingPool className="display-4 text-warning mb-3" />
              <h5 className="fw-bold">Hồ bơi vô cực</h5>
              <p className="text-muted">
                Thư giãn trong hồ bơi điều nhiệt với tầm nhìn ra thành phố.
              </p>
            </div>
          </Col>
          <Col md={3} sm={6}>
            <div className="p-4 shadow-sm rounded-4 bg-white h-100 hover-lift transition-all">
              <FaSpa className="display-4 text-warning mb-3" />
              <h5 className="fw-bold">Spa sang trọng</h5>
              <p className="text-muted">
                Tái tạo cơ thể và tâm trí tại spa độc quyền của chúng tôi.
              </p>
            </div>
          </Col>
          <Col md={3} sm={6}>
            <div className="p-4 shadow-sm rounded-4 bg-white h-100 hover-lift transition-all">
              <FaWifi className="display-4 text-warning mb-3" />
              <h5 className="fw-bold">Wi-Fi miễn phí</h5>
              <p className="text-muted">
                Giữ kết nối với truy cập internet tốc độ cao mọi nơi.
              </p>
            </div>
          </Col>
          <Col md={3} sm={6}>
            <div className="p-4 shadow-sm rounded-4 bg-white h-100 hover-lift transition-all">
              <FaConciergeBell className="display-4 text-warning mb-3" />
              <h5 className="fw-bold">Lễ tân 24/7</h5>
              <p className="text-muted">
                Đội ngũ nhân viên luôn sẵn sàng hỗ trợ bạn bất cứ lúc nào.
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Home;
