import mongoose from 'mongoose';
import Hotel, { TIME_PATTERN } from "../models/Hotel.js";
import RoomType from '../models/RoomType.js';
import HotelVerification from '../models/HotelVerification.js';
import HotelRegistrationDraft from '../models/HotelRegistrationDraft.js';
import PartnerChangeRequest, { CHANGE_REQUEST_FIELDS } from '../models/PartnerChangeRequest.js';
import SupportTicket from '../models/SupportTicket.js';
import Booking from '../models/Booking.js';
import BookingDetail from '../models/BookingDetail.js';
import { deleteImage, uploadImageBuffer } from '../config/cloudinary.js';

export const pingPartner = (req, res) => {
  res.status(200).json({ message: "Hotel Partner API works!" });
};

// Thư mục Cloudinary theo loại ảnh; ảnh của mỗi partner nằm riêng một thư mục con
const UPLOAD_FOLDERS = { hotel: 'hotels', room: 'rooms' };

export const uploadPartnerImages = async (req, res, next) => {
  try {
    const folder = Object.hasOwn(UPLOAD_FOLDERS, req.query.type || '') ? UPLOAD_FOLDERS[req.query.type] : null;
    if (!folder) return res.status(400).json({ message: 'Loại ảnh không hợp lệ (hotel hoặc room).' });
    if (!req.files?.length) return res.status(400).json({ message: 'Vui lòng chọn ít nhất một ảnh.' });
    const images = await Promise.all(
      req.files.map((file) => uploadImageBuffer(file.buffer, `vinastay/${folder}/${req.user._id}`)),
    );
    res.status(201).json({ images });
  } catch (error) { next(error); }
};
const toNumber = (value) =>
  value === "" || value === null || value === undefined ? NaN : Number(value);
const text = (value) => (typeof value === "string" ? value.trim() : "");
const stringList = (value) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim())
    : typeof value === "string"
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
const imageList = (value) =>
  (Array.isArray(value) ? value : [])
    .map((image) => (typeof image === "string" ? { url: image } : image))
    .filter(
      (image) =>
        typeof image?.url === "string" && /^https?:\/\//i.test(image.url),
    )
    .map((image, index) => ({
      url: image.url,
      publicId: image.publicId,
      isCover: index === 0,
    }));
const MAX_HOTEL_IMAGES = 20;
const MAX_HOTEL_NAME = 50;
const MAX_TICKET_SUBJECT = 160;
const MAX_TICKET_DESCRIPTION = 4000;
const MAX_TICKET_ATTACHMENTS = 5;
const MAX_ROOM_IMAGES = 10;
const toRoomType = (room) => ({
  name: text(room.name),
  description: text(room.description),
  bedType: text(room.bedType),
  roomSize: toNumber(room.roomSize),
  adultCapacity: toNumber(room.adultCapacity),
  childrenCapacity: toNumber(room.childrenCapacity),
  totalRooms: toNumber(room.totalRooms),
  basePrice: toNumber(room.basePrice),
  amenities: stringList(room.amenities),
  images: imageList(room.images),
});
// Tối thiểu 1 người lớn, 1 phòng và giá lớn hơn 0 (BR-41, BR-43)
const isValidRoomType = (room) =>
  room.name &&
  room.bedType &&
  room.roomSize > 0 &&
  Number.isInteger(room.adultCapacity) &&
  room.adultCapacity >= 1 &&
  Number.isInteger(room.childrenCapacity) &&
  room.childrenCapacity >= 0 &&
  Number.isInteger(room.totalRooms) &&
  room.totalRooms >= 1 &&
  room.basePrice > 0;
const INVALID_ROOM_TYPE_MESSAGE =
  "Mỗi loại phòng cần có tên, loại giường, diện tích, sức chứa (tối thiểu 1 người lớn), số lượng phòng (tối thiểu 1) và giá lớn hơn 0.";
// Xoá trên Cloudinary các ảnh partner đã bỏ; chỉ xoá ảnh trong thư mục của chính partner, lỗi không chặn việc lưu
const removeDroppedImages = (userId, before, after) => {
  const kept = new Set(after.map((image) => image.publicId));
  const ownFolder = new RegExp(`^vinastay/(hotels|rooms)/${userId}/`);
  before
    .filter((image) => image.publicId && !kept.has(image.publicId) && ownFolder.test(image.publicId))
    .forEach((image) => deleteImage(image.publicId).catch((error) => console.warn('Không xoá được ảnh:', error.message)));
};

