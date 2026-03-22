import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const en = {
  nav: { home:'Home', license:'License', chat:'Chat', shop:'Shop', bonus:'Bonus', status:'Status', support:'Support', signOut:'Sign Out' },
  auth: { signIn:'Sign in', subtitle:'Access your premium panel', continueGoogle:'Continue with Google', terms:'By signing in you agree to our Terms of Service', support:'Need help? Contact Support on Discord →' },
  dashboard: {
    welcomeBack:'Welcome back', balance:'Balance', activeKeys:'Active Keys', approved:'Approved',
    bonusPoints:'Bonus Pts', activeSubscriptions:'Active Subscriptions', liveCountdown:'Live countdown',
    noLicense:'No active licenses', noLicenseDesc:'Go to Shop to activate your key',
    dailyBonus:'Daily Bonus', dailyBonusDesc:'+10 pts daily · 100 pts = reward',
    claimNow:'Claim Now', nextClaim:'Next claim in', until:'until',
  },
  shop: {
    title:'Shop', products:'Products', ob52:'OB52 Undetected',
    availableBalance:'Available Balance', approvedInstant:'Approved deposits credited instantly',
    addBalance:'Add Balance', chooseMethod:'Choose payment method · Admin approves within minutes',
    selectAmount:'Select Amount', youWillDeposit:'You will deposit',
    continue:'Continue', paymentMethod:'Payment Method',
    sendExactly:'Send exactly', sentPayment:"I've Sent Payment",
    txnIdLabel:'Transaction / Reference ID', txnIdPlaceholder:'Paste your transaction ID here',
    txnIdDesc:'Enter the ID you received after completing payment',
    submitPayment:'Submit Payment', submitting:'Submitting...',
    back:'Back', history:'Transaction History', noTxns:'No transactions yet',
    approved:'✓ Approved', rejected:'✗ Rejected', pending:'⏳ Pending',
    buy:'Buy', insufficientBalance:'Insufficient Balance',
    payPalTitle:'Pay with PayPal', payPalDesc:'Secure · Balance added automatically after payment',
    amount:'Amount',
  },
  license: {
    title:'Activate License Key', subtitle:'Enter your KeyAuth key to activate your panel',
    placeholder:'Paste your license key here', activate:'Activate License Key',
    validating:'Validating...', activationFailed:'Activation Failed',
    noLicense:'No active licenses', noLicenseDesc:'Paste your license key above to get started',
    internalPanel:'1999X Internal Panel', fakeLagPanel:'1999X Fake Lag Panel',
    hwid:'HWID', ip:'IP', lastLogin:'Last Login', expiry:'Expiry',
    resetHwid:'Reset HWID', resetsLeft:'left this month', copy:'Copy',
    download:'Download Panel', downloadDesc:'Latest 1999X build',
    tutorial:'Watch Tutorial', tutorialDesc:'Step-by-step guide',
    active:'Active', expired:'Expired', boundToAccount:'KeyAuth License · Bound to account',
    keyGenerated:'Key Generated!', keyActive:'Your 3-day license is active',
  },
  bonus: {
    title:'Bonus Points', subtitle:'Claim daily · 100 pts =', reward:'reward',
    yourPoints:'Your Points', progressLabel:'Progress to next reward',
    claim:'⚡ Claim +10 Points', claimed:'✓ Claimed!',
    nextClaim:'Next claim in', redeem:'Redeem Rewards',
    redeemed:'redeemed', chooseReward:'Choose Your Reward',
    redeemDesc:'100 points redeemed · Pick your reward',
    getBalance:'Get $3 Balance', getBalanceDesc:'Added to your wallet instantly',
    getKey:'Get 3-Day License Key', getKeyDesc:'Auto-generated · Added to your licenses',
    redeemNote:'This reward will deduct 100 pts from your balance',
    balanceAdded:'$3 Added!', balanceUpdated:'Balance updated in your wallet',
    newBalance:'NEW BALANCE', keyGenTitle:'Key Generated!',
    key3Day:'3-Day Key', balance3:'$3 Balance',
    fullAccess:'Full access key', walletCredit:'Instant +$3 wallet credit',
    needMore:'more pts to redeem', redeemBtn:'Redeem',
  },
  status: {
    title:'Panel Status', allOps:'All Systems Operational', maintenance:'Under Maintenance',
    liveStats:'Live Stats', totalUsers:'Total Users', onlineNow:'Online Now',
    services:'Services', online:'Online', announcements:'Announcements',
  },
  announcements: {
    title:'Announcements', subtitle:'message', subtitlePlural:'messages',
    noAnnouncements:'No announcements yet', checkBack:'Check back later for updates',
  },
  chat: { title:'Community Chat', placeholder:'Send a message...', send:'Send' },
  support: { title:'Support', placeholder:'Describe your issue...' },
  common: { loading:'Loading...', error:'Error', cancel:'Cancel', confirm:'Confirm', copy:'Copy', copied:'Copied!', done:'Done', status:'Status', method:'Method', txnId:'Transaction ID', or:'or' },
};

