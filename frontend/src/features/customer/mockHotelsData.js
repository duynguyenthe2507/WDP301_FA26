// Mock data cho danh sách khách sạn và chi tiết khách sạn (Frontend Standalone)

export const MOCK_HOTELS = [
  {
    _id: 'hotel-1',
    name: 'Vinpearl Luxury Nha Trang',
    location: 'Nha Trang',
    address: 'Đảo Hòn Tre, Nha Trang, Khánh Hòa',
    description: 'Tọa lạc biệt lập trên đảo Hòn Tre thơ mộng, Vinpearl Luxury Nha Trang là thiên đường nghỉ dưỡng 5 sao sang trọng bậc nhất với các biệt thự hướng biển tuyệt đẹp, spa trên mặt nước và dịch vụ tiêu chuẩn quốc tế.',
    rating_summary: {
      average_rating: 4.9,
      total_reviews: 328
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80', is_primary: false },
      { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80', is_primary: false },
      { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80', is_primary: false }
    ],
    room_types: [
      {
        _id: 'rt-1-1',
        name: 'Premier Beachfront Villa',
        base_price: 3500000,
        currency: 'VND',
        capacity: { adults: 2, children: 1 },
        total_rooms: 10,
        status: 'AVAILABLE',
        amenities: ['Hồ bơi riêng', 'View biển', 'Bồn tắm nằm', 'Ăn sáng miễn phí', 'Wifi tốc độ cao', 'Minibar'],
        bed: [{ bed_type: 'King Bed', quantity: 1 }],
        room_type_images: [
          { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80', is_primary: false }
        ]
      },
      {
        _id: 'rt-1-2',
        name: 'Grand Ocean View Suite',
        base_price: 2400000,
        currency: 'VND',
        capacity: { adults: 2, children: 2 },
        total_rooms: 8,
        status: 'AVAILABLE',
        amenities: ['Ban công hướng biển', 'Ăn sáng buffet', 'Smart TV', 'Máy pha cafe', 'Áo choàng tắm'],
        bed: [{ bed_type: 'Queen Bed', quantity: 2 }],
        room_type_images: [
          { url: 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800&q=80', is_primary: true }
        ]
      }
    ]
  },
  {
    _id: 'hotel-2',
    name: 'InterContinental Danang Sun Peninsula',
    location: 'Đà Nẵng',
    address: 'Bãi Bắc, Bán đảo Sơn Trà, Đà Nẵng',
    description: 'Khu nghỉ dưỡng kiệt tác được thiết kế bởi kiến trúc sư lừng danh Bill Bensley, tọa lạc giữa núi rừng hoang sơ của bán đảo Sơn Trà và bãi biển riêng tư tuyệt đẹp.',
    rating_summary: {
      average_rating: 4.8,
      total_reviews: 412
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80', is_primary: false },
      { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=80', is_primary: false }
    ],
    room_types: [
      {
        _id: 'rt-2-1',
        name: 'Classic Ocean View Room',
        base_price: 4200000,
        currency: 'VND',
        capacity: { adults: 2, children: 1 },
        total_rooms: 15,
        status: 'AVAILABLE',
        amenities: ['Ban công ngắm biển', 'Bồn sục Jacuzzi', 'Ăn sáng tiêu chuẩn 5 sao', 'Dịch vụ quản gia'],
        bed: [{ bed_type: 'King Bed', quantity: 1 }],
        room_type_images: [
          { url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80', is_primary: true }
        ]
      },
      {
        _id: 'rt-2-2',
        name: 'Heaven Suite Panoramics',
        base_price: 6800000,
        currency: 'VND',
        capacity: { adults: 4, children: 2 },
        total_rooms: 4,
        status: 'AVAILABLE',
        amenities: ['View toàn cảnh 360 độ', 'Hồ bơi vô cực', 'Phòng khách sang trọng', 'Rượu vang chào mừng'],
        bed: [{ bed_type: 'King Bed', quantity: 2 }],
        room_type_images: [
          { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80', is_primary: true }
        ]
      }
    ]
  },
  {
    _id: 'hotel-3',
    name: 'JW Marriott Phu Quoc Emerald Bay',
    location: 'Phú Quốc',
    address: 'Bãi Khem, An Thới, TP. Phú Quốc, Kiên Giang',
    description: 'Khu nghỉ dưỡng mang phong cách học viện cổ điển Lamarck University, với kiến trúc độc đáo, bãi cát trắng mịn Bãi Khem và ẩm thực đỉnh cao.',
    rating_summary: {
      average_rating: 4.9,
      total_reviews: 518
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80', is_primary: false }
    ],
    room_types: [
      {
        _id: 'rt-3-1',
        name: 'Emerald Bay View Room',
        base_price: 3900000,
        currency: 'VND',
        capacity: { adults: 2, children: 1 },
        total_rooms: 12,
        status: 'AVAILABLE',
        amenities: ['Ban công view vịnh', 'Ăn sáng buffet', 'Xe đưa đón sân bay', 'Gym & Spa'],
        bed: [{ bed_type: 'King Bed', quantity: 1 }],
        room_type_images: [
          { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80', is_primary: true }
        ]
      }
    ]
  },
  {
    _id: 'hotel-4',
    name: 'Sofitel Legend Metropole Hanoi',
    location: 'Hà Nội',
    address: '15 Phố Ngô Quyền, Hoàn Kiếm, Hà Nội',
    description: 'Biểu tượng khách sạn di sản cổ kính từ thời Pháp thuộc ngay giữa lòng thủ đô Hà Nội, mang đậm nét lãng mạn và quý phái vượt thời gian.',
    rating_summary: {
      average_rating: 4.7,
      total_reviews: 620
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80', is_primary: false }
    ],
    room_types: [
      {
        _id: 'rt-4-1',
        name: 'Historical Heritage Wing Room',
        base_price: 3100000,
        currency: 'VND',
        capacity: { adults: 2, children: 0 },
        total_rooms: 14,
        status: 'AVAILABLE',
        amenities: ['Nội thất gỗ cổ điển', 'Bồn tắm Pháp', 'Trà chiều miễn phí', 'Wifi cao cấp'],
        bed: [{ bed_type: 'King Bed', quantity: 1 }],
        room_type_images: [
          { url: 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800&q=80', is_primary: true }
        ]
      }
    ]
  },
  {
    _id: 'hotel-5',
    name: 'The Reverie Saigon',
    location: 'TP. Hồ Chí Minh',
    address: '22-36 Nguyễn Huệ, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    description: 'Khách sạn 6 sao đẳng cấp vương giả bậc nhất Sài Gòn trên phố đi bộ Nguyễn Huệ, nơi hội tụ tinh hoa nghệ thuật thủ công Ý và tiện nghi xa hoa.',
    rating_summary: {
      average_rating: 4.9,
      total_reviews: 290
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=80', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80', is_primary: false }
    ],
    room_types: [
      {
        _id: 'rt-5-1',
        name: 'Deluxe Panorama City View',
        base_price: 4800000,
        currency: 'VND',
        capacity: { adults: 2, children: 1 },
        total_rooms: 8,
        status: 'AVAILABLE',
        amenities: ['Tầm nhìn Landmark/Sông Sài Gòn', 'Phòng tắm dát đá cẩm thạch', 'Bữa sáng thượng hạng', 'Hồ bơi vô cực trên cao'],
        bed: [{ bed_type: 'King Bed', quantity: 1 }],
        room_type_images: [
          { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80', is_primary: true }
        ]
      }
    ]
  },
  {
    _id: 'hotel-6',
    name: 'Ana Mandara Villas Dalat Resort & Spa',
    location: 'Đà Lạt',
    address: 'Đường Lê Lai, Phường 5, TP. Đà Lạt, Lâm Đồng',
    description: 'Quần thể dinh thự Pháp cổ kính ẩn mình giữa rừng thông xanh mướt của xứ sở ngàn hoa Đà Lạt, mang lại không gian thư thái và thơ mộng.',
    rating_summary: {
      average_rating: 4.6,
      total_reviews: 215
    },
    images: [
      { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80', is_primary: false }
    ],
    room_types: [
      {
        _id: 'rt-6-1',
        name: 'Villa Studio French Style',
        base_price: 1800000,
        currency: 'VND',
        capacity: { adults: 2, children: 1 },
        total_rooms: 10,
        status: 'AVAILABLE',
        amenities: ['Lò sưởi ấm cúng', 'View vườn hoa & rừng thông', 'Ăn sáng buffet', 'Miễn phí trà & cafe'],
        bed: [{ bed_type: 'Queen Bed', quantity: 1 }],
        room_type_images: [
          { url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80', is_primary: true }
        ]
      }
    ]
  }
];