// Các quy tắc đăng ký khách sạn theo màn Register Hotel và BR-66, BR-68 trong SRS
// Khớp HOTEL_AMENITIES ở frontend
const HOTEL_AMENITIES = ["Bể bơi", "Bãi đỗ xe", "Spa", "Không hút thuốc", "Wi-Fi miễn phí", "Được phép đưa thú nuôi vào", "Phòng tập", "Bàn tiếp tân 24 giờ", "Máy điều hòa", "Nhà hàng"];
const DUPLICATE_HOTEL_MESSAGE = "Khách sạn này đã được đăng ký. Vui lòng liên hệ hỗ trợ nếu bạn là chủ sở hữu.";
const section = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});
const firstMissing = (rules) => rules.find(([value]) => !value)?.[1];

// Ngày dạng YYYY-MM-DD, có thật và trước hôm nay
const isPastDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value < new Date().toISOString().slice(0, 10);
};
const isValidPhone = (countryCode, phone) => {
  const digits = phone.replace(/[\s.-]/g, "");
  return countryCode === "+84" ? /^0?[35789]\d{8}$/.test(digits) : /^\d{6,14}$/.test(digits);
};

const toLegalProfile = (profile) => ({
  businessName: text(profile.business),
  legalAddress: text(profile.address),
  postcode: text(profile.postcode),
  country: text(profile.country),
  beneficiary: {
    firstName: text(profile.firstName),
    lastName: text(profile.lastName),
    nationality: text(profile.nationality),
    birthday: text(profile.birthday),
    residenceCountry: text(profile.residenceCountry),
    region: text(profile.region),
    city: text(profile.city),
  },
  contact: {
    language: text(profile.language),
    countryCode: text(profile.phoneCountryCode),
    phone: text(profile.phone),
  },
});

const legalProfileError = ({ businessName, legalAddress, country, beneficiary, contact }) => {
  const missing = firstMissing([
    [businessName, "Vui lòng nhập tên pháp lý của cơ sở lưu trú."],
    [legalAddress, "Vui lòng nhập địa chỉ pháp lý."],
    [country, "Vui lòng chọn quốc gia của địa chỉ pháp lý."],
    [beneficiary.firstName, "Vui lòng nhập tên người chủ hưởng lợi."],
    [beneficiary.lastName, "Vui lòng nhập họ người chủ hưởng lợi."],
    [beneficiary.nationality, "Vui lòng chọn quốc tịch."],
    [beneficiary.birthday, "Vui lòng nhập ngày sinh."],
    [beneficiary.residenceCountry, "Vui lòng chọn quốc gia cư trú."],
    [beneficiary.region, "Vui lòng chọn bang/tỉnh cư trú."],
    [beneficiary.city, "Vui lòng chọn thành phố cư trú."],
    [contact.language, "Vui lòng chọn ngôn ngữ liên hệ."],
    [contact.countryCode, "Vui lòng chọn mã quốc gia."],
    [contact.phone, "Vui lòng nhập số điện thoại."],
  ]);
  if (missing) return missing;
  if (!isPastDate(beneficiary.birthday)) return "Ngày sinh không hợp lệ.";
  if (!isValidPhone(contact.countryCode, contact.phone)) return "Số điện thoại không hợp lệ.";
  return null;
};

const registrationRoomsError = (roomTypes) => {
  if (!roomTypes.length) return "Vui lòng thêm ít nhất một loại phòng.";
  const invalidIndex = roomTypes.findIndex((room) => !isValidRoomType(room));
  if (invalidIndex !== -1) return `Loại phòng ${invalidIndex + 1} chưa hợp lệ. ${INVALID_ROOM_TYPE_MESSAGE}`;
  if (roomTypes.some((room) => room.images.length > MAX_ROOM_IMAGES)) return `Mỗi loại phòng có tối đa ${MAX_ROOM_IMAGES} ảnh.`;
  const names = roomTypes.map((room) => room.name.toLocaleLowerCase("vi"));
  if (new Set(names).size !== names.length) return "Tên loại phòng không được trùng nhau.";
  return null;
};

