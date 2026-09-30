/**
 * Static demo catalogue for a UAE beauty salon. Realistic names, prices (AED)
 * and durations; no placeholder people. Used by seed-demo.ts.
 */

export const DEMO_CATEGORIES = [
  { key: "hair", name: "Hair", nameAr: "الشعر", color: "#a8406a" },
  { key: "nails", name: "Nails", nameAr: "الأظافر", color: "#b8527d" },
  { key: "skin", name: "Facial & Skin", nameAr: "العناية بالبشرة", color: "#2f7a55" },
  { key: "massage", name: "Massage", nameAr: "المساج", color: "#3f5f99" },
  { key: "waxing", name: "Waxing", nameAr: "إزالة الشعر بالشمع", color: "#9a4b34" },
  { key: "brows", name: "Brows & Lashes", nameAr: "الحواجب والرموش", color: "#6a4c96" },
  { key: "makeup", name: "Makeup", nameAr: "المكياج", color: "#7a323b" },
] as const;

export type DemoCategoryKey = (typeof DEMO_CATEGORIES)[number]["key"];

export const DEMO_SERVICES: {
  key: string;
  category: DemoCategoryKey;
  name: string;
  nameAr: string;
  duration: number;
  price: number;
  popularity: number;
}[] = [
  { key: "haircut", category: "hair", name: "Haircut", nameAr: "قص الشعر", duration: 45, price: 150, popularity: 10 },
  { key: "haircut_blowdry", category: "hair", name: "Haircut & Blow Dry", nameAr: "قص وتصفيف الشعر", duration: 75, price: 220, popularity: 8 },
  { key: "blowdry", category: "hair", name: "Blow Dry", nameAr: "تصفيف بالسشوار", duration: 45, price: 120, popularity: 12 },
  { key: "colour_roots", category: "hair", name: "Root Colour", nameAr: "صبغة الجذور", duration: 90, price: 280, popularity: 5 },
  { key: "colour_full", category: "hair", name: "Hair Colour", nameAr: "صبغة الشعر", duration: 120, price: 450, popularity: 5 },
  { key: "balayage", category: "hair", name: "Balayage", nameAr: "بالياج", duration: 180, price: 850, popularity: 2 },
  { key: "keratin", category: "hair", name: "Keratin Treatment", nameAr: "علاج الكيراتين", duration: 150, price: 900, popularity: 2 },
  { key: "hair_spa", category: "hair", name: "Moroccan Hair Spa", nameAr: "حمام مغربي للشعر", duration: 60, price: 250, popularity: 3 },
  { key: "manicure", category: "nails", name: "Classic Manicure", nameAr: "مانيكير كلاسيكي", duration: 45, price: 90, popularity: 9 },
  { key: "gel_manicure", category: "nails", name: "Gel Manicure", nameAr: "مانيكير جل", duration: 60, price: 140, popularity: 10 },
  { key: "pedicure", category: "nails", name: "Classic Pedicure", nameAr: "باديكير كلاسيكي", duration: 50, price: 110, popularity: 6 },
  { key: "gel_pedicure", category: "nails", name: "Gel Pedicure", nameAr: "باديكير جل", duration: 60, price: 160, popularity: 6 },
  { key: "nail_art", category: "nails", name: "Nail Art (per set)", nameAr: "رسم على الأظافر", duration: 30, price: 80, popularity: 3 },
  { key: "gel_removal", category: "nails", name: "Gel Removal", nameAr: "إزالة الجل", duration: 20, price: 40, popularity: 4 },
  { key: "facial_classic", category: "skin", name: "Classic Facial", nameAr: "تنظيف بشرة كلاسيكي", duration: 60, price: 280, popularity: 5 },
  { key: "hydrafacial", category: "skin", name: "HydraFacial", nameAr: "هيدرافيشل", duration: 60, price: 550, popularity: 3 },
  { key: "gold_facial", category: "skin", name: "24K Gold Facial", nameAr: "تنظيف بشرة بالذهب", duration: 75, price: 480, popularity: 2 },
  { key: "swedish", category: "massage", name: "Swedish Massage 60 min", nameAr: "مساج سويدي 60 دقيقة", duration: 60, price: 350, popularity: 4 },
  { key: "deep_tissue", category: "massage", name: "Deep Tissue Massage", nameAr: "مساج الأنسجة العميقة", duration: 60, price: 400, popularity: 3 },
  { key: "hot_stone", category: "massage", name: "Hot Stone Massage", nameAr: "مساج بالأحجار الساخنة", duration: 75, price: 450, popularity: 2 },
  { key: "full_legs", category: "waxing", name: "Full Legs Waxing", nameAr: "شمع الساقين كاملتين", duration: 45, price: 150, popularity: 4 },
  { key: "underarm", category: "waxing", name: "Underarm Waxing", nameAr: "شمع الإبط", duration: 15, price: 50, popularity: 5 },
  { key: "full_body_wax", category: "waxing", name: "Full Body Waxing", nameAr: "شمع الجسم كاملًا", duration: 90, price: 380, popularity: 2 },
  { key: "threading", category: "brows", name: "Eyebrow Threading", nameAr: "تشقير الحواجب بالخيط", duration: 15, price: 40, popularity: 12 },
  { key: "brow_tint", category: "brows", name: "Brow Tint", nameAr: "صبغ الحواجب", duration: 20, price: 60, popularity: 4 },
  { key: "lash_lift", category: "brows", name: "Lash Lift & Tint", nameAr: "رفع وصبغ الرموش", duration: 60, price: 250, popularity: 3 },
  { key: "makeup_day", category: "makeup", name: "Day Makeup", nameAr: "مكياج نهاري", duration: 45, price: 300, popularity: 2 },
  { key: "makeup_bridal", category: "makeup", name: "Bridal Makeup", nameAr: "مكياج العروس", duration: 120, price: 1500, popularity: 1 },
];