type Translations = typeof en;

// Full Arabic translation
const ar: Translations = {
  nav: { home:'الرئيسية', license:'الترخيص', chat:'الدردشة', shop:'المتجر', bonus:'المكافآت', status:'الحالة', support:'الدعم', signOut:'خروج' },
  auth: { signIn:'تسجيل الدخول', subtitle:'الوصول إلى لوحتك المميزة', continueGoogle:'المتابعة مع Google', terms:'بتسجيل الدخول، توافق على شروط الخدمة', support:'تحتاج مساعدة؟ تواصل معنا على Discord ←' },
  dashboard: { welcomeBack:'مرحبًا بعودتك', balance:'الرصيد', activeKeys:'المفاتيح النشطة', approved:'موافق عليه', bonusPoints:'نقاط المكافأة', activeSubscriptions:'الاشتراكات النشطة', liveCountdown:'عداد مباشر', noLicense:'لا توجد تراخيص نشطة', noLicenseDesc:'اذهب للمتجر لتفعيل مفتاحك', dailyBonus:'المكافأة اليومية', dailyBonusDesc:'+10 نقاط يومياً · 100 نقطة = مكافأة', claimNow:'احصل الآن', nextClaim:'الحصول التالي في', until:'حتى' },
  shop: { title:'المتجر', products:'المنتجات', ob52:'OB52 غير مكتشف', availableBalance:'الرصيد المتاح', approvedInstant:'الإيداعات المعتمدة تُضاف فورًا', addBalance:'إضافة رصيد', chooseMethod:'اختر طريقة الدفع', selectAmount:'اختر المبلغ', youWillDeposit:'ستودع', continue:'متابعة', paymentMethod:'طريقة الدفع', sendExactly:'أرسل بالضبط', sentPayment:'أرسلت الدفعة', txnIdLabel:'رقم المعاملة', txnIdPlaceholder:'الصق رقم المعاملة', txnIdDesc:'أدخل الرقم الذي استلمته بعد الدفع', submitPayment:'إرسال الدفعة', submitting:'جارٍ الإرسال...', back:'رجوع', history:'سجل المعاملات', noTxns:'لا توجد معاملات بعد', approved:'✓ موافق عليه', rejected:'✗ مرفوض', pending:'⏳ قيد الانتظار', buy:'شراء', insufficientBalance:'رصيد غير كافٍ', payPalTitle:'الدفع عبر PayPal', payPalDesc:'آمن · يضاف الرصيد تلقائيًا بعد الدفع', amount:'المبلغ' },
  license: { title:'تفعيل مفتاح الترخيص', subtitle:'أدخل مفتاح KeyAuth الخاص بك', placeholder:'الصق مفتاح الترخيص هنا', activate:'تفعيل المفتاح', validating:'جارٍ التحقق...', activationFailed:'فشل التفعيل', noLicense:'لا توجد تراخيص نشطة', noLicenseDesc:'الصق مفتاح الترخيص أعلاه للبدء', internalPanel:'لوحة 1999X الداخلية', fakeLagPanel:'لوحة 1999X المزيفة', hwid:'معرف الجهاز', ip:'عنوان IP', lastLogin:'آخر دخول', expiry:'انتهاء الصلاحية', resetHwid:'إعادة تعيين HWID', resetsLeft:'متبقية هذا الشهر', copy:'نسخ', download:'تحميل اللوحة', downloadDesc:'أحدث إصدار', tutorial:'مشاهدة الشرح', tutorialDesc:'دليل خطوة بخطوة', active:'نشط', expired:'منتهي', boundToAccount:'ترخيص KeyAuth · مرتبط بالحساب', keyGenerated:'تم إنشاء المفتاح!', keyActive:'ترخيصك لمدة 3 أيام نشط' },
  bonus: { title:'نقاط المكافأة', subtitle:'احصل يومياً · 100 نقطة =', reward:'مكافأة', yourPoints:'نقاطك', progressLabel:'التقدم نحو المكافأة', claim:'⚡ احصل على +10 نقاط', claimed:'✓ تم الحصول!', nextClaim:'الحصول التالي في', redeem:'استبدال المكافآت', redeemed:'استُبدل', chooseReward:'اختر مكافأتك', redeemDesc:'تم استبدال 100 نقطة · اختر مكافأتك', getBalance:'احصل على رصيد $3', getBalanceDesc:'يضاف لمحفظتك فورًا', getKey:'احصل على مفتاح 3 أيام', getKeyDesc:'يُنشأ تلقائيًا', redeemNote:'سيتم خصم 100 نقطة من رصيدك', balanceAdded:'تمت إضافة $3!', balanceUpdated:'تم تحديث الرصيد', newBalance:'الرصيد الجديد', keyGenTitle:'تم إنشاء المفتاح!', key3Day:'مفتاح 3 أيام', balance3:'رصيد $3', fullAccess:'مفتاح وصول كامل', walletCredit:'+$3 فوري', needMore:'نقاط إضافية للاستبدال', redeemBtn:'استبدال' },
  status: { title:'حالة اللوحة', allOps:'جميع الأنظمة تعمل', maintenance:'تحت الصيانة', liveStats:'إحصائيات مباشرة', totalUsers:'إجمالي المستخدمين', onlineNow:'متصل الآن', services:'الخدمات', online:'متصل', announcements:'الإعلانات' },
  announcements: { title:'الإعلانات', subtitle:'رسالة', subtitlePlural:'رسائل', noAnnouncements:'لا توجد إعلانات بعد', checkBack:'تحقق لاحقًا للتحديثات' },
  chat: { title:'الدردشة المجتمعية', placeholder:'أرسل رسالة...', send:'إرسال' },
  support: { title:'الدعم', placeholder:'اشرح مشكلتك...' },
  common: { loading:'تحميل...', error:'خطأ', cancel:'إلغاء', confirm:'تأكيد', copy:'نسخ', copied:'تم النسخ!', done:'تم', status:'الحالة', method:'الطريقة', txnId:'رقم المعاملة', or:'أو' },
};