// Đọc và kiểm tra dữ liệu của wizard; dùng chung cho đăng ký mới và gửi lại hồ sơ
const readRegistration = (body) => {
  const location = section(body.location);
  const details = section(body.details);
  const legalProfile = toLegalProfile(section(body.profile));
  const amenities = stringList(body.amenities);
  const images = imageList(body.images);
  const roomTypes = (Array.isArray(body.rooms) ? body.rooms : []).map((room) => toRoomType(section(room)));
  const starRating = toNumber(details.stars);
  const name = text(details.name);
  const provinceCity = text(location.provinceCity);
  const address = [text(location.district), text(location.address)].join(", ");
  const checkInTime = text(details.checkInTime);
  const checkOutTime = text(details.checkOutTime);

  const fail = (error) => ({ error });
  if (body.termsAccepted !== true) return fail("Vui lòng đồng ý với Điều khoản và Điều kiện.");
  const missingLocation = firstMissing([
    [provinceCity, "Vui lòng nhập tỉnh/thành phố."],
    [text(location.district), "Vui lòng nhập quận/huyện."],
    [text(location.address), "Vui lòng nhập địa chỉ cụ thể."],
  ]);
  if (missingLocation) return fail(missingLocation);
  if (amenities.some((item) => !HOTEL_AMENITIES.includes(item))) return fail("Tiện nghi khách sạn không hợp lệ.");
  const roomsError = registrationRoomsError(roomTypes);
  if (roomsError) return fail(roomsError);
  if (!images.length || images.length > MAX_HOTEL_IMAGES) return fail(`Khách sạn cần từ 1 đến ${MAX_HOTEL_IMAGES} ảnh.`);
  if (!name || name.length > MAX_HOTEL_NAME) return fail(`Tên khách sạn là bắt buộc, tối đa ${MAX_HOTEL_NAME} ký tự.`);
  if (!Number.isInteger(starRating) || starRating < 1 || starRating > 5) return fail("Hạng sao phải từ 1 đến 5.");
  if (!["one", "three", "none"].includes(details.cancellation)) return fail("Chính sách hủy không hợp lệ.");
  if (!TIME_PATTERN.test(checkInTime) || !TIME_PATTERN.test(checkOutTime)) return fail("Giờ nhận phòng và trả phòng không hợp lệ.");
  const profileError = legalProfileError(legalProfile);
  if (profileError) return fail(profileError);

  return {
    roomTypes,
    fields: { name, provinceCity, address, description: text(details.description), starRating, cancellationPolicy: details.cancellation, checkInTime, checkOutTime, amenities, images, legalProfile },
  };
};

// Khách sạn đã bị từ chối không còn được xem là đã đăng ký
const isDuplicateHotel = ({ name, provinceCity, address }, exceptId) =>
  Hotel.exists({ name, provinceCity, address, status: { $ne: "REJECTED" }, ...(exceptId && { _id: { $ne: exceptId } }) })
    .collation({ locale: "vi", strength: 2 });

export const createHotel = async (req, res, next) => {
  try {
    const { error: invalid, fields, roomTypes } = readRegistration(req.body);
    if (invalid) return res.status(400).json({ message: invalid });

    const existingHotel = await Hotel.exists({ ownerId: req.user._id });
    if (existingHotel) {
      return res
        .status(409)
        .json({ message: "Tài khoản này đã có khách sạn." });
    }
    if (await isDuplicateHotel(fields)) return res.status(409).json({ message: DUPLICATE_HOTEL_MESSAGE });

    const hotel = await Hotel.create({ ownerId: req.user._id, ...fields, status: 'PENDING' });

    // Loại phòng nằm ở collection riêng; nếu lưu lỗi thì xoá khách sạn vừa tạo để không bị mồ côi
    try {
      await RoomType.insertMany(roomTypes.map((room) => ({ ...room, hotelId: hotel._id })));
    } catch (error) {
      await Hotel.deleteOne({ _id: hotel._id });
      throw error;
    }

    await HotelVerification.create({
      hotelId: hotel._id,
      partnerId: req.user._id,
      documents: Array.isArray(req.body.documents) ? req.body.documents : [],
      history: [{ action: 'SUBMITTED', note: 'Partner submitted hotel registration.' }],
    });
    await HotelRegistrationDraft.deleteOne({ ownerId: req.user._id });

    return res
      .status(201)
      .json({ message: "Tạo khách sạn thành công.", hotel });
  } catch (error) {
    if (error.name === "ValidationError")
      return res.status(400).json({ message: error.message });
    if (error.code === 11000)
      return res
        .status(409)
        .json({ message: "Tài khoản này đã có khách sạn." });
    return next(error);
  }
};

