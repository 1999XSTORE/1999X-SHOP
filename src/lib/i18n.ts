import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Full translations for every page
const en = {
  nav: { dashboard: 'Home', shop: 'Shop', licenses: 'License', chat: 'Chat', support: 'Support', status: 'Status', bonus: 'Bonus', announcements: 'News', wallet: 'Shop', logout: 'Sign Out' },
  dashboard: { welcome: 'Welcome back', balance: 'Balance', activeKeys: 'Active Keys', approved: 'Approved', bonusPoints: 'Bonus Pts', activeSubscriptions: 'Active Subscriptions', noLicense: 'No active licenses', noLicenseDesc: 'Go to Shop to activate your key', quickLinks: 'Quick Links', dailyBonus: 'Daily Bonus', dailyBonusDesc: '+10 pts daily · 100 pts = reward', claimNow: 'Claim Now', nextClaim: 'Next claim in' },
  shop: { title: 'Shop', products: 'Products', addBalance: 'Add Balance', selectAmount: 'Select Amount', continue: 'Continue', paymentMethod: 'Payment Method', sentPayment: "I've Sent Payment", txnId: 'Transaction / Reference ID', txnIdPlaceholder: 'Paste your transaction ID here', txnIdDesc: 'Enter the ID you received after payment', submit: 'Submit Payment', submitting: 'Submitting...', back: 'Back', history: 'Transaction History', noTxns: 'No transactions yet', approved: 'Approved', rejected: 'Rejected', pending: 'Pending', buy: 'Buy', insufficientBalance: 'Insufficient Balance', approvedMsg: 'Payment approved! ${amount} added to your balance.', rejectedMsg: 'Payment of ${amount} was rejected.' },
  license: { title: 'Activate License', subtitle: 'Enter your KeyAuth key to activate your panel', placeholder: 'Paste your license key', activate: 'Activate License Key', validating: 'Validating...', noLicense: 'No active licenses', noLicenseDesc: 'Paste your license key above to get started', internalPanel: '1999X Internal Panel', fakeLagPanel: '1999X Fake Lag Panel', hwid: 'HWID', ip: 'IP', lastLogin: 'Last Login', expiry: 'Expiry', resetHwid: 'Reset HWID', resetsLeft: 'left', copy: 'Copy', download: 'Download Panel', tutorial: 'Watch Tutorial', failed: 'Activation Failed' },
  bonus: { title: 'Bonus Points', subtitle: 'Claim every day · 100 pts = reward', yourPoints: 'Your Points', progressLabel: 'Progress to next reward', claim: '⚡ Claim +10 Points', claimed: '✓ Claimed!', nextClaim: 'Next claim in', redeem: 'Redeem Rewards', redeemed: 'redeemed so far', needMore: 'more pts to redeem', redeemBtn: 'Redeem pts', key3Day: '3-Day Key', balance1: '$1 Balance', fullAccess: 'Full access key', walletCredit: 'Wallet credit' },
  status: { title: 'Panel Status', allOps: 'Operational', maintenance: 'Maintenance', liveStats: 'Live Stats', totalUsers: 'Total Users', onlineNow: 'Online Now', services: 'Services', announcements: 'Announcements' },
  announcements: { title: 'Announcements', noAnnouncements: 'No announcements yet', checkBack: 'Check back later for updates' },
  chat: { title: 'Community Chat', placeholder: 'Send a message...', send: 'Send' },
  support: { title: 'Support', placeholder: 'Describe your issue...' },
  common: { loading: 'Loading...', error: 'Error', cancel: 'Cancel', confirm: 'Confirm', copy: 'Copy', copied: 'Copied!' },
};

