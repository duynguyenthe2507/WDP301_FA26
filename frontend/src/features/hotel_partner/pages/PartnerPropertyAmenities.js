import { useState } from "react";
import {
  FaCarSide,
  FaConciergeBell,
  FaDumbbell,
  FaPaw,
  FaSmokingBan,
  FaSnowflake,
  FaSpa,
  FaSwimmingPool,
  FaUtensils,
  FaWifi,
} from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";

const amenities = [
  ["Bể bơi", FaSwimmingPool],
  ["Bãi đỗ xe", FaCarSide],
  ["Spa", FaSpa],
  ["Không hút thuốc", FaSmokingBan],
  ["Wi-Fi miễn phí", FaWifi],
  ["Được phép đưa thú nuôi vào", FaPaw],
  ["Phòng tập", FaDumbbell],
  ["Bàn tiếp tân 24 giờ", FaConciergeBell],
  ["Máy điều hòa", FaSnowflake],
  ["Nhà hàng", FaUtensils],
];

const PartnerPropertyAmenities = () => {
  const { draft, setDraft } = usePropertyDraft();
  const [selectedAmenities, setSelectedAmenities] = useState(draft.amenities);
  const toggle = (name) =>
    setSelectedAmenities((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );

  return (
    <PropertySetupLayout
      step={1}
      title="Tiện nghi"
      previous="/partner/property-location"
      next="/partner/property-rooms"
      beforeNext={() =>
        setDraft((current) => ({ ...current, amenities: selectedAmenities }))
      }
    >
      <h2 className="h6 fw-semibold">Những điều khách yêu thích</h2>
      <p className="text-muted">Chọn các tiện nghi có tại khách sạn.</p>
      <div className="row g-2">
        {amenities.map(([name, Icon]) => {
          const selected = selectedAmenities.includes(name);
          return (
            <div className="col-6 col-md-4" key={name}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(name)}
                className="w-100 text-start rounded-3 p-3"
                style={{
                  background: "#fff",
                  border: `1px solid ${selected ? "#0d6efd" : "#ced4da"}`,
                  color: selected ? "#0d6efd" : "#212529",
                  fontSize: 12,
                  height: 82,
                }}
              >
                <Icon size={17} className="d-block mb-2" />
                <span>{name}</span>
              </button>
            </div>
          );
        })}
      </div>
    </PropertySetupLayout>
  );
};

export default PartnerPropertyAmenities;