const REGISTRATION_STEPS = ['location', 'amenities', 'rooms', 'photos', 'details', 'profile', 'publish'].map((step) => `/partner/property-${step}`);
const DRAFT_SECTIONS = ['termsAccepted', 'location', 'amenities', 'rooms', 'photos', 'details', 'profile'];
const CANNOT_EDIT_REGISTRATION = 'Hồ sơ hiện không ở trạng thái được chỉnh sửa hoặc gửi lại.';

// Chưa có khách sạn thì đăng ký mới; hồ sơ bị từ chối hoặc được yêu cầu bổ sung thì được sửa và gửi lại
const findRegistrationState = async (userId) => {
  const hotel = await Hotel.findOne({ ownerId: userId });
  if (!hotel) return { canEdit: true, hotel: null, verification: null };
  const verification = await HotelVerification.findOne({ hotelId: hotel._id }).sort({ createdAt: -1, _id: -1 });
  const canEdit = (hotel.status === 'REJECTED' && verification?.status === 'REJECTED')
    || (hotel.status === 'PENDING' && verification?.status === 'ADDITIONAL_INFO_REQUIRED');
  return { canEdit, hotel, verification };
};

// Đổi khách sạn đã nộp về đúng dạng dữ liệu của wizard; địa chỉ đang lưu là "Quận/Huyện, Địa chỉ"
const toRegistrationForm = (hotel, rooms) => {
  const separator = hotel.address.indexOf(', ');
  const { beneficiary = {}, contact = {}, ...legal } = hotel.legalProfile || {};
  return {
    termsAccepted: false,
    location: {
      provinceCity: hotel.provinceCity,
      district: separator === -1 ? '' : hotel.address.slice(0, separator),
      address: separator === -1 ? hotel.address : hotel.address.slice(separator + 2),
    },
    amenities: hotel.amenities,
    rooms: rooms.map(({ name, description, bedType, roomSize, adultCapacity, childrenCapacity, totalRooms, basePrice, amenities, images }) => ({
      name, description, bedType, roomSize, adultCapacity, childrenCapacity, totalRooms, basePrice, amenities, images: images.map(({ url, publicId }) => ({ url, publicId })),
    })),
    photos: hotel.images.map(({ url, publicId }) => ({ url, publicId })),
    details: { name: hotel.name, description: hotel.description, stars: hotel.starRating, cancellation: hotel.cancellationPolicy, checkInTime: hotel.checkInTime, checkOutTime: hotel.checkOutTime },
    profile: {
      business: legal.businessName, address: legal.legalAddress, postcode: legal.postcode, country: legal.country,
      firstName: beneficiary.firstName, lastName: beneficiary.lastName, nationality: beneficiary.nationality, birthday: beneficiary.birthday,
      residenceCountry: beneficiary.residenceCountry, region: beneficiary.region, city: beneficiary.city,
      language: contact.language, phoneCountryCode: contact.countryCode, phone: contact.phone,
    },
  };
};

// Bản nháp đã lưu được ưu tiên; hồ sơ gửi lại chưa có nháp thì lấy từ dữ liệu đã nộp
export const getHotelRegistration = async (req, res, next) => {
  try {
    const { canEdit, hotel } = await findRegistrationState(req.user._id);
    if (!canEdit) return res.status(409).json({ message: CANNOT_EDIT_REGISTRATION });
    const mode = hotel ? 'resubmit' : 'create';
    const saved = await HotelRegistrationDraft.findOne({ ownerId: req.user._id }).lean();
    if (saved) return res.json({ mode, draft: saved.data, step: saved.step });
    if (!hotel) return res.json({ mode, draft: null, step: null });
    const rooms = await RoomType.find({ hotelId: hotel._id, isDeleted: false }).sort({ createdAt: 1 }).lean();
    res.json({ mode, draft: toRegistrationForm(hotel.toObject(), rooms), step: null });
  } catch (error) { next(error); }
};

