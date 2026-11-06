import mongoose from 'mongoose';
import Hotel, { TIME_PATTERN } from "../models/Hotel.js";
import RoomType from '../models/RoomType.js';
import HotelVerification from '../models/HotelVerification.js';
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
    const folder = UPLOAD_FOLDERS[req.query.type];
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
const MAX_ROOM_IMAGES = 10;
const toRoomType = (room) => ({
  name: room.name?.trim(),
  description: room.description?.trim() || "",
  bedType: room.bedType?.trim(),
  roomSize: toNumber(room.roomSize),
  adultCapacity: toNumber(room.adultCapacity),
  childrenCapacity: toNumber(room.childrenCapacity),
  totalRooms: toNumber(room.totalRooms),
  basePrice: toNumber(room.basePrice),
  amenities: stringList(room.amenities),
  images: imageList(room.images),
});
// Khớp ràng buộc của RoomType: tối thiểu 1 người lớn và 1 phòng
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
  room.basePrice >= 0;
const INVALID_ROOM_TYPE_MESSAGE =
  "Mỗi loại phòng cần có tên, loại giường, diện tích, sức chứa (tối thiểu 1 người lớn), số lượng phòng (tối thiểu 1) và giá hợp lệ.";
// Xoá trên Cloudinary các ảnh partner đã bỏ; chỉ xoá ảnh trong thư mục của chính partner, lỗi không chặn việc lưu
const removeDroppedImages = (userId, before, after) => {
  const kept = new Set(after.map((image) => image.publicId));
  const ownFolder = new RegExp(`^vinastay/(hotels|rooms)/${userId}/`);
  before
    .filter((image) => image.publicId && !kept.has(image.publicId) && ownFolder.test(image.publicId))
    .forEach((image) => deleteImage(image.publicId).catch((error) => console.warn('Không xoá được ảnh:', error.message)));
};

export const createHotel = async (req, res, next) => {
  try {
    const {
      location = {},
      amenities,
      rooms = [],
      details = {},
      images,
      profile = {},
    } = req.body;
    const starRating = toNumber(details.stars);
    const name = details.name?.trim();
    const provinceCity = location.provinceCity?.trim();
    const fullAddress = [location.district, location.address]
      .filter(Boolean)
      .map((value) => value.trim())
      .join(", ");

    if (
      !name ||
      !fullAddress ||
      !provinceCity ||
      !Number.isInteger(starRating) ||
      starRating < 1 ||
      starRating > 5
    ) {
      return res.status(400).json({
        message:
          "Tên, địa chỉ, tỉnh/thành phố và hạng sao từ 1 đến 5 là bắt buộc.",
      });
    }
    if (!["one", "three", "none"].includes(details.cancellation)) {
      return res.status(400).json({ message: "Chính sách hủy không hợp lệ." });
    }
    if (
      !TIME_PATTERN.test(details.checkInTime) ||
      !TIME_PATTERN.test(details.checkOutTime)
    ) {
      return res
        .status(400)
        .json({ message: "Giờ nhận phòng và trả phòng không hợp lệ." });
    }

    const existingHotel = await Hotel.exists({ ownerId: req.user._id });
    if (existingHotel) {
      return res
        .status(409)
        .json({ message: "Tài khoản này đã có khách sạn." });
    }

    const roomTypes = rooms.map(toRoomType);

    if (!roomTypes.length || !roomTypes.every(isValidRoomType)) {
      return res.status(400).json({ message: INVALID_ROOM_TYPE_MESSAGE });
    }

    const hotel = await Hotel.create({
      ownerId: req.user._id,
      name,
      provinceCity,
      address: fullAddress,
      description: details.description?.trim() || "",
      starRating,
      cancellationPolicy: details.cancellation,
      checkInTime: details.checkInTime,
      checkOutTime: details.checkOutTime,
      amenities: stringList(amenities),
      images: imageList(images),
      status: 'PENDING',
      legalProfile: {
        businessName: profile.business,
        legalAddress: profile.address,
        postcode: profile.postcode,
        country: profile.country,
        beneficiary: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          nationality: profile.nationality,
          birthday: profile.birthday,
          residenceCountry: profile.residenceCountry,
          region: profile.region,
          city: profile.city,
        },
        contact: {
          language: profile.language,
          countryCode: profile.phoneCountryCode,
          phone: profile.phone,
        },
      },
    });

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

export const createPartnerChangeRequest = async (req, res, next) => {
  try {
    const { hotelId, changes, documents = [] } = req.body;
    if (!hotelId || !Array.isArray(changes) || !changes.length || changes.some((change) => !CHANGE_REQUEST_FIELDS.includes(change.field))) return res.status(400).json({ message: 'Yêu cầu thay đổi không hợp lệ.' });
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
    const { hotelId, bookingId, category, subject, description, attachments = [] } = req.body;
    if (!category || !subject?.trim() || !description?.trim()) return res.status(400).json({ message: 'Danh mục, tiêu đề và nội dung là bắt buộc.' });
    if (hotelId && !await Hotel.exists({ _id: hotelId, ownerId: req.user._id })) return res.status(403).json({ message: 'Bạn chỉ có thể tạo yêu cầu cho khách sạn của mình.' });
    const ticket = await SupportTicket.create({ partnerId: req.user._id, hotelId: hotelId || null, bookingId: bookingId || null, category, subject: subject.trim(), description: description.trim(), attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [] });
    res.status(201).json({ message: 'Đã gửi yêu cầu hỗ trợ.', ticket });
  } catch (error) { next(error); }
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

    const { description, amenities, checkInTime, checkOutTime, cancellationPolicy } = req.body;
    const proposed = {
      name: req.body.name?.trim(),
      provinceCity: req.body.provinceCity?.trim(),
      address: req.body.address?.trim(),
      starRating: toNumber(req.body.starRating),
    };
    if (!proposed.name || !proposed.provinceCity || !proposed.address || !Number.isInteger(proposed.starRating) || proposed.starRating < 1 || proposed.starRating > 5) {
      return res.status(400).json({ message: 'Tên, địa chỉ, tỉnh/thành phố và hạng sao từ 1 đến 5 là bắt buộc.' });
    }
    if (!['one', 'three', 'none'].includes(cancellationPolicy)) return res.status(400).json({ message: 'Chính sách hủy không hợp lệ.' });
    if (!TIME_PATTERN.test(checkInTime) || !TIME_PATTERN.test(checkOutTime)) return res.status(400).json({ message: 'Giờ nhận phòng và trả phòng không hợp lệ.' });
    const images = imageList(req.body.images);
    if (images.length > MAX_HOTEL_IMAGES) return res.status(400).json({ message: `Khách sạn có tối đa ${MAX_HOTEL_IMAGES} ảnh.` });

    const previousImages = hotel.images.map(({ publicId }) => ({ publicId }));
    hotel.set({ ...proposed, description: description?.trim() || '', amenities: stringList(amenities), checkInTime, checkOutTime, cancellationPolicy, images });
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
  if (await isRoomNameTaken(hotelId, room.name, exceptId)) return 'Tên loại phòng đã tồn tại trong khách sạn.';
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


