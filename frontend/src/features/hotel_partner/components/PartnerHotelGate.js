import { useContext, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { AuthContext } from "../../../context/AuthContext";
import { getMyHotel } from "../partnerApi";

// Trang "nhà" của partner theo trạng thái khách sạn
const homeFor = (hotel) => {
  if (!hotel) return "/partner/terms";                 // chưa có khách sạn → wizard
  if (hotel.status === "APPROVED") return "/partner";  // đã duyệt → dashboard
  return "/partner/registration-status";               // chờ duyệt / bị từ chối / tạm khóa
};

// allow: "wizard" | "status" | "approved"
const PartnerHotelGate = ({ allow }) => {
  const { token } = useContext(AuthContext);
  const [state, setState] = useState({ loading: true, hotel: null, verification: null });

  useEffect(() => {
    getMyHotel(token)
      .then((res) => setState({ loading: false, ...res.data }))
      .catch(() => setState({ loading: false, hotel: null, verification: null }));
  }, [token]);

  if (state.loading) return <div className="text-center p-5"><Spinner /></div>;

  const { hotel } = state;
  const allowed =
    (allow === "wizard" && !hotel) ||
    (allow === "status" && !!hotel) ||
    (allow === "approved" && hotel?.status === "APPROVED");

  if (!allowed) return <Navigate to={homeFor(hotel)} replace />;
  // Truyền dữ liệu xuống trang con để trang trạng thái khỏi gọi API lần nữa
  return <Outlet context={state} />;
};

export default PartnerHotelGate;