// Lưu và thoát: chỉ lưu tạm nên chưa kiểm tra dữ liệu bắt buộc (BR-68)
export const saveHotelRegistrationDraft = async (req, res, next) => {
  try {
    const { draft, step } = req.body;
    if (!draft || typeof draft !== 'object' || Array.isArray(draft) || !REGISTRATION_STEPS.includes(step)) return res.status(400).json({ message: 'Dữ liệu bản nháp không hợp lệ.' });
    const { canEdit } = await findRegistrationState(req.user._id);
    if (!canEdit) return res.status(409).json({ message: CANNOT_EDIT_REGISTRATION });
    const data = Object.fromEntries(DRAFT_SECTIONS.filter((key) => key in draft).map((key) => [key, draft[key]]));
    await HotelRegistrationDraft.updateOne({ ownerId: req.user._id }, { $set: { data, step } }, { upsert: true });
    res.json({ message: 'Đã lưu bản nháp.' });
  } catch (error) { next(error); }
};

// Gửi lại hồ sơ trên chính khách sạn đã nộp; mỗi tài khoản vẫn chỉ có một khách sạn
export const resubmitHotelRegistration = async (req, res, next) => {
  try {
    const { canEdit, hotel, verification } = await findRegistrationState(req.user._id);
    if (!hotel || !canEdit) return res.status(409).json({ message: CANNOT_EDIT_REGISTRATION });
    const { error: invalid, fields, roomTypes } = readRegistration(req.body);
    if (invalid) return res.status(400).json({ message: invalid });
    if (await isDuplicateHotel(fields, hotel._id)) return res.status(409).json({ message: DUPLICATE_HOTEL_MESSAGE });

    const oldRooms = await RoomType.find({ hotelId: hotel._id }).lean();
    const previous = Object.fromEntries(['status', ...Object.keys(fields)].map((key) => [key, hotel.get(key)]));
    // Cập nhật có điều kiện để bấm gửi hai lần không tạo hai hồ sơ
    const updated = await Hotel.findOneAndUpdate(
      { _id: hotel._id, status: hotel.status, updatedAt: hotel.updatedAt },
      { $set: { ...fields, status: 'PENDING' } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updated) return res.status(409).json({ message: CANNOT_EDIT_REGISTRATION });

    let newRooms = [];
    try {
      newRooms = await RoomType.insertMany(roomTypes.map((room) => ({ ...room, hotelId: hotel._id })));
      if (verification.status === 'REJECTED') {
        // Hồ sơ đã từ chối là quyết định cuối nên giữ nguyên làm lịch sử và tạo hồ sơ mới để duyệt lại
        await HotelVerification.create({ hotelId: hotel._id, partnerId: req.user._id, documents: verification.documents, history: [{ action: 'RESUBMITTED', note: 'Partner resubmitted after rejection.' }] });
      } else {
        verification.set({ status: 'PENDING', reviewNote: '', reviewedBy: null, reviewedAt: null });
        verification.history.push({ action: 'RESUBMITTED', note: 'Partner updated the requested information.' });
        await verification.save();
      }
    } catch (error) {
      await RoomType.deleteMany({ _id: { $in: newRooms.map((room) => room._id) } });
      await Hotel.updateOne({ _id: hotel._id }, { $set: previous });
      throw error;
    }

    await RoomType.deleteMany({ _id: { $in: oldRooms.map((room) => room._id) } });
    await HotelRegistrationDraft.deleteOne({ ownerId: req.user._id });
    const imagesOf = (hotelImages, rooms) => [...hotelImages, ...rooms.flatMap((room) => room.images)];
    removeDroppedImages(req.user._id, imagesOf(hotel.images, oldRooms), imagesOf(fields.images, roomTypes));
    res.json({ message: 'Đã gửi lại hồ sơ đăng ký.', hotel: updated });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    next(error);
  }
};

export const createPartnerChangeRequest = async (req, res, next) => {
  try {
    const { hotelId, changes, documents = [] } = req.body;
    if (!mongoose.isValidObjectId(hotelId) || !Array.isArray(changes) || !changes.length || changes.some((change) => !CHANGE_REQUEST_FIELDS.includes(change?.field))) return res.status(400).json({ message: 'Yêu cầu thay đổi không hợp lệ.' });
    const hotel = await Hotel.findOne({ _id: hotelId, ownerId: req.user._id, status: 'ACTIVE' });
    if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn đã được phê duyệt của bạn.' });
    const pending = await PartnerChangeRequest.exists({ hotelId, status: { $in: ['PENDING', 'ADDITIONAL_INFO_REQUIRED'] } });
    if (pending) return res.status(409).json({ message: 'Khách sạn đang có yêu cầu thay đổi nhạy cảm chờ xử lý.' });
    const request = await PartnerChangeRequest.create({ hotelId, partnerId: req.user._id, changes: changes.map((change) => ({ field: change.field, currentValue: hotel[change.field], proposedValue: change.proposedValue })), documents: Array.isArray(documents) ? documents.slice(0, 5) : [] });
    res.status(201).json({ message: 'Đã gửi yêu cầu thay đổi để quản lý vận hành phê duyệt.', request });
  } catch (error) { next(error); }
};

export const createSupportTicket = async (req, res, next) => {
  try {
    const { hotelId, bookingId, category, attachments = [] } = req.body;
    const subject = text(req.body.subject);
    const description = text(req.body.description);
    if (!category || !subject || !description) return res.status(400).json({ message: 'Danh mục, tiêu đề và nội dung là bắt buộc.' });
    if (!SupportTicket.schema.path('category').enumValues.includes(category)) return res.status(400).json({ message: 'Danh mục không hợp lệ.' });
    if (subject.length > MAX_TICKET_SUBJECT) return res.status(400).json({ message: `Tiêu đề tối đa ${MAX_TICKET_SUBJECT} ký tự.` });
    if (description.length > MAX_TICKET_DESCRIPTION) return res.status(400).json({ message: `Nội dung tối đa ${MAX_TICKET_DESCRIPTION} ký tự.` });
    if (!Array.isArray(attachments) || attachments.length > MAX_TICKET_ATTACHMENTS) return res.status(400).json({ message: `Tối đa ${MAX_TICKET_ATTACHMENTS} tệp đính kèm.` });
    // Chỉ được gắn khách sạn và đặt phòng của chính partner (BR-60)
    const ownedHotelIds = await Hotel.distinct('_id', { ownerId: req.user._id });
    if (hotelId && !(mongoose.isValidObjectId(hotelId) && ownedHotelIds.some((id) => id.equals(hotelId)))) return res.status(403).json({ message: 'Bạn chỉ có thể tạo yêu cầu cho khách sạn của mình.' });
    if (bookingId && !(mongoose.isValidObjectId(bookingId) && await Booking.exists({ _id: bookingId, hotelId: { $in: ownedHotelIds } }))) return res.status(403).json({ message: 'Bạn chỉ có thể tạo yêu cầu cho đặt phòng của khách sạn mình.' });
    const ticket = await SupportTicket.create({ partnerId: req.user._id, hotelId: hotelId || null, bookingId: bookingId || null, category, subject, description, attachments });
    res.status(201).json({ message: 'Đã gửi yêu cầu hỗ trợ.', ticket });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    next(error);
  }
};

export const getMyHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findOne({ ownerId: req.user._id })
      .select('name address provinceCity status createdAt');
    if (!hotel) return res.json({ hotel: null, verification: null });

    // Hồ sơ mới nhất (khi gửi lại sẽ có nhiều bản ghi)
    const verification = await HotelVerification.findOne({ hotelId: hotel._id })
      .sort({ createdAt: -1 })
      .select('status reviewNote reviewedAt createdAt');
    res.json({ hotel, verification });
  } catch (error) { next(error); }
};