export const DEMO_STAFF: {
  key: string;
  firstName: string;
  lastName: string;
  position: string;
  color: string;
  categories: DemoCategoryKey[];
  dayOff: number;
  shift: [string, string];
  nationality: string;
  hireDate: string;
}[] = [
  { key: "sara", firstName: "Sara", lastName: "Haddad", position: "Senior Stylist", color: "#a8406a", categories: ["hair"], dayOff: 5, shift: ["10:00", "20:00"], nationality: "Lebanese", hireDate: "2021-03-14" },
  { key: "maria", firstName: "Maria", lastName: "Santos", position: "Colourist", color: "#9a4b34", categories: ["hair"], dayOff: 1, shift: ["11:00", "21:00"], nationality: "Filipino", hireDate: "2022-06-01" },
  { key: "lina", firstName: "Lina", lastName: "Farouk", position: "Nail Technician", color: "#b8527d", categories: ["nails"], dayOff: 3, shift: ["10:00", "20:00"], nationality: "Egyptian", hireDate: "2022-09-18" },
  { key: "joy", firstName: "Joy", lastName: "Dela Cruz", position: "Nail Technician", color: "#6a4c96", categories: ["nails"], dayOff: 2, shift: ["12:00", "22:00"], nationality: "Filipino", hireDate: "2023-02-05" },
  { key: "aisha", firstName: "Aisha", lastName: "Rahman", position: "Beauty Therapist", color: "#2f7a55", categories: ["skin", "waxing", "brows"], dayOff: 0, shift: ["10:00", "20:00"], nationality: "Indian", hireDate: "2021-11-22" },
  { key: "priya", firstName: "Priya", lastName: "Nair", position: "Massage Therapist", color: "#3f5f99", categories: ["massage", "waxing"], dayOff: 4, shift: ["11:00", "21:00"], nationality: "Indian", hireDate: "2023-05-10" },
  { key: "hana", firstName: "Hana", lastName: "Yousef", position: "Makeup Artist", color: "#7a323b", categories: ["makeup", "brows"], dayOff: 6, shift: ["12:00", "22:00"], nationality: "Jordanian", hireDate: "2024-01-08" },
];

