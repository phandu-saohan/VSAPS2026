// Default landing page configuration
export interface LandingConfig {
  // Hero Section
  event_name: string;
  event_edition: string;
  event_subtitle: string;
  event_date_display: string;
  event_venue_display: string;
  event_date_iso: string; // for countdown
  event_description: string;
  event_time: string;
  event_venue_address: string;

  // Media & Images
  header_logo_url: string;          // Logo hiển thị trên header
  hero_image_url: string;           // Ảnh nền Hero section
  hero_video_thumb_url: string;     // Ảnh thumbnail video preview
  hero_video_url: string;           // URL video YouTube embed
  speaker_card_images: string[];    // Mảng 5 ảnh diễn giả danh dự
  map_embed_url: string;            // Google Maps embed URL

  // Social & Footer
  social_facebook: string;
  social_youtube: string;
  footer_description: string;

  // Stats
  stats: {
    delegates: string;
    speakers: string;
    international_speakers: string;
    presentations: string;
    companies: string;
    countries: string;
  };

  // Speakers (manual override — can also pull from DB)
  featured_speakers: Array<{
    id: number;
    name: string;
    institution: string;
    specialty: string;
    avatar_url?: string;
  }>;

  // Registration Prices
  registration_prices: Array<{
    id: number;
    name: string;
    price: string;
    desc: string;
    popular?: boolean;
    features: string[];
  }>;

  // Contact
  contact_email: string;
  contact_phone: string;
  contact_office: string;

  // CME hours
  cme_hours: string;

  // Travel
  distance_from_airport: string;

  // Recommended hotels
  recommended_hotels: string;