// Bengali
const bn: Translations = {
  nav: { home:'হোম', license:'লাইসেন্স', chat:'চ্যাট', shop:'শপ', bonus:'বোনাস', status:'স্ট্যাটাস', support:'সাপোর্ট', signOut:'সাইন আউট' },
  auth: { signIn:'সাইন ইন', subtitle:'আপনার প্রিমিয়াম প্যানেল অ্যাক্সেস করুন', continueGoogle:'Google দিয়ে চালিয়ে যান', terms:'সাইন ইন করে আপনি আমাদের শর্তাবলীতে সম্মত হচ্ছেন', support:'সাহায্য দরকার? Discord-এ যোগাযোগ করুন →' },
  dashboard: { welcomeBack:'স্বাগতম', balance:'ব্যালেন্স', activeKeys:'সক্রিয় কী', approved:'অনুমোদিত', bonusPoints:'বোনাস পয়েন্ট', activeSubscriptions:'সক্রিয় সাবস্ক্রিপশন', liveCountdown:'লাইভ কাউন্টডাউন', noLicense:'কোনো সক্রিয় লাইসেন্স নেই', noLicenseDesc:'আপনার কী সক্রিয় করতে শপে যান', dailyBonus:'দৈনিক বোনাস', dailyBonusDesc:'+১০ পয়েন্ট/দিন · ১০০ পয়েন্ট = পুরস্কার', claimNow:'এখনই নিন', nextClaim:'পরবর্তী দাবি', until:'পর্যন্ত' },
  shop: { title:'শপ', products:'পণ্য', ob52:'OB52 আনডিটেক্টেড', availableBalance:'উপলব্ধ ব্যালেন্স', approvedInstant:'অনুমোদিত জমা তাৎক্ষণিকভাবে যোগ হয়', addBalance:'ব্যালেন্স যোগ করুন', chooseMethod:'পেমেন্ট পদ্ধতি বেছে নিন', selectAmount:'পরিমাণ বেছে নিন', youWillDeposit:'আপনি জমা দেবেন', continue:'চালিয়ে যান', paymentMethod:'পেমেন্ট পদ্ধতি', sendExactly:'ঠিক এই পরিমাণ পাঠান', sentPayment:'আমি পেমেন্ট পাঠিয়েছি', txnIdLabel:'লেনদেন আইডি', txnIdPlaceholder:'লেনদেন আইডি পেস্ট করুন', txnIdDesc:'পেমেন্টের পর প্রাপ্ত আইডি লিখুন', submitPayment:'পেমেন্ট জমা দিন', submitting:'জমা হচ্ছে...', back:'পেছনে', history:'লেনদেনের ইতিহাস', noTxns:'এখনো কোনো লেনদেন নেই', approved:'✓ অনুমোদিত', rejected:'✗ প্রত্যাখ্যাত', pending:'⏳ অপেক্ষমান', buy:'কিনুন', insufficientBalance:'অপর্যাপ্ত ব্যালেন্স', payPalTitle:'PayPal দিয়ে পেমেন্ট', payPalDesc:'নিরাপদ · পেমেন্টের পর স্বয়ংক্রিয়ভাবে ব্যালেন্স যোগ হয়', amount:'পরিমাণ' },
  license: { title:'লাইসেন্স কী সক্রিয় করুন', subtitle:'আপনার KeyAuth কী লিখুন', placeholder:'লাইসেন্স কী পেস্ট করুন', activate:'সক্রিয় করুন', validating:'যাচাই করা হচ্ছে...', activationFailed:'সক্রিয়করণ ব্যর্থ', noLicense:'কোনো সক্রিয় লাইসেন্স নেই', noLicenseDesc:'শুরু করতে উপরে লাইসেন্স কী পেস্ট করুন', internalPanel:'1999X ইন্টার্নাল প্যানেল', fakeLagPanel:'1999X ফেক ল্যাগ প্যানেল', hwid:'HWID', ip:'IP', lastLogin:'শেষ লগইন', expiry:'মেয়াদ শেষ', resetHwid:'HWID রিসেট', resetsLeft:'এই মাসে বাকি', copy:'কপি', download:'প্যানেল ডাউনলোড', downloadDesc:'সর্বশেষ বিল্ড', tutorial:'টিউটোরিয়াল দেখুন', tutorialDesc:'ধাপে ধাপে গাইড', active:'সক্রিয়', expired:'মেয়াদোত্তীর্ণ', boundToAccount:'KeyAuth লাইসেন্স · অ্যাকাউন্টে আবদ্ধ', keyGenerated:'কী তৈরি হয়েছে!', keyActive:'আপনার ৩ দিনের লাইসেন্স সক্রিয়' },
  bonus: { title:'বোনাস পয়েন্ট', subtitle:'প্রতিদিন নিন · ১০০ পয়েন্ট =', reward:'পুরস্কার', yourPoints:'আপনার পয়েন্ট', progressLabel:'পুরস্কারের দিকে অগ্রগতি', claim:'⚡ +১০ পয়েন্ট নিন', claimed:'✓ নেওয়া হয়েছে!', nextClaim:'পরবর্তী দাবি', redeem:'পুরস্কার রিডিম করুন', redeemed:'রিডিম হয়েছে', chooseReward:'পুরস্কার বেছে নিন', redeemDesc:'১০০ পয়েন্ট রিডিম · পুরস্কার বেছে নিন', getBalance:'$৩ ব্যালেন্স পান', getBalanceDesc:'তাৎক্ষণিকভাবে ওয়ালেটে যোগ', getKey:'৩ দিনের লাইসেন্স কী পান', getKeyDesc:'স্বয়ংক্রিয়ভাবে তৈরি', redeemNote:'আপনার ব্যালেন্স থেকে ১০০ পয়েন্ট কাটা হবে', balanceAdded:'$৩ যোগ হয়েছে!', balanceUpdated:'ওয়ালেটে ব্যালেন্স আপডেট হয়েছে', newBalance:'নতুন ব্যালেন্স', keyGenTitle:'কী তৈরি হয়েছে!', key3Day:'৩ দিনের কী', balance3:'$৩ ব্যালেন্স', fullAccess:'সম্পূর্ণ অ্যাক্সেস কী', walletCredit:'তাৎক্ষণিক +$৩', needMore:'আরো পয়েন্ট দরকার', redeemBtn:'রিডিম করুন' },
  status: { title:'প্যানেল স্ট্যাটাস', allOps:'সব সিস্টেম চালু', maintenance:'রক্ষণাবেক্ষণ চলছে', liveStats:'লাইভ পরিসংখ্যান', totalUsers:'মোট ব্যবহারকারী', onlineNow:'এখন অনলাইন', services:'সেবাসমূহ', online:'অনলাইন', announcements:'ঘোষণা' },
  announcements: { title:'ঘোষণা', subtitle:'বার্তা', subtitlePlural:'বার্তা', noAnnouncements:'এখনো কোনো ঘোষণা নেই', checkBack:'পরে আবার দেখুন' },
  chat: { title:'কমিউনিটি চ্যাট', placeholder:'একটি বার্তা পাঠান...', send:'পাঠান' },
  support: { title:'সাপোর্ট', placeholder:'আপনার সমস্যা বর্ণনা করুন...' },
  common: { loading:'লোড হচ্ছে...', error:'ত্রুটি', cancel:'বাতিল', confirm:'নিশ্চিত', copy:'কপি', copied:'কপি হয়েছে!', done:'সম্পন্ন', status:'স্ট্যাটাস', method:'পদ্ধতি', txnId:'লেনদেন আইডি', or:'বা' },
};