export const DEMO_CLIENTS: { first: string; last: string; gender: "female" | "male"; nationality: string }[] = [
  { first: "Mariam", last: "Al Nuaimi", gender: "female", nationality: "Emirati" },
  { first: "Sarah", last: "Ahmed", gender: "female", nationality: "Egyptian" },
  { first: "Noor", last: "Hassan", gender: "female", nationality: "Jordanian" },
  { first: "Layla", last: "Mohammed", gender: "female", nationality: "Emirati" },
  { first: "Fatima", last: "Al Mazrouei", gender: "female", nationality: "Emirati" },
  { first: "Hessa", last: "Al Suwaidi", gender: "female", nationality: "Emirati" },
  { first: "Amna", last: "Al Ketbi", gender: "female", nationality: "Emirati" },
  { first: "Shamma", last: "Al Falasi", gender: "female", nationality: "Emirati" },
  { first: "Reem", last: "Khalil", gender: "female", nationality: "Lebanese" },
  { first: "Dana", last: "Haddad", gender: "female", nationality: "Syrian" },
  { first: "Yasmin", last: "Saleh", gender: "female", nationality: "Palestinian" },
  { first: "Hind", last: "Al Shamsi", gender: "female", nationality: "Emirati" },
  { first: "Maha", last: "Abdullah", gender: "female", nationality: "Saudi" },
  { first: "Rania", last: "Mansour", gender: "female", nationality: "Egyptian" },
  { first: "Lulwa", last: "Al Marri", gender: "female", nationality: "Qatari" },
  { first: "Aaliyah", last: "Khan", gender: "female", nationality: "Pakistani" },
  { first: "Ananya", last: "Sharma", gender: "female", nationality: "Indian" },
  { first: "Priyanka", last: "Menon", gender: "female", nationality: "Indian" },
  { first: "Zainab", last: "Qureshi", gender: "female", nationality: "Pakistani" },
  { first: "Emily", last: "Carter", gender: "female", nationality: "British" },
  { first: "Charlotte", last: "Hughes", gender: "female", nationality: "British" },
  { first: "Sophie", last: "Laurent", gender: "female", nationality: "French" },
  { first: "Olivia", last: "Bennett", gender: "female", nationality: "Australian" },
  { first: "Anna", last: "Kowalski", gender: "female", nationality: "Polish" },
  { first: "Elena", last: "Petrova", gender: "female", nationality: "Russian" },
  { first: "Grace", last: "Mendoza", gender: "female", nationality: "Filipino" },
  { first: "Chloe", last: "Wong", gender: "female", nationality: "Singaporean" },
  { first: "Mira", last: "Aziz", gender: "female", nationality: "Lebanese" },
  { first: "Salma", last: "Ibrahim", gender: "female", nationality: "Sudanese" },
  { first: "Nadia", last: "Al Hashimi", gender: "female", nationality: "Emirati" },
  { first: "Jawaher", last: "Al Qasimi", gender: "female", nationality: "Emirati" },
  { first: "Latifa", last: "Bin Hamad", gender: "female", nationality: "Emirati" },
  { first: "Aisha", last: "Siddiqui", gender: "female", nationality: "Indian" },
  { first: "Farah", last: "Nasser", gender: "female", nationality: "Jordanian" },
  { first: "Lara", last: "Fernandes", gender: "female", nationality: "Portuguese" },
  { first: "Isabella", last: "Rossi", gender: "female", nationality: "Italian" },
  { first: "Omar", last: "Al Hammadi", gender: "male", nationality: "Emirati" },
  { first: "Khalid", last: "Al Rashid", gender: "male", nationality: "Saudi" },
  { first: "Rashed", last: "Al Mansoori", gender: "male", nationality: "Emirati" },
  { first: "Daniel", last: "Brooks", gender: "male", nationality: "American" },
];

export const DEMO_PRODUCT_CATEGORIES = [
  { key: "haircare", name: "Hair care", nameAr: "العناية بالشعر" },
  { key: "nails", name: "Nails", nameAr: "الأظافر" },
  { key: "skincare", name: "Skin care", nameAr: "العناية بالبشرة" },
  { key: "professional", name: "Professional use", nameAr: "للاستخدام المهني" },
] as const;

