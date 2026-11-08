import { createContext, useContext, useState } from "react";

const PropertyDraftContext = createContext(null);
const initialDraft = {
  termsAccepted: false,
  location: {
    provinceCity: "",
    district: "",
    address: "",
  },
  amenities: [],
  rooms: [],
  photos: [],
  details: {
    name: "",
    description: "",
    stars: 4,
    cancellation: "",
    checkInTime: "14:00",
    checkOutTime: "12:00",
  },
  profile: {
    business: "",
    address: "",
    postcode: "",
    country: "Việt Nam",
    firstName: "",
    lastName: "",
    nationality: "Việt Nam",
    birthday: "",
    residenceCountry: "Việt Nam",
    region: "",
    city: "",
    language: "Tiếng Việt",
    phoneCountryCode: "+84",
    phone: "",
  },
};

export const PropertyDraftProvider = ({ children }) => {
  const [draft, setDraft] = useState(initialDraft);
  const updateSection = (section, values) =>
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], ...values },
    }));
  // Giữ termsAccepted để layout wizard không chuyển về trang điều khoản ngay trước khi sang trang trạng thái
  const clearDraft = () => setDraft({ ...initialDraft, termsAccepted: true });
  return (
    <PropertyDraftContext.Provider
      value={{ draft, setDraft, updateSection, clearDraft }}
    >
      {children}
    </PropertyDraftContext.Provider>
  );
};

export const usePropertyDraft = () => {
  const context = useContext(PropertyDraftContext);
  if (!context)
    throw new Error(
      "usePropertyDraft must be used within PropertyDraftProvider",
    );
  return context;
};
