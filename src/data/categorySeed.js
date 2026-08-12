/**
 * Category Seed Data for SteedMarket Marketplace
 * Includes complete taxonomy for:
 * 1) Equipment & Supplies (مستلزمات الخيل)
 * 2) Rider Apparel & Gear (مستلزمات الفارس)
 * 3) Equestrian Services (الخدمات)
 */

export const CATEGORY_SEED = [
  // ── 1. HORSE EQUIPMENT & SUPPLIES (مستلزمات الخيل) ──────────────────────────
  {
    slug: 'tack-saddlery',
    module: 'equipment',
    name_ar: 'معدات الركوب والتحكم',
    name_en: 'Tack & Saddlery',
    icon_name: 'shield-outline',
    display_order: 1,
    children: [
      { slug: 'saddles', module: 'equipment', name_ar: 'السروج', name_en: 'Saddles', icon_name: 'layers-outline', display_order: 1 },
      { slug: 'bridles-reins', module: 'equipment', name_ar: 'اللجام والعنان', name_en: 'Bridles & Reins', icon_name: 'link-outline', display_order: 2 },
      { slug: 'halters-lead-ropes', module: 'equipment', name_ar: 'الرشمة والمقود', name_en: 'Halters & Lead Ropes', icon_name: 'git-commit-outline', display_order: 3 },
      { slug: 'saddle-pads-girths', module: 'equipment', name_ar: 'مستلزمات السرج', name_en: 'Saddle Pads & Accessories', icon_name: 'square-outline', display_order: 4 },
      { slug: 'bits', module: 'equipment', name_ar: 'الشكايم', name_en: 'Bits', icon_name: 'hardware-chip-outline', display_order: 5 },
    ],
  },
  {
    slug: 'grooming-care',
    module: 'equipment',
    name_ar: 'أدوات العناية والنظافة',
    name_en: 'Grooming & Care',
    icon_name: 'sparkles-outline',
    display_order: 2,
    children: [
      { slug: 'brushes-combs', module: 'equipment', name_ar: 'الفرش والأمشاط', name_en: 'Brushes & Combs', icon_name: 'grid-outline', display_order: 1 },
      { slug: 'hoof-care', module: 'equipment', name_ar: 'العناية بالحوافر', name_en: 'Hoof Care', icon_name: 'fitness-outline', display_order: 2 },
      { slug: 'bathing-supplies', module: 'equipment', name_ar: 'الاستحمام', name_en: 'Bathing & Shampoos', icon_name: 'water-outline', display_order: 3 },
      { slug: 'hair-coat-care', module: 'equipment', name_ar: 'العناية بالشعر والبشرة', name_en: 'Hair & Coat Detanglers', icon_name: 'color-palette-outline', display_order: 4 },
    ],
  },
  {
    slug: 'wear-protection',
    module: 'equipment',
    name_ar: 'معدات الحماية والأغطية',
    name_en: 'Horse Wear & Protection',
    icon_name: 'shirt-outline',
    display_order: 3,
    children: [
      { slug: 'leg-boots-wraps', module: 'equipment', name_ar: 'واقيات الأرجل', name_en: 'Leg Boots & Wraps', icon_name: 'bandage-outline', display_order: 1 },
      { slug: 'horse-blankets-sheets', module: 'equipment', name_ar: 'أغطية الخيل (البطانيات)', name_en: 'Blankets & Sheets', icon_name: 'bed-outline', display_order: 2 },
      { slug: 'fly-protection', module: 'equipment', name_ar: 'الحماية من الحشرات', name_en: 'Fly Masks & Nets', icon_name: 'bug-outline', display_order: 3 },
    ],
  },
  {
    slug: 'supplements-health',
    module: 'equipment',
    name_ar: 'المكملات الغذائية والصحة',
    name_en: 'Supplements & Health',
    icon_name: 'medkit-outline',
    display_order: 4,
    children: [
      { slug: 'nutritional-supplements', module: 'equipment', name_ar: 'المكملات والفيتامينات', name_en: 'Vitamins & Minerals', icon_name: 'nutrition-outline', display_order: 1 },
      { slug: 'first-aid-care', module: 'equipment', name_ar: 'الإسعافات الأولية', name_en: 'First Aid & Medical', icon_name: 'medical-outline', display_order: 2 },
      { slug: 'insect-repellents', module: 'equipment', name_ar: 'طارد الحشرات', name_en: 'Insect Repellents', icon_name: 'leaf-outline', display_order: 3 },
    ],
  },
  {
    slug: 'stable-feeding',
    module: 'equipment',
    name_ar: 'مستلزمات الإسطبل والتغذية',
    name_en: 'Stable & Feeding Equipment',
    icon_name: 'home-outline',
    display_order: 5,
    children: [
      { slug: 'feeders-buckets', module: 'equipment', name_ar: 'أدوات التغذية والمشارب', name_en: 'Feeders & Buckets', icon_name: 'basket-outline', display_order: 1 },
      { slug: 'cleaning-tools', module: 'equipment', name_ar: 'أدوات تنظيف الإسطبل', name_en: 'Cleaning Forks & Tools', icon_name: 'build-outline', display_order: 2 },
      { slug: 'stable-toys', module: 'equipment', name_ar: 'معدات التسلية للأكشاك', name_en: 'Stable Toys', icon_name: 'game-controller-outline', display_order: 3 },
    ],
  },

  // ── 2. RIDER APPAREL & GEAR (مستلزمات الفارس) ──────────────────────────────
  {
    slug: 'riding-apparel',
    module: 'rider_gear',
    name_ar: 'ملابس الركوب',
    name_en: 'Riding Apparel',
    icon_name: 'shirt-outline',
    display_order: 1,
    children: [
      { slug: 'breeches-tights', module: 'rider_gear', name_ar: 'بناطيل الركوب', name_en: 'Breeches & Tights', icon_name: 'body-outline', display_order: 1 },
      { slug: 'riding-shirts', module: 'rider_gear', name_ar: 'قمصان الركوب والتدريب', name_en: 'Riding Shirts & Polos', icon_name: 'shirt-outline', display_order: 2 },
      { slug: 'show-apparel', module: 'rider_gear', name_ar: 'ملابس البطولات والعروض', name_en: 'Show Jackets & Shirts', icon_name: 'ribbon-outline', display_order: 3 },
      { slug: 'riding-gloves', module: 'rider_gear', name_ar: 'قفازات الركوب', name_en: 'Riding Gloves', icon_name: 'hand-left-outline', display_order: 4 },
    ],
  },
  {
    slug: 'equestrian-footwear',
    module: 'rider_gear',
    name_ar: 'أحذية الركوب',
    name_en: 'Equestrian Footwear',
    icon_name: 'footsteps-outline',
    display_order: 2,
    children: [
      { slug: 'tall-boots', module: 'rider_gear', name_ar: 'الأحذية الطويلة', name_en: 'Tall Riding Boots', icon_name: 'arrow-up-outline', display_order: 1 },
      { slug: 'paddock-boots', module: 'rider_gear', name_ar: 'الأحذية القصيرة', name_en: 'Paddock / Short Boots', icon_name: 'ellipsis-horizontal-outline', display_order: 2 },
      { slug: 'half-chaps', module: 'rider_gear', name_ar: 'واقيات الساق (الشابس)', name_en: 'Half Chaps', icon_name: 'shield-half-outline', display_order: 3 },
    ],
  },
  {
    slug: 'safety-gear',
    module: 'rider_gear',
    name_ar: 'معدات الأمن والسلامة',
    name_en: 'Safety Gear',
    icon_name: 'shield-checkmark-outline',
    display_order: 3,
    children: [
      { slug: 'helmets', module: 'rider_gear', name_ar: 'خوذات الركوب', name_en: 'Riding Helmets', icon_name: 'disc-outline', display_order: 1 },
      { slug: 'body-protectors-vests', module: 'rider_gear', name_ar: 'صدريات الحماية والسترات الهوائية', name_en: 'Body Protectors & Air Vests', icon_name: 'shield-outline', display_order: 2 },
    ],
  },
  {
    slug: 'rider-accessories',
    module: 'rider_gear',
    name_ar: 'الإكسسوارات والمعدات الشخصية',
    name_en: 'Rider Accessories',
    icon_name: 'bag-handle-outline',
    display_order: 4,
    children: [
      { slug: 'whips-crops', module: 'rider_gear', name_ar: 'السياط', name_en: 'Whips & Crops', icon_name: 'flash-outline', display_order: 1 },
      { slug: 'spurs-straps', module: 'rider_gear', name_ar: 'المهاميز وسيورها', name_en: 'Spurs & Spur Straps', icon_name: 'star-outline', display_order: 2 },
      { slug: 'belts', module: 'rider_gear', name_ar: 'أحزمة الركوب', name_en: 'Riding Belts', icon_name: 'reorder-two-outline', display_order: 3 },
      { slug: 'gear-bags', module: 'rider_gear', name_ar: 'حقائب المعدات والأحذية', name_en: 'Gear & Helmet Bags', icon_name: 'bag-outline', display_order: 4 },
    ],
  },

  // ── 3. EQUESTRIAN SERVICES (الخدمات) ──────────────────────────────────────
  {
    slug: 'housing-boarding',
    module: 'services',
    name_ar: 'خدمات الإيواء والرعاية اليومية',
    name_en: 'Housing & Daily Care',
    icon_name: 'home-outline',
    display_order: 1,
    children: [
      { slug: 'stall-rental', module: 'services', name_ar: 'تأجير البوائك (الغرف)', name_en: 'Stall Rental (Full/Partial)', icon_name: 'key-outline', display_order: 1 },
      { slug: 'feeding-care', module: 'services', name_ar: 'إدارة التغذية', name_en: 'Feeding & Nutrition Care', icon_name: 'restaurant-outline', display_order: 2 },
      { slug: 'paddock-turnout', module: 'services', name_ar: 'الترييض والإنطلاق اليومي', name_en: 'Daily Paddock Turnout', icon_name: 'walk-outline', display_order: 3 },
    ],
  },
  {
    slug: 'training-instruction',
    module: 'services',
    name_ar: 'خدمات التدريب والتعليم',
    name_en: 'Training & Instruction',
    icon_name: 'school-outline',
    display_order: 2,
    children: [
      { slug: 'riding-lessons', module: 'services', name_ar: 'دروس ركوب الخيل', name_en: 'Riding Lessons (All Levels)', icon_name: 'book-outline', display_order: 1 },
      { slug: 'horse-training', module: 'services', name_ar: 'تدريب وتأهيل الخيول (العسف)', name_en: 'Horse Training & Breaking', icon_name: 'trophy-outline', display_order: 2 },
      { slug: 'behavioral-correction', module: 'services', name_ar: 'تصحيح السلوك', name_en: 'Behavioral Correction', icon_name: 'construct-outline', display_order: 3 },
      { slug: 'competition-prep', module: 'services', name_ar: 'تجهيز الخيول للبطولات', name_en: 'Show & Competition Prep', icon_name: 'medal-outline', display_order: 4 },
    ],
  },
  {
    slug: 'health-records',
    module: 'services',
    name_ar: 'الرعاية الصحية والعناية',
    name_en: 'Health & Care Services',
    icon_name: 'heart-outline',
    display_order: 3,
    children: [
      { slug: 'farrier-services', module: 'services', name_ar: 'العناية بالحوافر (البيطار)', name_en: 'Farrier & Shoeing', icon_name: 'hammer-outline', display_order: 1 },
      { slug: 'vet-medical-records', module: 'services', name_ar: 'متابعة الجداول الطبية والتطعيمات', name_en: 'Vaccinations & Vet Checkups', icon_name: 'pulse-outline', display_order: 2 },
      { slug: 'rehab-first-aid', module: 'services', name_ar: 'الرعاية التأهيلية والإسعافات', name_en: 'Rehab & Emergency Care', icon_name: 'fitness-outline', display_order: 3 },
    ],
  },
  {
    slug: 'commercial-logistics',
    module: 'services',
    name_ar: 'الخدمات التجارية واللوجستية',
    name_en: 'Commercial & Transport',
    icon_name: 'car-outline',
    display_order: 4,
    children: [
      { slug: 'horse-brokerage', module: 'services', name_ar: 'الوساطة في البيع والشراء', name_en: 'Sale & Purchase Brokerage', icon_name: 'cash-outline', display_order: 1 },
      { slug: 'horse-transport', module: 'services', name_ar: 'نقل الخيول', name_en: 'Horse Transport & Trailers', icon_name: 'bus-outline', display_order: 2 },
      { slug: 'supplies-supply-chain', module: 'services', name_ar: 'توريد المستلزمات والأعلاف', name_en: 'Feed & Equipment Supply', icon_name: 'cube-outline', display_order: 3 },
    ],
  },
  {
    slug: 'breeding-services',
    module: 'services',
    name_ar: 'خدمات الإنتاج (الاستيلاد)',
    name_en: 'Breeding Services',
    icon_name: 'heart-circle-outline',
    display_order: 5,
    children: [
      { slug: 'stud-service', module: 'services', name_ar: 'التشبية (التلقيح)', name_en: 'Stud Service & Insemination', icon_name: 'sparkles-outline', display_order: 1 },
      { slug: 'pregnant-mare-care', module: 'services', name_ar: 'رعاية الأفراس الحوامل', name_en: 'Pregnant Mare Care', icon_name: 'female-outline', display_order: 2 },
      { slug: 'foal-care', module: 'services', name_ar: 'رعاية الأمهار والفطام', name_en: 'Foal Care & Weaning', icon_name: 'happy-outline', display_order: 3 },
    ],
  },
  {
    slug: 'recreation-events',
    module: 'services',
    name_ar: 'الخدمات الترفيهية والفعاليات',
    name_en: 'Recreation & Events',
    icon_name: 'calendar-outline',
    display_order: 6,
    children: [
      { slug: 'recreational-rental', module: 'services', name_ar: 'التأجير الترفيهي والجولات', name_en: 'Trail Rides & Photo Shoots', icon_name: 'camera-outline', display_order: 1 },
      { slug: 'event-hosting', module: 'services', name_ar: 'استضافة الفعاليات والمزادات', name_en: 'Event Hosting & Auctions', icon_name: 'people-outline', display_order: 2 },
    ],
  },
];
