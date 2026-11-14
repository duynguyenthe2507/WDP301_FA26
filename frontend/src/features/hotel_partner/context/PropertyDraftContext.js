import { createContext, useCallback, useContext, useState } from "react";
import { getHotelRegistration } from "../partnerApi";

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

// Dữ liệu đã lưu có thể thiếu trường, các trường thiếu lấy giá trị mặc định
const mergeDraft = (saved) => (saved ? {
  ...initialDraft,
  ...saved,
  location: { ...initialDraft.location, ...saved.location },
  details: { ...initialDraft.details, ...saved.details },
  profile: { ...initialDraft.profile, ...saved.profile },
} : initialDraft);

export const PropertyDraftProvider = ({ children }) => {
  const [draft, setDraft] = useState(initialDraft);
  const [savedStep, setSavedStep] = useState(null);
  // Các bước của wizard đọc draft lúc mở trang nên phải nạp xong trước khi hiển thị
  const loadRegistration = useCallback(async (token) => {
    const { data } = await getHotelRegistration(token);
    setSavedStep(data.step);
    setDraft(mergeDraft(data.draft));
  }, []);
  const updateSection = (section, values) =>
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], ...values },
    }));
  // Giữ termsAccepted để layout wizard không chuyển về trang điều khoản ngay trước khi sang trang trạng thái
  const clearDraft = () => setDraft({ ...initialDraft, termsAccepted: true });
  return (
    <PropertyDraftContext.Provider
      value={{ draft, setDraft, updateSection, clearDraft, savedStep, loadRegistration }}
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