const translations: Record<string, typeof en> = {
  en,
  ar: { ...en, nav: { ...en.nav, dashboard: 'الرئيسية', shop: 'المتجر', licenses: 'الترخيص', chat: 'الدردشة', support: 'الدعم', status: 'الحالة', bonus: 'المكافآت', announcements: 'الأخبار', wallet: 'المتجر', logout: 'خروج' }, dashboard: { ...en.dashboard, welcome: 'مرحبًا بعودتك', balance: 'الرصيد', activeKeys: 'المفاتيح النشطة', approved: 'موافق عليه', bonusPoints: 'نقاط المكافأة', activeSubscriptions: 'الاشتراكات النشطة', noLicense: 'لا توجد تراخيص نشطة', noLicenseDesc: 'اذهب إلى المتجر لتفعيل مفتاحك', quickLinks: 'روابط سريعة', dailyBonus: 'المكافأة اليومية', dailyBonusDesc: '+10 نقاط يومياً · 100 نقطة = مكافأة', claimNow: 'احصل الآن', nextClaim: 'الحصول التالي في' }, shop: { ...en.shop, title: 'المتجر', products: 'المنتجات', addBalance: 'إضافة رصيد', selectAmount: 'اختر المبلغ', continue: 'متابعة', paymentMethod: 'طريقة الدفع', sentPayment: 'لقد أرسلت الدفع', txnId: 'رقم المعاملة', txnIdPlaceholder: 'الصق رقم المعاملة هنا', submit: 'إرسال الدفع', submitting: 'جارٍ الإرسال...', back: 'رجوع', history: 'سجل المعاملات', noTxns: 'لا توجد معاملات بعد', approved: 'تمت الموافقة', rejected: 'مرفوض', pending: 'قيد الانتظار', buy: 'شراء', insufficientBalance: 'رصيد غير كافٍ' }, license: { ...en.license, title: 'تفعيل الترخيص', subtitle: 'أدخل مفتاح KeyAuth الخاص بك', placeholder: 'الصق مفتاح الترخيص', activate: 'تفعيل المفتاح', validating: 'جارٍ التحقق...', noLicense: 'لا توجد تراخيص نشطة', noLicenseDesc: 'الصق مفتاح الترخيص للبدء', failed: 'فشل التفعيل' }, bonus: { ...en.bonus, title: 'نقاط المكافأة', subtitle: 'احصل يومياً · 100 نقطة = مكافأة', yourPoints: 'نقاطك', claim: '⚡ احصل على +10 نقاط', claimed: '✓ تم الحصول!', nextClaim: 'الحصول التالي في', redeem: 'استبدال المكافآت' }, status: { ...en.status, title: 'حالة اللوحة', allOps: 'يعمل', maintenance: 'صيانة', liveStats: 'إحصائيات مباشرة', totalUsers: 'إجمالي المستخدمين', onlineNow: 'متصل الآن', services: 'الخدمات', announcements: 'الإعلانات' }, announcements: { ...en.announcements, title: 'الإعلانات', noAnnouncements: 'لا توجد إعلانات بعد', checkBack: 'تحقق لاحقاً للتحديثات' }, common: { ...en.common, loading: 'تحميل...', error: 'خطأ', cancel: 'إلغاء', confirm: 'تأكيد', copy: 'نسخ', copied: 'تم النسخ!' } },
  bn: { ...en, nav: { ...en.nav, dashboard: 'হোম', shop: 'শপ', licenses: 'লাইসেন্স', chat: 'চ্যাট', support: 'সাপোর্ট', status: 'স্ট্যাটাস', bonus: 'বোনাস', announcements: 'খবর', wallet: 'শপ', logout: 'সাইন আউট' }, dashboard: { ...en.dashboard, welcome: 'স্বাগতম', balance: 'ব্যালেন্স', activeKeys: 'সক্রিয় কী', claimNow: 'এখনই নিন', nextClaim: 'পরবর্তী দাবি' }, shop: { ...en.shop, title: 'শপ', addBalance: 'ব্যালেন্স যোগ করুন', selectAmount: 'পরিমাণ বেছে নিন', continue: 'চালিয়ে যান', submit: 'পেমেন্ট জমা দিন', back: 'পেছনে', history: 'লেনদেনের ইতিহাস' }, license: { ...en.license, title: 'লাইসেন্স সক্রিয় করুন', placeholder: 'লাইসেন্স কী পেস্ট করুন', activate: 'সক্রিয় করুন', validating: 'যাচাই করা হচ্ছে...' }, bonus: { ...en.bonus, title: 'বোনাস পয়েন্ট', claim: '⚡ +১০ পয়েন্ট নিন', claimed: '✓ নেওয়া হয়েছে!' }, status: { ...en.status, title: 'প্যানেল স্ট্যাটাস' }, announcements: { ...en.announcements, title: 'ঘোষণা' }, common: { ...en.common } },
  th: { ...en, nav: { ...en.nav, dashboard: 'หน้าแรก', shop: 'ร้านค้า', licenses: 'ใบอนุญาต', chat: 'แชท', support: 'สนับสนุน', status: 'สถานะ', bonus: 'โบนัส', announcements: 'ข่าว', wallet: 'ร้านค้า', logout: 'ออกจากระบบ' }, dashboard: { ...en.dashboard, welcome: 'ยินดีต้อนรับกลับ', balance: 'ยอดเงิน', activeKeys: 'คีย์ที่ใช้งาน', claimNow: 'รับเลย', nextClaim: 'รับครั้งถัดไปใน' }, shop: { ...en.shop, title: 'ร้านค้า', addBalance: 'เติมเงิน', selectAmount: 'เลือกจำนวนเงิน', continue: 'ดำเนินการต่อ', submit: 'ส่งการชำระเงิน', back: 'กลับ', history: 'ประวัติธุรกรรม' }, license: { ...en.license, title: 'เปิดใช้งานใบอนุญาต', placeholder: 'วางคีย์ใบอนุญาต', activate: 'เปิดใช้งาน', validating: 'กำลังตรวจสอบ...' }, bonus: { ...en.bonus, title: 'คะแนนโบนัส', claim: '⚡ รับ +10 คะแนน', claimed: '✓ รับแล้ว!' }, status: { ...en.status, title: 'สถานะแผง' }, announcements: { ...en.announcements, title: 'ประกาศ' }, common: { ...en.common } },
};

// For languages without full translations, fall back to English
['vi','es','pt','hi','fr','de','ja','ko','zh','ru','tr'].forEach(code => {
  translations[code] = { ...en };
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(Object.entries(translations).map(([k,v]) => [k, { translation: v }])),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
