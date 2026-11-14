import { useContext, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { AuthContext } from "../../../context/AuthContext";
import { usePropertyDraft } from "../context/PropertyDraftContext";
import { getMyHotel } from "../partnerApi";

const canUseWizard = ({ hotel, canResubmit }) => !hotel || canResubmit;

// Trang "nhà" của partner theo trạng thái khách sạn
const homeFor = (hotel) => {
  if (!hotel) return "/partner/terms";                 // chưa có khách sạn → wizard
  if (hotel.status === "ACTIVE") return "/partner";  // đã duyệt → dashboard
  return "/partner/registration-status";               // chờ duyệt / bị từ chối / tạm khóa
};

// allow: "wizard" | "status" | "approved"
const PartnerHotelGate = ({ allow }) => {
  const { token } = useContext(AuthContext);
  const { loadRegistration } = usePropertyDraft();
  const [state, setState] = useState({ loading: true, hotel: null, verification: null });

  useEffect(() => {
    let active = true;
    getMyHotel(token)
      .then(async (res) => {
        if (allow === "wizard" && canUseWizard(res.data)) await loadRegistration(token);
        if (active) setState({ loading: false, ...res.data });
      })
      .catch(() => { if (active) setState({ loading: false, hotel: null, verification: null }); });
    return () => { active = false; };
  }, [token, allow, loadRegistration]);

  if (state.loading) return <div className="text-center p-5"><Spinner /></div>;

  const { hotel } = state;
  const allowed =
    (allow === "wizard" && canUseWizard(state)) ||
    (allow === "status" && !!hotel) ||
    (allow === "approved" && hotel?.status === "ACTIVE");

  if (!allowed) return <Navigate to={homeFor(hotel)} replace />;
  // Truyền dữ liệu xuống trang con để trang trạng thái khỏi gọi API lần nữa
  return <Outlet context={state} />;
};

export default PartnerHotelGate;