import Hotel from "../models/Hotel.js";
import HotelVerification from '../models/HotelVerification.js';
import PartnerChangeRequest from '../models/PartnerChangeRequest.js';
import SupportTicket from '../models/SupportTicket.js';

export const pingPartner = (req, res) => {
  res.status(200).json({ message: "Hotel Partner API works!" });
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

    const roomTypes = rooms.map((room) => ({
      name: room.name?.trim(),
      description: room.description,
      bedType: room.bedType,
      roomSize: toNumber(room.roomSize),
      adultCapacity: toNumber(room.adultCapacity),
      childrenCapacity: toNumber(room.childrenCapacity),
      totalRooms: toNumber(room.totalRooms),
      basePrice: toNumber(room.basePrice),
      amenities: stringList(room.amenities),
      images: imageList(room.images),
    }));

    if (
      !roomTypes.length ||
      roomTypes.some(
        (room) =>
          !room.name ||
          !Number.isFinite(room.roomSize) ||
          !Number.isInteger(room.adultCapacity) ||
          !Number.isInteger(room.childrenCapacity) ||
          !Number.isInteger(room.totalRooms) ||
          !Number.isFinite(room.basePrice),
      )
    ) {
      return res.status(400).json({
        message:
          "Mỗi loại phòng cần có tên, diện tích, sức chứa, số lượng phòng và giá hợp lệ.",
      });
    }

    const hotel = await Hotel.create({
      ownerId: req.user._id,
      name,
      provinceCity,
      address: fullAddress,
      description: details.description?.trim() || "",
      starRating,
      cancellationPolicy: details.cancellation,
      amenities: stringList(amenities),
      images: imageList(images),
      roomTypes,
      status: 'PENDING_VERIFICATION',
      verificationStatus: 'PENDING',
      verificationUpdatedAt: new Date(),
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
    const allowedFields = ['name', 'address', 'legalProfile'];
    if (!hotelId || !Array.isArray(changes) || !changes.length || changes.some((change) => !allowedFields.includes(change.field))) return res.status(400).json({ message: 'Yêu cầu thay đổi không hợp lệ.' });
    const hotel = await Hotel.findOne({ _id: hotelId, ownerId: req.user._id, status: 'APPROVED' });
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

export const getMySupportTickets = async (req, res, next) => { try { res.json({ tickets: await SupportTicket.find({ partnerId: req.user._id }).sort({ createdAt: -1 }) }); } catch (error) { next(error); } };


