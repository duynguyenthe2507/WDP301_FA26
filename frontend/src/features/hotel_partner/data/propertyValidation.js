// Quy tắc của từng bước trong wizard đăng ký, khớp createHotel ở backend. Mỗi hàm trả về { tênTrường: thôngBáoLỗi }
const isBlank = (value) => !String(value ?? "").trim();
const toNumber = (value) => (isBlank(value) ? NaN : Number(value));
const isIntegerFrom = (value, min) => Number.isInteger(toNumber(value)) && toNumber(value) >= min;
const missingFields = (form, rules) => Object.fromEntries(Object.entries(rules).filter(([field]) => isBlank(form[field])));

export const hasErrors = (errors) => Object.keys(errors).length > 0;

export const MAX_HOTEL_NAME = 50;
export const MAX_HOTEL_IMAGES = 20;
export const MAX_ROOM_IMAGES = 10;

export const validateLocation = (form) => missingFields(form, {
  provinceCity: "Vui lòng nhập tỉnh/thành phố.",
  district: "Vui lòng nhập quận/huyện.",
  address: "Vui lòng nhập địa chỉ cụ thể.",
});

const validateRoom = (room, index, rooms) => {
  const errors = missingFields(room, {
    name: "Vui lòng chọn tên loại phòng.",
    bedType: "Vui lòng chọn loại giường.",
  });
  const name = room.name.trim().toLocaleLowerCase("vi");
  if (name && rooms.some((other, otherIndex) => otherIndex !== index && other.name.trim().toLocaleLowerCase("vi") === name)) {
    errors.name = "Tên loại phòng không được trùng nhau.";
  }
  if (!(toNumber(room.roomSize) > 0)) errors.roomSize = "Diện tích phải lớn hơn 0.";
  if (!isIntegerFrom(room.adultCapacity, 1)) errors.adultCapacity = "Tối thiểu 1 người lớn, nhập số nguyên.";
  if (!isIntegerFrom(room.childrenCapacity, 0)) errors.childrenCapacity = "Nhập số nguyên từ 0 trở lên.";
  if (!isIntegerFrom(room.totalRooms, 1)) errors.totalRooms = "Tối thiểu 1 phòng, nhập số nguyên.";
  if (!(toNumber(room.basePrice) > 0)) errors.basePrice = "Giá phải lớn hơn 0.";
  return errors;
};
export const validateRooms = (rooms) => rooms.map(validateRoom);

export const validatePhotos = (photos) => (photos.length ? {} : { photos: "Vui lòng tải lên ít nhất 1 ảnh khách sạn." });

export const validateDetails = (form) => {
  const errors = missingFields(form, {
    name: "Vui lòng nhập tên cơ sở lưu trú.",
    checkInTime: "Vui lòng chọn giờ nhận phòng.",
    checkOutTime: "Vui lòng chọn giờ trả phòng.",
    cancellation: "Vui lòng chọn chính sách hủy.",
  });
  if (form.name.trim().length > MAX_HOTEL_NAME) errors.name = `Tên tối đa ${MAX_HOTEL_NAME} ký tự.`;
  if (!isIntegerFrom(form.stars, 1) || Number(form.stars) > 5) errors.stars = "Vui lòng chọn hạng sao từ 1 đến 5.";
  return errors;
};

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const isValidPhone = (countryCode, phone) => {
  const digits = phone.replace(/[\s.-]/g, "");
  return countryCode === "+84" ? /^0?[35789]\d{8}$/.test(digits) : /^\d{6,14}$/.test(digits);
};

export const validateProfile = (form) => {
  const errors = missingFields(form, {
    business: "Vui lòng nhập tên pháp lý.",
    address: "Vui lòng nhập địa chỉ.",
    country: "Vui lòng chọn quốc gia.",
    firstName: "Vui lòng nhập tên.",
    lastName: "Vui lòng nhập họ.",
    nationality: "Vui lòng chọn quốc tịch.",
    birthday: "Vui lòng nhập ngày sinh.",
    residenceCountry: "Vui lòng chọn quốc gia.",
    region: "Vui lòng chọn bang/tỉnh.",
    city: "Vui lòng chọn thành phố.",
    language: "Vui lòng chọn ngôn ngữ.",
    phoneCountryCode: "Vui lòng chọn mã quốc gia.",
    phone: "Vui lòng nhập số điện thoại.",
  });
  if (!errors.birthday && form.birthday >= localDate()) errors.birthday = "Ngày sinh phải trước hôm nay.";
  if (!errors.phone && !isValidPhone(form.phoneCountryCode, form.phone)) errors.phone = "Số điện thoại không hợp lệ.";
  return errors;
};