// Dữ liệu đầy đủ cho màn quản lý thông tin khách sạn; chỉ khách sạn đã duyệt của chính partner
export const getMyHotelDetail = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    res.json({ hotel });
  } catch (error) { next(error); }
};

// Khách sạn tự quyết và tự chịu trách nhiệm về thông tin của mình: mọi trường trên form lưu thẳng, không cần duyệt
export const updateMyHotel = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);

    const { amenities, cancellationPolicy } = req.body;
    const description = text(req.body.description);
    const checkInTime = text(req.body.checkInTime);
    const checkOutTime = text(req.body.checkOutTime);
    const proposed = {
      name: text(req.body.name),
      provinceCity: text(req.body.provinceCity),
      address: text(req.body.address),
      starRating: toNumber(req.body.starRating),
    };
    if (!proposed.name || !proposed.provinceCity || !proposed.address || !Number.isInteger(proposed.starRating) || proposed.starRating < 1 || proposed.starRating > 5) {
      return res.status(400).json({ message: 'Tên, địa chỉ, tỉnh/thành phố và hạng sao từ 1 đến 5 là bắt buộc.' });
    }
    if (proposed.name.length > MAX_HOTEL_NAME) return res.status(400).json({ message: `Tên khách sạn tối đa ${MAX_HOTEL_NAME} ký tự.` });
    if (!description) return res.status(400).json({ message: 'Vui lòng nhập mô tả khách sạn.' });
    if (!['one', 'three', 'none'].includes(cancellationPolicy)) return res.status(400).json({ message: 'Chính sách hủy không hợp lệ.' });
    if (!TIME_PATTERN.test(checkInTime) || !TIME_PATTERN.test(checkOutTime)) return res.status(400).json({ message: 'Giờ nhận phòng và trả phòng không hợp lệ.' });
    const images = imageList(req.body.images);
    if (!images.length || images.length > MAX_HOTEL_IMAGES) return res.status(400).json({ message: `Khách sạn cần từ 1 đến ${MAX_HOTEL_IMAGES} ảnh.` });

    const previousImages = hotel.images.map(({ publicId }) => ({ publicId }));
    hotel.set({ ...proposed, description, amenities: stringList(amenities), checkInTime, checkOutTime, cancellationPolicy, images });
    await hotel.save();
    removeDroppedImages(req.user._id, previousImages, images);

    // Yêu cầu thay đổi cũ còn chờ duyệt (từ trước khi bỏ bước duyệt) được hủy để khi quản lý vận hành duyệt
    // sau này không ghi đè lên thông tin partner vừa tự sửa
    await PartnerChangeRequest.updateMany(
      { hotelId: hotel._id, status: { $in: ['PENDING', 'ADDITIONAL_INFO_REQUIRED'] } },
      { $set: { status: 'CANCELLED', decisionNote: 'Đối tác đã tự cập nhật thông tin khách sạn.' } },
    );
    res.json({ message: 'Đã lưu thay đổi thông tin khách sạn.', hotel });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    next(error);
  }
};