// Thai
const th: Translations = {
  nav: { home:'หน้าแรก', license:'ใบอนุญาต', chat:'แชท', shop:'ร้านค้า', bonus:'โบนัส', status:'สถานะ', support:'สนับสนุน', signOut:'ออกจากระบบ' },
  auth: { signIn:'เข้าสู่ระบบ', subtitle:'เข้าถึงแผงพรีเมียมของคุณ', continueGoogle:'ดำเนินการต่อด้วย Google', terms:'การเข้าสู่ระบบถือว่าคุณยอมรับข้อกำหนด', support:'ต้องการความช่วยเหลือ? ติดต่อ Discord →' },
  dashboard: { welcomeBack:'ยินดีต้อนรับกลับ', balance:'ยอดเงิน', activeKeys:'คีย์ที่ใช้งาน', approved:'อนุมัติแล้ว', bonusPoints:'คะแนนโบนัส', activeSubscriptions:'การสมัครสมาชิกที่ใช้งาน', liveCountdown:'นับถอยหลังสด', noLicense:'ไม่มีใบอนุญาตที่ใช้งาน', noLicenseDesc:'ไปที่ร้านค้าเพื่อเปิดใช้งานคีย์', dailyBonus:'โบนัสรายวัน', dailyBonusDesc:'+10 คะแนน/วัน · 100 คะแนน = รางวัล', claimNow:'รับเลย', nextClaim:'รับครั้งถัดไปใน', until:'ถึง' },
  shop: { title:'ร้านค้า', products:'สินค้า', ob52:'OB52 ไม่ถูกตรวจจับ', availableBalance:'ยอดเงินคงเหลือ', approvedInstant:'ยอดเงินที่อนุมัติเพิ่มทันที', addBalance:'เติมเงิน', chooseMethod:'เลือกวิธีชำระเงิน', selectAmount:'เลือกจำนวนเงิน', youWillDeposit:'คุณจะฝาก', continue:'ดำเนินการต่อ', paymentMethod:'วิธีชำระเงิน', sendExactly:'ส่งพอดี', sentPayment:'ฉันส่งเงินแล้ว', txnIdLabel:'รหัสธุรกรรม', txnIdPlaceholder:'วางรหัสธุรกรรม', txnIdDesc:'ใส่รหัสที่ได้รับหลังชำระเงิน', submitPayment:'ส่งการชำระเงิน', submitting:'กำลังส่ง...', back:'กลับ', history:'ประวัติธุรกรรม', noTxns:'ยังไม่มีธุรกรรม', approved:'✓ อนุมัติแล้ว', rejected:'✗ ปฏิเสธ', pending:'⏳ รอดำเนินการ', buy:'ซื้อ', insufficientBalance:'ยอดเงินไม่เพียงพอ', payPalTitle:'ชำระด้วย PayPal', payPalDesc:'ปลอดภัย · ยอดเงินเพิ่มอัตโนมัติ', amount:'จำนวน' },
  license: { title:'เปิดใช้งานคีย์ใบอนุญาต', subtitle:'ใส่คีย์ KeyAuth ของคุณ', placeholder:'วางคีย์ใบอนุญาต', activate:'เปิดใช้งาน', validating:'กำลังตรวจสอบ...', activationFailed:'การเปิดใช้งานล้มเหลว', noLicense:'ไม่มีใบอนุญาตที่ใช้งาน', noLicenseDesc:'วางคีย์ด้านบนเพื่อเริ่ม', internalPanel:'แผง 1999X ภายใน', fakeLagPanel:'แผง 1999X Fake Lag', hwid:'HWID', ip:'IP', lastLogin:'เข้าสู่ระบบล่าสุด', expiry:'หมดอายุ', resetHwid:'รีเซ็ต HWID', resetsLeft:'เหลือเดือนนี้', copy:'คัดลอก', download:'ดาวน์โหลดแผง', downloadDesc:'เวอร์ชันล่าสุด', tutorial:'ดูบทช่วยสอน', tutorialDesc:'คู่มือทีละขั้นตอน', active:'ใช้งานอยู่', expired:'หมดอายุ', boundToAccount:'ใบอนุญาต KeyAuth · ผูกกับบัญชี', keyGenerated:'สร้างคีย์แล้ว!', keyActive:'ใบอนุญาต 3 วันของคุณใช้งานอยู่' },
  bonus: { title:'คะแนนโบนัส', subtitle:'รับทุกวัน · 100 คะแนน =', reward:'รางวัล', yourPoints:'คะแนนของคุณ', progressLabel:'ความคืบหน้าสู่รางวัล', claim:'⚡ รับ +10 คะแนน', claimed:'✓ รับแล้ว!', nextClaim:'รับครั้งถัดไปใน', redeem:'แลกรางวัล', redeemed:'แลกแล้ว', chooseReward:'เลือกรางวัล', redeemDesc:'แลก 100 คะแนน · เลือกรางวัล', getBalance:'รับเงิน $3', getBalanceDesc:'เพิ่มในกระเป๋าทันที', getKey:'รับคีย์ 3 วัน', getKeyDesc:'สร้างอัตโนมัติ', redeemNote:'จะหัก 100 คะแนนจากคุณ', balanceAdded:'เพิ่ม $3 แล้ว!', balanceUpdated:'อัพเดทยอดเงินแล้ว', newBalance:'ยอดเงินใหม่', keyGenTitle:'สร้างคีย์แล้ว!', key3Day:'คีย์ 3 วัน', balance3:'$3 ยอดเงิน', fullAccess:'คีย์เข้าถึงเต็มรูปแบบ', walletCredit:'+$3 ทันที', needMore:'คะแนนเพิ่มเติม', redeemBtn:'แลก' },
  status: { title:'สถานะแผง', allOps:'ระบบทั้งหมดทำงาน', maintenance:'อยู่ระหว่างบำรุงรักษา', liveStats:'สถิติสด', totalUsers:'ผู้ใช้ทั้งหมด', onlineNow:'ออนไลน์ตอนนี้', services:'บริการ', online:'ออนไลน์', announcements:'ประกาศ' },
  announcements: { title:'ประกาศ', subtitle:'ข้อความ', subtitlePlural:'ข้อความ', noAnnouncements:'ยังไม่มีประกาศ', checkBack:'กลับมาตรวจสอบในภายหลัง' },
  chat: { title:'แชทชุมชน', placeholder:'ส่งข้อความ...', send:'ส่ง' },
  support: { title:'สนับสนุน', placeholder:'อธิบายปัญหาของคุณ...' },
  common: { loading:'กำลังโหลด...', error:'ข้อผิดพลาด', cancel:'ยกเลิก', confirm:'ยืนยัน', copy:'คัดลอก', copied:'คัดลอกแล้ว!', done:'เสร็จสิ้น', status:'สถานะ', method:'วิธี', txnId:'รหัสธุรกรรม', or:'หรือ' },
};