  // Registration config
  registration_config: {
    enabled: boolean;
    deadline: string;
    attendee_types: Array<{ label: string; fee: number }>;
    cme_fee: number;
    gala_fee: number;
    bank_name: string;
    bank_account: string;
    bank_holder: string;
    transfer_prefix: string;
  };
}

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  event_name: 'VSAPS 2026',
  event_edition: 'Hội nghị Khoa học Quốc tế Thường niên lần thứ 10',
  event_subtitle: 'ĐẠI HỘI LẦN THỨ 3 — HỘI PHẪU THUẬT TẠO HÌNH THẨM MỸ VIỆT NAM',
  event_date_display: '11 – 14 tháng 12, 2026',
  event_venue_display: 'Bệnh viện Quân y 175, TP.HCM',
  event_date_iso: '2026-12-11T08:00:00+07:00',
  event_description:
    'Nhằm tiếp nối hành trình khoa học thường niên đã được duy trì và phát triển suốt hơn 18 năm, Hội Phẫu thuật Thẩm mỹ TP. Hồ Chí Minh phối hợp cùng Bệnh viện Quân y 175 tổ chức Hội nghị khoa học và cấp chứng chỉ Đào tạo Y khoa Liên tục (CME) cho hội viên và đội ngũ bác sĩ phẫu thuật thẩm mỹ toàn quốc; đồng thời tạo diễn đàn giao lưu, chia sẻ kinh nghiệm lâm sàng và công bố các công trình nghiên cứu khoa học.',
  event_time: '08:00 – 17:00, ngày 11–14/12/2026',
  event_venue_address: '786 Nguyễn Kiệm, Phường 3, Quận Gò Vấp, TP. Hồ Chí Minh',

  // Media & Images
  header_logo_url: '/images/logo-vsaps.png',
  hero_image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80',
  hero_video_thumb_url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=900&q=80',
  hero_video_url: '',
  speaker_card_images: [
    '/images/speakers/speaker-1.png',
    '/images/speakers/speaker-2.png',
    '/images/speakers/speaker-3.png',
    '/images/speakers/speaker-4.png',
    '/images/speakers/speaker-5.png',
  ],
  map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.7862892097957!2d106.66237757480784!3d10.833839289310086!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3174de99d5fb23e9%3A0x9c82a9a3f9ab40ed!2zQuG7h25oIHZp4buHbiBRdeG6n24geSAxNzU!5e0!3m2!1svi!2svn!4v1713671234567!5m2!1svi!2svn',

  // Social & Footer
  social_facebook: 'https://facebook.com',
  social_youtube: 'https://youtube.com',
  footer_description: 'Hội Phẫu thuật Tạo hình Thẩm mỹ Việt Nam (VSAPS) là cơ quan chuyên môn hàng đầu về y học thẩm mỹ tại Việt Nam. VSAPS 2026 là diễn đàn quốc tế uy tín cho sự xuất sắc trong khoa học phẫu thuật thẩm mỹ.',

  stats: {
    delegates: '700',
    speakers: '25',
    international_speakers: '10',
    presentations: '30',
    companies: '20',
    countries: '5',
  },

  featured_speakers: [
    { id: 1, name: 'GS. James Miller', institution: 'Trường Y Harvard, USA', specialty: 'Tiên phong trong kỹ thuật tái tạo vi mạch và các mô hình phẫu thuật tái tạo.', avatar_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80' },
    { id: 2, name: 'TS. Elena Rodriguez', institution: 'Đại học Barcelona, TBN', specialty: 'Chuyên gia về da liễu thẩm mỹ không xâm lấn và dược lý laser tiên tiến.', avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80' },
    { id: 3, name: 'GS. Hiroshi Tanaka', institution: 'Đại học Tokyo, Nhật Bản', specialty: 'Chuyên gia tái tạo khuôn mặt độ chính xác cao và vi phẫu hỗ trợ bằng robot.', avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80' },
    { id: 4, name: 'TS. Sofia Lee', institution: 'Seoul Medical Center, Hàn Quốc', specialty: 'Trưởng nhóm nghiên cứu nâng mũi tập trung vào biến thể thẩm mỹ chủng tộc Châu Á.', avatar_url: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80' },
  ],

  registration_prices: [
    {
      id: 1, name: 'Hội viên VSAPS', price: '1.500.000', desc: 'Áp dụng đến 30/09/2026', popular: false,
      features: ['Toàn bộ phiên khoa học', 'Chứng chỉ CME 24 giờ', 'Tài liệu hội nghị digital'],
    },
    {
      id: 2, name: 'Đại biểu Tự do', price: '2.500.000', desc: 'Áp dụng đến 30/09/2026', popular: true,
      features: ['Toàn bộ phiên khoa học', 'Chứng chỉ CME 24 giờ', 'Tài liệu hội nghị digital', 'Vé Gala Dinner'],
    },
    {
      id: 3, name: 'Học viên / SV', price: '800.000', desc: 'Cần xác nhận cơ sở đào tạo', popular: false,
      features: ['Toàn bộ phiên khoa học', 'Chứng nhận tham dự', 'Poster session access'],
    },
  ],

  contact_email: 'hotro@vsaps.vn',
  contact_phone: '+84 (28) 3895 4941',
  contact_office: '786 Nguyễn Kiệm, Phường 3, Quận Gò Vấp, TP.HCM',

  cme_hours: '24',
  distance_from_airport: '5 phút',
  recommended_hotels: 'Tân Sơn Nhất Pavilion và Parkroyal Sài Gòn',

  registration_config: {
    enabled: true,
    deadline: '2026-09-30',
    attendee_types: [
      { label: 'Bác sĩ', fee: 2500000 },
      { label: 'Điều dưỡng / Kỹ thuật viên', fee: 1500000 },
      { label: 'Sinh viên / Học viên', fee: 800000 },
      { label: 'Khách mời', fee: 0 },
    ],
    cme_fee: 200000,
    gala_fee: 800000,
    bank_name: 'Vietcombank',
    bank_account: '1234 5678 9012',
    bank_holder: 'HỘI VSAPS 2026',
    transfer_prefix: 'VSAPS',
  },
};
