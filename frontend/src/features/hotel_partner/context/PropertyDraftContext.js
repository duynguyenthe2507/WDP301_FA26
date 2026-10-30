import { createContext, useContext, useState } from "react";

const PropertyDraftContext = createContext(null);
const blankRoom = () => ({
  name: "",
  description: "",
  bedType: "",
  roomSize: "0",
  adultCapacity: 0,
  childrenCapacity: 0,
  totalRooms: 1,
  basePrice: "2000000",
  amenities: [],
  images: [],
});
const initialDraft = {
  location: {
    country: "",
    provinceCity: "",
    district: "",
    address: "",
    zipCode: "",
  },
  amenities: [],
  rooms: [blankRoom()],
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
    country: "",
    firstName: "",
    lastName: "",
    nationality: "",
    birthday: "",
    residenceCountry: "",
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
  const clearDraft = () => setDraft(initialDraft);
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