export const findApprovedHotel = (userId) => Hotel.findOne({ ownerId: userId, status: 'ACTIVE' });
export const notApproved = (res) =>
  res.status(403).json({ message: 'Khách sạn chưa được duyệt hoặc không thuộc tài khoản này.' });

// Danh sách loại phòng (bỏ các loại đã xoá mềm) kèm thông tin ngắn của khách sạn
export const getRoomTypes = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const roomTypes = await RoomType.find({ hotelId: hotel._id, isDeleted: false }).sort({ createdAt: 1 });
    res.json({
      hotel: { _id: hotel._id, name: hotel.name, provinceCity: hotel.provinceCity, address: hotel.address, status: hotel.status },
      roomTypes,
    });
  } catch (error) { next(error); }
};

const findOwnedRoomType = (hotelId, id) =>
  mongoose.isValidObjectId(id) ? RoomType.findOne({ _id: id, hotelId, isDeleted: false }) : null;
const roomTypeNotFound = (res) => res.status(404).json({ message: 'Không tìm thấy loại phòng.' });

export const getRoomType = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const roomType = await findOwnedRoomType(hotel._id, req.params.id);
    if (!roomType) return roomTypeNotFound(res);
    res.json({ roomType });
  } catch (error) { next(error); }
};

// Tên loại phòng là duy nhất trong khách sạn, không phân biệt hoa thường
const isRoomNameTaken = (hotelId, name, exceptId) =>
  RoomType.exists({ hotelId, name, isDeleted: false, ...(exceptId && { _id: { $ne: exceptId } }) }).collation({ locale: 'vi', strength: 2 });

// Trả về thông báo lỗi nếu dữ liệu loại phòng không lưu được
const roomTypeFormError = async (hotelId, room, exceptId) => {
  if (!isValidRoomType(room)) return INVALID_ROOM_TYPE_MESSAGE;
  if (!room.images.length || room.images.length > MAX_ROOM_IMAGES) return `Mỗi loại phòng cần từ 1 đến ${MAX_ROOM_IMAGES} ảnh.`;
  if (await isRoomNameTaken(hotelId, room.name, exceptId)) return 'Tên loại phòng đã tồn tại.'; // MSG09
  return null;
};