export const DEMO_SUPPLIERS = [
  { key: "bps", name: "Beauty Pro Supplies LLC", contactName: "Ahmed Karim", phone: "+971 4 339 2210", email: "orders@beautyprosupplies.ae", trn: "100245678900003" },
  { key: "gulf", name: "Gulf Salon Trading", contactName: "Rohit Varma", phone: "+971 6 555 1834", email: "sales@gulfsalontrading.ae", trn: "100398765400003" },
  { key: "nailhub", name: "Nail Hub Distribution", contactName: "Marites Garcia", phone: "+971 4 887 6402", email: "hello@nailhub.ae", trn: "100512345600003" },
] as const;

export const DEMO_PRODUCTS: {
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: (typeof DEMO_PRODUCT_CATEGORIES)[number]["key"];
  supplier: (typeof DEMO_SUPPLIERS)[number]["key"];
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  usage: "retail" | "professional";
}[] = [
  { sku: "KER-NUT-250", barcode: "3474636397853", name: "Nutritive Bain Satin Shampoo 250ml", brand: "Kérastase", category: "haircare", supplier: "bps", cost: 62, price: 135, stock: 14, minStock: 5, usage: "retail" },
  { sku: "KER-ELX-100", barcode: "3474630661707", name: "Elixir Ultime Hair Oil 100ml", brand: "Kérastase", category: "haircare", supplier: "bps", cost: 95, price: 210, stock: 6, minStock: 4, usage: "retail" },
  { sku: "OLA-NO3-100", barcode: "896364002350", name: "No.3 Hair Perfector 100ml", brand: "Olaplex", category: "haircare", supplier: "gulf", cost: 70, price: 150, stock: 3, minStock: 4, usage: "retail" },
  { sku: "MOR-OIL-100", barcode: "7290011521011", name: "Moroccanoil Treatment 100ml", brand: "Moroccanoil", category: "haircare", supplier: "gulf", cost: 88, price: 185, stock: 9, minStock: 3, usage: "retail" },
  { sku: "OPI-NL-A16", barcode: "094100000183", name: "Nail Lacquer – Big Apple Red", brand: "OPI", category: "nails", supplier: "nailhub", cost: 22, price: 55, stock: 18, minStock: 6, usage: "retail" },
  { sku: "OPI-CUT-OIL", barcode: "094100006345", name: "ProSpa Cuticle Oil 8.6ml", brand: "OPI", category: "nails", supplier: "nailhub", cost: 30, price: 70, stock: 11, minStock: 4, usage: "retail" },
  { sku: "DER-CLN-150", barcode: "666151031200", name: "Daily Microfoliant 74g", brand: "Dermalogica", category: "skincare", supplier: "bps", cost: 120, price: 265, stock: 5, minStock: 3, usage: "retail" },
  { sku: "DER-SPF-50", barcode: "666151061603", name: "Invisible Physical Defense SPF30", brand: "Dermalogica", category: "skincare", supplier: "bps", cost: 105, price: 230, stock: 2, minStock: 3, usage: "retail" },
  { sku: "WEL-KOL-70", barcode: "8005610613881", name: "Koleston Perfect 7/0 60ml", brand: "Wella", category: "professional", supplier: "gulf", cost: 18, price: 0, stock: 40, minStock: 15, usage: "professional" },
  { sku: "WEL-DEV-6", barcode: "8005610435230", name: "Welloxon Developer 6% 1L", brand: "Wella", category: "professional", supplier: "gulf", cost: 35, price: 0, stock: 8, minStock: 4, usage: "professional" },
  { sku: "CND-SHL-BASE", barcode: "639370001115", name: "Shellac Base Coat 7.3ml", brand: "CND", category: "professional", supplier: "nailhub", cost: 48, price: 0, stock: 6, minStock: 3, usage: "professional" },
];

export const AREAS = ["Jumeirah", "Al Barsha", "Dubai Marina", "Downtown", "Arabian Ranches", "JLT", "Mirdif", "Al Wasl"];
export const SOURCES = ["Walk-in", "Instagram", "Google", "Referral", "Returning", "Facebook"];
export const MOBILE_PREFIXES = ["050", "052", "054", "055", "056", "058"];