// Build translations object — all other languages use English as fallback
const translations: Record<string, Translations> = { en, ar, bn, th };

// Partial translations for remaining languages
const partials: Record<string, Partial<Translations>> = {
  vi: { nav:{ home:'Trang chủ', license:'Giấy phép', chat:'Trò chuyện', shop:'Cửa hàng', bonus:'Thưởng', status:'Trạng thái', support:'Hỗ trợ', signOut:'Đăng xuất' }, auth:{ signIn:'Đăng nhập', subtitle:'Truy cập bảng điều khiển của bạn', continueGoogle:'Tiếp tục với Google', terms:'Đăng nhập đồng nghĩa bạn đồng ý điều khoản', support:'Cần giúp đỡ? Liên hệ Discord →' }, common:{ ...en.common, loading:'Đang tải...', copy:'Sao chép', copied:'Đã sao chép!' } },
  es: { nav:{ home:'Inicio', license:'Licencia', chat:'Chat', shop:'Tienda', bonus:'Bonos', status:'Estado', support:'Soporte', signOut:'Cerrar sesión' }, auth:{ signIn:'Iniciar sesión', subtitle:'Accede a tu panel premium', continueGoogle:'Continuar con Google', terms:'Al iniciar sesión aceptas los términos', support:'¿Necesitas ayuda? Contacta soporte en Discord →' }, common:{ ...en.common, loading:'Cargando...', copy:'Copiar', copied:'¡Copiado!' } },
  pt: { nav:{ home:'Início', license:'Licença', chat:'Chat', shop:'Loja', bonus:'Bônus', status:'Status', support:'Suporte', signOut:'Sair' }, auth:{ signIn:'Entrar', subtitle:'Acesse seu painel premium', continueGoogle:'Continuar com Google', terms:'Ao entrar você concorda com os termos', support:'Precisa de ajuda? Contate o suporte no Discord →' }, common:{ ...en.common, loading:'Carregando...', copy:'Copiar', copied:'Copiado!' } },
  hi: { nav:{ home:'होम', license:'लाइसेंस', chat:'चैट', shop:'शॉप', bonus:'बोनस', status:'स्थिति', support:'सहायता', signOut:'लॉग आउट' }, auth:{ signIn:'लॉग इन', subtitle:'अपना प्रीमियम पैनल एक्सेस करें', continueGoogle:'Google से जारी रखें', terms:'साइन इन करके आप नियमों से सहमत हैं', support:'मदद चाहिए? Discord पर संपर्क करें →' }, common:{ ...en.common, loading:'लोड हो रहा है...', copy:'कॉपी', copied:'कॉपी हो गया!' } },
  fr: { nav:{ home:'Accueil', license:'Licence', chat:'Chat', shop:'Boutique', bonus:'Bonus', status:'Statut', support:'Support', signOut:'Déconnexion' }, auth:{ signIn:'Connexion', subtitle:'Accédez à votre panneau premium', continueGoogle:'Continuer avec Google', terms:'En vous connectant vous acceptez les conditions', support:'Besoin d\'aide? Contactez le support sur Discord →' }, common:{ ...en.common, loading:'Chargement...', copy:'Copier', copied:'Copié!' } },
  de: { nav:{ home:'Startseite', license:'Lizenz', chat:'Chat', shop:'Shop', bonus:'Bonus', status:'Status', support:'Support', signOut:'Abmelden' }, auth:{ signIn:'Anmelden', subtitle:'Zugriff auf Ihr Premium-Panel', continueGoogle:'Mit Google fortfahren', terms:'Mit der Anmeldung stimmen Sie den Bedingungen zu', support:'Hilfe benötigt? Kontaktieren Sie Support auf Discord →' }, common:{ ...en.common, loading:'Laden...', copy:'Kopieren', copied:'Kopiert!' } },
  ja: { nav:{ home:'ホーム', license:'ライセンス', chat:'チャット', shop:'ショップ', bonus:'ボーナス', status:'ステータス', support:'サポート', signOut:'ログアウト' }, auth:{ signIn:'ログイン', subtitle:'プレミアムパネルにアクセス', continueGoogle:'Googleで続ける', terms:'ログインすることで利用規約に同意します', support:'ヘルプ? Discordでサポートに連絡 →' }, common:{ ...en.common, loading:'読み込み中...', copy:'コピー', copied:'コピーしました!' } },
  ko: { nav:{ home:'홈', license:'라이선스', chat:'채팅', shop:'샵', bonus:'보너스', status:'상태', support:'지원', signOut:'로그아웃' }, auth:{ signIn:'로그인', subtitle:'프리미엄 패널 액세스', continueGoogle:'Google로 계속', terms:'로그인하면 이용약관에 동의합니다', support:'도움 필요? Discord에서 지원팀에 연락 →' }, common:{ ...en.common, loading:'로딩 중...', copy:'복사', copied:'복사됨!' } },
  zh: { nav:{ home:'首页', license:'许可证', chat:'聊天', shop:'商店', bonus:'奖励', status:'状态', support:'支持', signOut:'退出' }, auth:{ signIn:'登录', subtitle:'访问您的高级面板', continueGoogle:'使用Google继续', terms:'登录即表示您同意条款', support:'需要帮助？联系Discord支持 →' }, common:{ ...en.common, loading:'加载中...', copy:'复制', copied:'已复制!' } },
  ru: { nav:{ home:'Главная', license:'Лицензия', chat:'Чат', shop:'Магазин', bonus:'Бонус', status:'Статус', support:'Поддержка', signOut:'Выйти' }, auth:{ signIn:'Войти', subtitle:'Доступ к вашей панели', continueGoogle:'Продолжить с Google', terms:'Войдя, вы принимаете условия', support:'Нужна помощь? Свяжитесь в Discord →' }, common:{ ...en.common, loading:'Загрузка...', copy:'Копировать', copied:'Скопировано!' } },
  tr: { nav:{ home:'Ana Sayfa', license:'Lisans', chat:'Sohbet', shop:'Mağaza', bonus:'Bonus', status:'Durum', support:'Destek', signOut:'Çıkış' }, auth:{ signIn:'Giriş', subtitle:'Premium panelinize erişin', continueGoogle:'Google ile devam et', terms:'Giriş yaparak şartları kabul edersiniz', support:'Yardım mı lazım? Discord\'da destek ile iletişime geçin →' }, common:{ ...en.common, loading:'Yükleniyor...', copy:'Kopyala', copied:'Kopyalandı!' } },
};

// Merge partials with English fallback
Object.entries(partials).forEach(([code, partial]) => {
  translations[code] = { ...en, ...partial } as Translations;
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(
      Object.entries(translations).map(([k, v]) => [k, { translation: v }])
    ),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