// Các đơn chưa trả phòng đang giữ loại phòng này; cùng điều kiện với kiểm tra phòng trống khi khách đặt
const upcomingBookings = async (roomTypeId) => {
  const details = await BookingDetail.find({ roomTypeId }).select('bookingId quantity');
  if (!details.length) return [];
  const bookings = await Booking.find({
    _id: { $in: details.map((detail) => detail.bookingId) },
    checkOutDate: { $gt: new Date() },
    bookingStatus: { $ne: 'CANCELLED' },
    paymentStatus: { $ne: 'FAILED' },
    $or: [
      { bookingStatus: 'CONFIRMED' },
      { paymentStatus: 'PAID' },
      { bookingStatus: 'PENDING_PAYMENT', createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } },
    ],
  }).select('checkInDate checkOutDate');
  return bookings.map((booking) => ({
    checkIn: booking.checkInDate.getTime(),
    checkOut: booking.checkOutDate.getTime(),
    quantity: details.filter((detail) => detail.bookingId.equals(booking._id)).reduce((sum, detail) => sum + detail.quantity, 0),
  }));
};

// Số phòng bị giữ nhiều nhất tại cùng một thời điểm (trả phòng được tính trước nhận phòng nếu trùng giờ)
const peakBookedRooms = (bookings) => {
  const events = bookings.flatMap(({ checkIn, checkOut, quantity }) => [{ at: checkIn, delta: quantity }, { at: checkOut, delta: -quantity }]);
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
  let current = 0;
  let peak = 0;
  events.forEach(({ delta }) => { current += delta; peak = Math.max(peak, current); });
  return peak;
};

export const createRoomType = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const room = toRoomType(req.body);
    const formError = await roomTypeFormError(hotel._id, room);
    if (formError) return res.status(400).json({ message: formError });
    const roomType = await RoomType.create({ ...room, hotelId: hotel._id });
    res.status(201).json({ message: 'Đã thêm loại phòng.', roomType });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    next(error);
  }
};

// Giá của đơn đã đặt nằm trong BookingDetail nên thay đổi chỉ áp dụng cho đơn mới
export const updateRoomType = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const roomType = await findOwnedRoomType(hotel._id, req.params.id);
    if (!roomType) return roomTypeNotFound(res);
    const room = toRoomType(req.body);
    const formError = await roomTypeFormError(hotel._id, room, roomType._id);
    if (formError) return res.status(400).json({ message: formError });
    if (room.totalRooms < roomType.totalRooms) {
      const peak = peakBookedRooms(await upcomingBookings(roomType._id));
      if (room.totalRooms < peak) return res.status(409).json({ message: `Không thể giảm xuống ${room.totalRooms} phòng vì đang có ${peak} phòng được đặt cùng lúc trong thời gian tới.` });
    }
    const previousImages = roomType.images.map(({ publicId }) => ({ publicId }));
    roomType.set(room);
    await roomType.save();
    removeDroppedImages(req.user._id, previousImages, room.images);
    res.json({ message: 'Đã lưu loại phòng.', roomType });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    next(error);
  }
};

// Ngừng bán chỉ chặn đơn mới, các đơn đã đặt vẫn giữ nguyên
export const updateRoomTypeStatus = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    const roomType = await findOwnedRoomType(hotel._id, req.params.id);
    if (!roomType) return roomTypeNotFound(res);
    if (req.body.status === 'ACTIVE' && !(roomType.basePrice > 0 && roomType.totalRooms >= 1)) return res.status(400).json({ message: 'Loại phòng cần có giá lớn hơn 0 và ít nhất 1 phòng trước khi mở bán.' });
    roomType.status = req.body.status;
    await roomType.save();
    res.json({ roomType });
  } catch (error) { next(error); }
};

// Xoá mềm để lịch sử đặt phòng vẫn tham chiếu được; giữ nguyên ảnh vì lý do đó
export const deleteRoomType = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const roomType = await findOwnedRoomType(hotel._id, req.params.id);
    if (!roomType) return roomTypeNotFound(res);
    if ((await upcomingBookings(roomType._id)).length) return res.status(409).json({ message: 'Loại phòng đang có đơn đặt chưa hoàn tất, hãy chọn Ngừng bán thay vì xóa.' });
    roomType.isDeleted = true;
    await roomType.save();
    res.json({ message: 'Đã xóa loại phòng.' });
  } catch (error) { next(error); }
};

export const getMySupportTickets = async (req, res, next) => { try { res.json({ tickets: await SupportTicket.find({ partnerId: req.user._id }).sort({ createdAt: -1 }) }); } catch (error) { next(error); } };


