import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ─────────────────────────────────────────────────────────────
//  FULL English master — every string used anywhere in the app
// ─────────────────────────────────────────────────────────────
const en = {
  nav: {
    home: 'Home', license: 'License', chat: 'Chat', shop: 'Shop',
    bonus: 'Bonus', status: 'Status', support: 'Support', signOut: 'Sign Out',
  },
  auth: {
    signIn: 'Sign In', subtitle: 'Access your premium 1999X panel',
    continueGoogle: 'Continue with Google',
    terms: 'By signing in you agree to our Terms of Service',
    support: 'Need help? Contact Support on Discord →',
    trust1: 'Undetected', trust2: 'OB52 Ready', trust3: 'Secure',
  },
  dashboard: {
    welcomeBack: 'Welcome back', balance: 'Balance', activeKeys: 'Active Keys',
    approved: 'Approved', bonusPoints: 'Bonus Pts',
    activeSubscriptions: 'Active Subscriptions',
    noLicense: 'No active licenses', noLicenseDesc: 'Go to Shop to activate your key',
    dailyBonus: 'Daily Bonus', dailyBonusDesc: '+10 pts/day · 100 pts = reward',
    claimNow: 'Claim Now', nextClaim: 'Next claim in', until: 'until',
    undetected: 'OB52 Undetected', activeAccount: 'Active Account',
    // Free 1-hour key
    freeKey: 'Free 1-Hour Trial Key',
    freeKeyDesc: 'One free key every 24 hours — Internal + Fake Lag',
    freeKeyBtn: 'Get Free 1-Hour Key',
    freeKeyCooldown: 'Next free key in',
    freeKeyActive: 'Your free trial key is active',
    freeKeyExpired: 'Free key expired',
    freeKeyGenerating: 'Generating your keys…',
    freeKeyClaimed: 'Free keys generated!',
    freeKeyLag: 'Fake Lag (1h)',
    freeKeyInternal: 'Internal (1h)',
    freeKeyExpiresIn: 'Expires in',
    freeKeyOnePerDay: '1 free set per user every 24 hours',
    freeKeyReveal: 'Click 👁 to reveal',
  },
  shop: {
    title: 'Shop', products: 'Products', ob52: 'OB52 Undetected',
    availableBalance: 'Available Balance',
    activeAccountNote: 'Deposits credited on approval',
    addBalance: 'Add Funds', buyProducts: 'Buy Products',
    chooseAmount: 'Choose Amount to Deposit',
    sendExactly: 'Send exactly', youPayApprox: 'You pay approximately',
    localCurrencyNote: 'Exchange rate is approximate. Actual rate may vary.',
    continue: 'Continue to Payment Method', back: 'Back',
    selectMethod: 'Select Payment Method',
    fillDetails: 'Fill Payment Details',
    yourEmail: 'Your Email', transactionId: 'Transaction ID',
    txnPlaceholder: 'Paste your TXN / reference ID…',
    txnDesc: 'From your payment receipt or confirmation',
    screenshot: 'Payment Screenshot', uploadProof: 'Upload payment proof',
    reviewSubmission: 'Review Your Submission',
    confirmSubmit: 'Confirm & Submit', submitting: 'Submitting…',
    submitted: '✅ Submitted! Admin will approve shortly.',
    history: 'Transaction History', noTxns: 'No transactions yet',
    approved: '✓ Approved', rejected: '✗ Rejected', pending: '⏳ Pending',
    buy: 'Buy', insufficientBalance: 'Insufficient Balance',
    // PayPal auto
    paypalAuto: 'PayPal — Instant Auto-Verified',
    paypalAutoDesc: 'Balance added automatically after payment — no TXN ID needed',
    paypalOpen: 'Pay with PayPal',
    paypalOpened: 'PayPal opened — complete payment',
    paypalStep1: 'Complete payment in the PayPal window',
    paypalStep2: 'Click "I\'ve Paid" below to verify instantly',
    paypalStep3: 'Balance credited automatically — no admin needed',
    iHavePaid: "I've Paid — Verify Now",
    verifying: 'Verifying…',
    verifySuccess: '🎉 Balance credited!',
    verifyFailed: 'Verification failed',
    // Product purchase
    confirmPurchase: 'Confirm Purchase', confirmDesc: 'Review your order',
    total: 'Total', cancel: 'Cancel', confirmBtn: '✅ Confirm Purchase',
    refundNote: 'Balance deducted immediately. Refunded if key fails.',
    purchaseSuccess: 'Purchase Successful!', keyReady: 'Your license is ready',
    keysSaved: "Keys saved to License page. Don't share them.", done: 'Done',
    scanQr: 'Scan QR Code', zoomQr: 'Click to zoom in', qrSoon: 'QR coming soon',
    amount: 'Amount', method: 'Method', refresh: 'Refresh',
  },
  license: {
    title: 'Activate License Key',
    subtitle: 'Enter your KeyAuth license key to activate your panel',
    placeholder: 'Paste your license key here', activate: 'Activate License Key',
    validating: 'Validating…', activationFailed: 'Activation Failed',
    noLicense: 'No active licenses',
    noLicenseDesc: 'Paste your license key above to get started',
    internalPanel: '1999X Internal Panel', fakeLagPanel: '1999X Fake Lag Panel',
    hwid: 'HWID', ip: 'IP', lastLogin: 'Last Login', expiry: 'Expiry',
    resetHwid: 'Reset HWID', resetsLeft: 'left this month',
    copy: 'Copy', download: 'Download Panel', downloadDesc: 'Latest 1999X build',
    tutorial: 'Watch Tutorial', tutorialDesc: 'Step-by-step guide',
    active: 'Active', expired: 'Expired',
    boundToAccount: 'KeyAuth License · Bound to account',
    expiredHistory: 'Expired Licenses', show: 'Show', hide: 'Hide',
    resetConfirm: 'Reset HWID?',
    resetNote: 'Allows use on a different device. Limited to 2 resets per month.',
    yesReset: 'Yes, Reset', cannotUndo: 'This cannot be undone',
  },
  bonus: {
    title: 'Bonus Points', subtitle: 'Earn daily · 100 pts =', reward: 'reward',
    yourPoints: 'Your Points', progressTo: 'Progress to next reward',
    claim: '⚡ Claim +10 Points', claimed: '✓ Claimed!',
    nextClaim: 'Next claim in', redeem: 'Redeem Rewards', redeemed: 'redeemed',
    chooseReward: 'Choose Your Reward', redeemDesc: '100 points · Pick one',
    getBalance: 'Get $3 Balance', getBalanceDesc: 'Added to wallet instantly',
    getKey: 'Get 3-Day Key', getKeyDesc: 'Auto-generated license',
    redeemNote: 'Deducts 100 pts',
    balanceAdded: '$3 Added to Wallet!', keyGenTitle: 'Key Generated!',
    key3Day: '3-Day Key', balance3: '$3 Balance',
    fullAccess: 'Full access', walletCredit: '+$3 wallet credit',
    needMore: 'more pts needed', redeemBtn: 'Redeem',
    keyActive: '3-day license is now active',
  },
  status: {
    title: 'Panel Status', systemStatus: 'System Status',
    allOps: 'All Systems Operational', maintenance: 'Under Maintenance',
    liveStats: 'Live Stats', totalUsers: 'Total Users', onlineNow: 'Online Now',
    services: 'Services', online: 'Online',
    announcements: 'Announcements',
    pushAnnouncement: 'Push Announcement',
    annTitle: 'Title', annContent: 'Content', annType: 'Type',
    publish: 'Publish', publishing: 'Publishing…', published: 'Announcement published!',
    deleteAnn: 'Delete', update: 'Update', feature: 'Feature',
    maintenanceType: 'Maintenance',
    noAnnouncements: 'No announcements yet', checkBack: 'Check back later for updates',
  },
  announcements: {
    title: 'Announcements', noAnn: 'No announcements yet',
    checkBack: 'Check back later for updates',
  },
  chat: {
    title: 'Community Chat', placeholder: 'Send a message…', send: 'Send',
    noMessages: 'No messages yet', beFirst: 'Be the first to say something!',
    loading: 'Loading messages…',
    tip: 'Tip:', online: 'online', live: 'Live',
    privateSupport: 'Private — Support Team only',
    members: 'Members', hide: 'Hide', show: 'Show',
    isTyping: 'is typing', areTyping: 'are typing',
  },
  support: { title: 'Support', placeholder: 'Describe your issue…' },
  common: {
    loading: 'Loading…', error: 'Error', cancel: 'Cancel', confirm: 'Confirm',
    copy: 'Copy', copied: 'Copied!', done: 'Done', status: 'Status',
    method: 'Method', txnId: 'Transaction ID', or: 'or', submit: 'Submit',
    refresh: 'Refresh', close: 'Close', save: 'Save', delete: 'Delete',
    active: 'Active', expired: 'Expired', pending: 'Pending',
    approved: 'Approved', rejected: 'Rejected', back: 'Back',
    noData: 'No data yet', tryAgain: 'Try again', reveal: 'Reveal',
  },
};

type T = typeof en;

// ── Arabic ────────────────────────────────────────────────────
const ar: T = {
  nav: { home:'الرئيسية', license:'الترخيص', chat:'الدردشة', shop:'المتجر', bonus:'المكافآت', status:'الحالة', support:'الدعم', signOut:'خروج' },
  auth: { signIn:'تسجيل الدخول', subtitle:'الوصول إلى لوحة 1999X المميزة', continueGoogle:'المتابعة مع Google', terms:'بتسجيل الدخول، توافق على شروط الخدمة', support:'تحتاج مساعدة؟ تواصل معنا على Discord ←', trust1:'غير مكتشف', trust2:'OB52 جاهز', trust3:'آمن' },
  dashboard: { welcomeBack:'مرحبًا بعودتك', balance:'الرصيد', activeKeys:'المفاتيح النشطة', approved:'موافق', bonusPoints:'نقاط المكافأة', activeSubscriptions:'الاشتراكات النشطة', noLicense:'لا توجد تراخيص نشطة', noLicenseDesc:'اذهب للمتجر لتفعيل مفتاحك', dailyBonus:'المكافأة اليومية', dailyBonusDesc:'+١٠ نقاط/يوم · ١٠٠ نقطة = مكافأة', claimNow:'احصل الآن', nextClaim:'التالي في', until:'حتى', undetected:'OB52 غير مكتشف', activeAccount:'حساب نشط', freeKey:'مفتاح تجريبي مجاني لساعة', freeKeyDesc:'مفتاح مجاني واحد كل ٢٤ ساعة', freeKeyBtn:'احصل على مفتاح مجاني', freeKeyCooldown:'المفتاح التالي في', freeKeyActive:'مفتاحك المجاني نشط', freeKeyExpired:'انتهى المفتاح المجاني', freeKeyGenerating:'جارٍ إنشاء المفاتيح…', freeKeyClaimed:'تم إنشاء المفاتيح!', freeKeyLag:'تأخير مزيف (١ ساعة)', freeKeyInternal:'داخلي (١ ساعة)', freeKeyExpiresIn:'ينتهي في', freeKeyOnePerDay:'مفتاح واحد لكل مستخدم كل ٢٤ ساعة', freeKeyReveal:'انقر 👁 للكشف' },
  shop: { title:'المتجر', products:'المنتجات', ob52:'OB52 غير مكتشف', availableBalance:'الرصيد المتاح', activeAccountNote:'الإيداعات معتمدة عند الموافقة', addBalance:'إضافة رصيد', buyProducts:'شراء المنتجات', chooseAmount:'اختر مبلغ الإيداع', sendExactly:'أرسل بالضبط', youPayApprox:'تدفع تقريبًا', localCurrencyNote:'سعر الصرف تقريبي.', continue:'متابعة', back:'رجوع', selectMethod:'اختر طريقة الدفع', fillDetails:'أدخل بيانات الدفع', yourEmail:'بريدك الإلكتروني', transactionId:'رقم المعاملة', txnPlaceholder:'الصق رقم المعاملة…', txnDesc:'من إيصال الدفع', screenshot:'لقطة الدفع', uploadProof:'ارفع إثبات', reviewSubmission:'مراجعة طلبك', confirmSubmit:'تأكيد وإرسال', submitting:'جارٍ الإرسال…', submitted:'✅ تم الإرسال!', history:'سجل المعاملات', noTxns:'لا توجد معاملات', approved:'✓ موافق', rejected:'✗ مرفوض', pending:'⏳ انتظار', buy:'شراء', insufficientBalance:'رصيد غير كافٍ', paypalAuto:'PayPal — تحقق تلقائي فوري', paypalAutoDesc:'يضاف الرصيد تلقائيًا — لا يلزم رقم معاملة', paypalOpen:'الدفع عبر PayPal', paypalOpened:'تم فتح PayPal', paypalStep1:'أكمل الدفع في نافذة PayPal', paypalStep2:'انقر "لقد دفعت" للتحقق', paypalStep3:'يضاف الرصيد تلقائيًا', iHavePaid:'لقد دفعت — تحقق الآن', verifying:'جارٍ التحقق…', verifySuccess:'🎉 تم إضافة الرصيد!', verifyFailed:'فشل التحقق', confirmPurchase:'تأكيد الشراء', confirmDesc:'راجع طلبك', total:'المجموع', cancel:'إلغاء', confirmBtn:'✅ تأكيد', refundNote:'يُخصم فورًا. يُسترد عند الفشل.', purchaseSuccess:'تم الشراء بنجاح!', keyReady:'ترخيصك جاهز', keysSaved:'المفاتيح في صفحة الترخيص.', done:'تم', scanQr:'امسح رمز QR', zoomQr:'انقر للتكبير', qrSoon:'QR قريبًا', amount:'المبلغ', method:'الطريقة', refresh:'تحديث' },
  license: { title:'تفعيل مفتاح الترخيص', subtitle:'أدخل مفتاح KeyAuth', placeholder:'الصق المفتاح هنا', activate:'تفعيل', validating:'جارٍ التحقق…', activationFailed:'فشل التفعيل', noLicense:'لا توجد تراخيص', noLicenseDesc:'الصق المفتاح أعلاه للبدء', internalPanel:'لوحة 1999X الداخلية', fakeLagPanel:'لوحة 1999X المزيفة', hwid:'HWID', ip:'IP', lastLogin:'آخر دخول', expiry:'الانتهاء', resetHwid:'إعادة HWID', resetsLeft:'متبقية', copy:'نسخ', download:'تحميل', downloadDesc:'أحدث إصدار', tutorial:'شرح', tutorialDesc:'دليل خطوة بخطوة', active:'نشط', expired:'منتهي', boundToAccount:'مرتبط بالحساب', expiredHistory:'المنتهية', show:'عرض', hide:'إخفاء', resetConfirm:'إعادة HWID؟', resetNote:'مرتين شهريًا.', yesReset:'نعم', cannotUndo:'لا رجعة فيه' },
  bonus: { title:'نقاط المكافأة', subtitle:'اكسب يوميًا · ١٠٠ نقطة =', reward:'مكافأة', yourPoints:'نقاطك', progressTo:'التقدم للمكافأة', claim:'⚡ +١٠ نقاط', claimed:'✓ تم!', nextClaim:'التالي في', redeem:'استبدال', redeemed:'استُبدل', chooseReward:'اختر مكافأتك', redeemDesc:'١٠٠ نقطة', getBalance:'$٣ رصيد', getBalanceDesc:'فوري', getKey:'مفتاح ٣ أيام', getKeyDesc:'تلقائي', redeemNote:'يخصم ١٠٠ نقطة', balanceAdded:'تمت إضافة $٣!', keyGenTitle:'تم إنشاء المفتاح!', key3Day:'٣ أيام', balance3:'$٣', fullAccess:'وصول كامل', walletCredit:'+$٣', needMore:'نقاط إضافية', redeemBtn:'استبدال', keyActive:'مفتاح ٣ أيام نشط' },
  status: { title:'حالة اللوحة', systemStatus:'حالة النظام', allOps:'جميع الأنظمة تعمل', maintenance:'تحت الصيانة', liveStats:'إحصائيات مباشرة', totalUsers:'إجمالي المستخدمين', onlineNow:'متصل الآن', services:'الخدمات', online:'متصل', announcements:'الإعلانات', pushAnnouncement:'إضافة إعلان', annTitle:'العنوان', annContent:'المحتوى', annType:'النوع', publish:'نشر', publishing:'جارٍ النشر…', published:'تم نشر الإعلان!', deleteAnn:'حذف', update:'تحديث', feature:'ميزة', maintenanceType:'صيانة', noAnnouncements:'لا توجد إعلانات', checkBack:'تحقق لاحقًا' },
  announcements: { title:'الإعلانات', noAnn:'لا توجد إعلانات بعد', checkBack:'تحقق لاحقًا' },
  chat: { title:'الدردشة المجتمعية', placeholder:'أرسل رسالة…', send:'إرسال', noMessages:'لا توجد رسائل', beFirst:'كن أول من يتحدث!', loading:'جارٍ التحميل…', tip:'نصيحة:', online:'متصل', live:'مباشر', privateSupport:'خاص — فريق الدعم فقط', members:'الأعضاء', hide:'إخفاء', show:'عرض', isTyping:'يكتب', areTyping:'يكتبون' },
  support: { title:'الدعم', placeholder:'اشرح مشكلتك…' },
  common: { loading:'تحميل…', error:'خطأ', cancel:'إلغاء', confirm:'تأكيد', copy:'نسخ', copied:'تم النسخ!', done:'تم', status:'الحالة', method:'الطريقة', txnId:'رقم المعاملة', or:'أو', submit:'إرسال', refresh:'تحديث', close:'إغلاق', save:'حفظ', delete:'حذف', active:'نشط', expired:'منتهي', pending:'انتظار', approved:'موافق', rejected:'مرفوض', back:'رجوع', noData:'لا بيانات', tryAgain:'حاول مجددًا', reveal:'كشف' },
};

// ── Bengali ───────────────────────────────────────────────────
const bn: T = {
  nav: { home:'হোম', license:'লাইসেন্স', chat:'চ্যাট', shop:'শপ', bonus:'বোনাস', status:'স্ট্যাটাস', support:'সাপোর্ট', signOut:'সাইন আউট' },
  auth: { signIn:'সাইন ইন', subtitle:'আপনার 1999X প্যানেল অ্যাক্সেস করুন', continueGoogle:'Google দিয়ে চালিয়ে যান', terms:'সাইন ইন করে শর্তে সম্মত হচ্ছেন', support:'সাহায্য? Discord-এ যোগাযোগ করুন →', trust1:'আনডিটেক্টেড', trust2:'OB52 রেডি', trust3:'নিরাপদ' },
  dashboard: { welcomeBack:'স্বাগতম', balance:'ব্যালেন্স', activeKeys:'সক্রিয় কী', approved:'অনুমোদিত', bonusPoints:'বোনাস পয়েন্ট', activeSubscriptions:'সক্রিয় সাবস্ক্রিপশন', noLicense:'কোনো সক্রিয় লাইসেন্স নেই', noLicenseDesc:'শপে যান', dailyBonus:'দৈনিক বোনাস', dailyBonusDesc:'+১০ পয়েন্ট/দিন · ১০০ = পুরস্কার', claimNow:'এখনই নিন', nextClaim:'পরবর্তী', until:'পর্যন্ত', undetected:'OB52 আনডিটেক্টেড', activeAccount:'সক্রিয় অ্যাকাউন্ট', freeKey:'বিনামূল্যে ১ ঘণ্টার কী', freeKeyDesc:'প্রতি ২৪ ঘণ্টায় একটি বিনামূল্যে কী', freeKeyBtn:'বিনামূল্যে কী নিন', freeKeyCooldown:'পরবর্তী কী', freeKeyActive:'আপনার বিনামূল্যে কী সক্রিয়', freeKeyExpired:'মেয়াদোত্তীর্ণ', freeKeyGenerating:'কী তৈরি হচ্ছে…', freeKeyClaimed:'কী তৈরি হয়েছে!', freeKeyLag:'ফেক ল্যাগ (১ঘণ্টা)', freeKeyInternal:'ইন্টার্নাল (১ঘণ্টা)', freeKeyExpiresIn:'মেয়াদ শেষ', freeKeyOnePerDay:'প্রতি ২৪ ঘণ্টায় ১টি', freeKeyReveal:'👁 ক্লিক করুন' },
  shop: { title:'শপ', products:'পণ্য', ob52:'OB52 আনডিটেক্টেড', availableBalance:'উপলব্ধ ব্যালেন্স', activeAccountNote:'অনুমোদিত জমা যোগ হয়', addBalance:'ব্যালেন্স যোগ', buyProducts:'পণ্য কিনুন', chooseAmount:'পরিমাণ বেছে নিন', sendExactly:'ঠিক এই পরিমাণ', youPayApprox:'আপনি পরিশোধ করবেন', localCurrencyNote:'বিনিময় হার আনুমানিক।', continue:'চালিয়ে যান', back:'পেছনে', selectMethod:'পেমেন্ট পদ্ধতি', fillDetails:'বিবরণ পূরণ', yourEmail:'আপনার ইমেইল', transactionId:'লেনদেন আইডি', txnPlaceholder:'লেনদেন আইডি পেস্ট করুন…', txnDesc:'পেমেন্টের পর প্রাপ্ত', screenshot:'পেমেন্ট স্ক্রিনশট', uploadProof:'প্রমাণ আপলোড', reviewSubmission:'জমা পর্যালোচনা', confirmSubmit:'নিশ্চিত করুন', submitting:'জমা হচ্ছে…', submitted:'✅ জমা হয়েছে!', history:'ইতিহাস', noTxns:'কোনো লেনদেন নেই', approved:'✓ অনুমোদিত', rejected:'✗ প্রত্যাখ্যাত', pending:'⏳ অপেক্ষমান', buy:'কিনুন', insufficientBalance:'অপর্যাপ্ত ব্যালেন্স', paypalAuto:'PayPal — তাৎক্ষণিক', paypalAutoDesc:'পেমেন্টের পর স্বয়ংক্রিয়', paypalOpen:'PayPal দিয়ে দিন', paypalOpened:'PayPal খোলা হয়েছে', paypalStep1:'PayPal-এ পেমেন্ট করুন', paypalStep2:'"পেমেন্ট করেছি" ক্লিক করুন', paypalStep3:'স্বয়ংক্রিয়ভাবে যোগ হবে', iHavePaid:'পেমেন্ট করেছি — যাচাই করুন', verifying:'যাচাই হচ্ছে…', verifySuccess:'🎉 ব্যালেন্স যোগ হয়েছে!', verifyFailed:'যাচাই ব্যর্থ', confirmPurchase:'কেনা নিশ্চিত করুন', confirmDesc:'অর্ডার পর্যালোচনা', total:'মোট', cancel:'বাতিল', confirmBtn:'✅ নিশ্চিত', refundNote:'অবিলম্বে কাটা হবে।', purchaseSuccess:'কেনা সফল!', keyReady:'লাইসেন্স প্রস্তুত', keysSaved:'লাইসেন্স পেজে সংরক্ষিত।', done:'সম্পন্ন', scanQr:'QR স্ক্যান করুন', zoomQr:'বড় করতে ক্লিক', qrSoon:'QR শীঘ্রই', amount:'পরিমাণ', method:'পদ্ধতি', refresh:'রিফ্রেশ' },
  license: { title:'লাইসেন্স কী সক্রিয় করুন', subtitle:'KeyAuth কী লিখুন', placeholder:'কী পেস্ট করুন', activate:'সক্রিয় করুন', validating:'যাচাই হচ্ছে…', activationFailed:'ব্যর্থ', noLicense:'কোনো সক্রিয় লাইসেন্স নেই', noLicenseDesc:'উপরে কী পেস্ট করুন', internalPanel:'1999X ইন্টার্নাল প্যানেল', fakeLagPanel:'1999X ফেক ল্যাগ', hwid:'HWID', ip:'IP', lastLogin:'শেষ লগইন', expiry:'মেয়াদ', resetHwid:'HWID রিসেট', resetsLeft:'বাকি', copy:'কপি', download:'ডাউনলোড', downloadDesc:'সর্বশেষ বিল্ড', tutorial:'টিউটোরিয়াল', tutorialDesc:'ধাপে ধাপে গাইড', active:'সক্রিয়', expired:'মেয়াদোত্তীর্ণ', boundToAccount:'অ্যাকাউন্টে আবদ্ধ', expiredHistory:'মেয়াদোত্তীর্ণ', show:'দেখান', hide:'লুকান', resetConfirm:'HWID রিসেট করবেন?', resetNote:'মাসে ২ বার।', yesReset:'হ্যাঁ', cannotUndo:'পূর্বাবস্থায় ফেরানো যাবে না' },
  bonus: { title:'বোনাস পয়েন্ট', subtitle:'প্রতিদিন · ১০০ পয়েন্ট =', reward:'পুরস্কার', yourPoints:'আপনার পয়েন্ট', progressTo:'পুরস্কারের দিকে', claim:'⚡ +১০ পয়েন্ট', claimed:'✓ নেওয়া হয়েছে!', nextClaim:'পরবর্তী', redeem:'রিডিম', redeemed:'রিডিম হয়েছে', chooseReward:'পুরস্কার বেছে নিন', redeemDesc:'১০০ পয়েন্ট', getBalance:'$৩ ব্যালেন্স', getBalanceDesc:'তাৎক্ষণিক', getKey:'৩ দিনের কী', getKeyDesc:'স্বয়ংক্রিয়', redeemNote:'১০০ পয়েন্ট কাটা হবে', balanceAdded:'$৩ যোগ হয়েছে!', keyGenTitle:'কী তৈরি!', key3Day:'৩ দিন', balance3:'$৩', fullAccess:'সম্পূর্ণ', walletCredit:'+$৩', needMore:'আরো পয়েন্ট', redeemBtn:'রিডিম', keyActive:'কী সক্রিয়' },
  status: { title:'প্যানেল স্ট্যাটাস', systemStatus:'সিস্টেম স্ট্যাটাস', allOps:'সব সিস্টেম চালু', maintenance:'রক্ষণাবেক্ষণ', liveStats:'লাইভ পরিসংখ্যান', totalUsers:'মোট ব্যবহারকারী', onlineNow:'এখন অনলাইন', services:'সেবা', online:'অনলাইন', announcements:'ঘোষণা', pushAnnouncement:'ঘোষণা পাঠান', annTitle:'শিরোনাম', annContent:'বিষয়বস্তু', annType:'ধরন', publish:'প্রকাশ', publishing:'প্রকাশ হচ্ছে…', published:'ঘোষণা প্রকাশিত!', deleteAnn:'মুছুন', update:'আপডেট', feature:'ফিচার', maintenanceType:'রক্ষণাবেক্ষণ', noAnnouncements:'কোনো ঘোষণা নেই', checkBack:'পরে আবার দেখুন' },
  announcements: { title:'ঘোষণা', noAnn:'কোনো ঘোষণা নেই', checkBack:'পরে দেখুন' },
  chat: { title:'কমিউনিটি চ্যাট', placeholder:'বার্তা পাঠান…', send:'পাঠান', noMessages:'কোনো বার্তা নেই', beFirst:'প্রথম বলুন!', loading:'লোড হচ্ছে…', tip:'টিপ:', online:'অনলাইন', live:'লাইভ', privateSupport:'ব্যক্তিগত — শুধু সাপোর্ট', members:'সদস্য', hide:'লুকান', show:'দেখান', isTyping:'টাইপ করছে', areTyping:'টাইপ করছে' },
  support: { title:'সাপোর্ট', placeholder:'সমস্যা বর্ণনা করুন…' },
  common: { loading:'লোড হচ্ছে…', error:'ত্রুটি', cancel:'বাতিল', confirm:'নিশ্চিত', copy:'কপি', copied:'কপি হয়েছে!', done:'সম্পন্ন', status:'স্ট্যাটাস', method:'পদ্ধতি', txnId:'লেনদেন আইডি', or:'বা', submit:'জমা', refresh:'রিফ্রেশ', close:'বন্ধ', save:'সেভ', delete:'মুছুন', active:'সক্রিয়', expired:'মেয়াদোত্তীর্ণ', pending:'অপেক্ষমান', approved:'অনুমোদিত', rejected:'প্রত্যাখ্যাত', back:'পেছনে', noData:'কোনো ডেটা নেই', tryAgain:'আবার চেষ্টা', reveal:'দেখুন' },
};

// ── Thai ──────────────────────────────────────────────────────
const th: T = {
  nav: { home:'หน้าแรก', license:'ใบอนุญาต', chat:'แชท', shop:'ร้านค้า', bonus:'โบนัส', status:'สถานะ', support:'สนับสนุน', signOut:'ออกจากระบบ' },
  auth: { signIn:'เข้าสู่ระบบ', subtitle:'เข้าถึงแผง 1999X ของคุณ', continueGoogle:'ดำเนินการด้วย Google', terms:'การเข้าสู่ระบบแสดงว่าคุณยอมรับเงื่อนไข', support:'ต้องการความช่วยเหลือ? ติดต่อ Discord →', trust1:'ไม่ถูกตรวจจับ', trust2:'OB52 พร้อม', trust3:'ปลอดภัย' },
  dashboard: { welcomeBack:'ยินดีต้อนรับกลับ', balance:'ยอดเงิน', activeKeys:'คีย์ที่ใช้งาน', approved:'อนุมัติ', bonusPoints:'คะแนนโบนัส', activeSubscriptions:'การสมัครสมาชิก', noLicense:'ไม่มีใบอนุญาต', noLicenseDesc:'ไปที่ร้านค้า', dailyBonus:'โบนัสรายวัน', dailyBonusDesc:'+10 แต้ม/วัน · 100 แต้ม = รางวัล', claimNow:'รับตอนนี้', nextClaim:'รับครั้งถัดไปใน', until:'ถึง', undetected:'OB52 ไม่ถูกตรวจจับ', activeAccount:'บัญชีใช้งาน', freeKey:'คีย์ทดลองฟรี 1 ชั่วโมง', freeKeyDesc:'คีย์ฟรีทุก 24 ชั่วโมง', freeKeyBtn:'รับคีย์ฟรี', freeKeyCooldown:'คีย์ถัดไปใน', freeKeyActive:'คีย์ฟรีของคุณใช้งานได้', freeKeyExpired:'คีย์ฟรีหมดอายุ', freeKeyGenerating:'กำลังสร้างคีย์…', freeKeyClaimed:'สร้างคีย์สำเร็จ!', freeKeyLag:'Fake Lag (1ชม)', freeKeyInternal:'Internal (1ชม)', freeKeyExpiresIn:'หมดอายุใน', freeKeyOnePerDay:'1 คีย์ต่อผู้ใช้ทุก 24 ชั่วโมง', freeKeyReveal:'คลิก 👁 เพื่อดู' },
  shop: { ...en.shop, title:'ร้านค้า', products:'สินค้า', ob52:'OB52 ไม่ถูกตรวจจับ', availableBalance:'ยอดเงินที่มี', addBalance:'เติมเงิน', buyProducts:'ซื้อสินค้า', chooseAmount:'เลือกจำนวนเงิน', sendExactly:'ส่งเงินจำนวนนี้', continue:'ดำเนินการต่อ', back:'กลับ', selectMethod:'เลือกวิธีชำระ', fillDetails:'กรอกรายละเอียด', yourEmail:'อีเมลของคุณ', transactionId:'รหัสธุรกรรม', history:'ประวัติ', noTxns:'ไม่มีธุรกรรม', approved:'✓ อนุมัติ', rejected:'✗ ปฏิเสธ', pending:'⏳ รอดำเนินการ', buy:'ซื้อ', insufficientBalance:'ยอดเงินไม่เพียงพอ', cancel:'ยกเลิก', done:'เสร็จสิ้น', amount:'จำนวน', method:'วิธี', refresh:'รีเฟรช' },
  license: { ...en.license, title:'เปิดใช้งานคีย์ใบอนุญาต', subtitle:'ใส่คีย์ KeyAuth', placeholder:'วางคีย์ของคุณที่นี่', activate:'เปิดใช้งาน', validating:'กำลังตรวจสอบ…', noLicense:'ไม่มีใบอนุญาต', noLicenseDesc:'วางคีย์ด้านบน', active:'ใช้งาน', expired:'หมดอายุ', copy:'คัดลอก', show:'แสดง', hide:'ซ่อน' },
  bonus: { ...en.bonus, title:'คะแนนโบนัส', claim:'⚡ +10 คะแนน', claimed:'✓ รับแล้ว!', redeem:'แลกรางวัล', redeemBtn:'แลก' },
  status: { ...en.status, title:'สถานะแผง', allOps:'ระบบทำงานปกติ', maintenance:'อยู่ระหว่างบำรุงรักษา', liveStats:'สถิติสด', totalUsers:'ผู้ใช้ทั้งหมด', onlineNow:'ออนไลน์ตอนนี้', services:'บริการ', online:'ออนไลน์', announcements:'ประกาศ', publish:'เผยแพร่', noAnnouncements:'ไม่มีประกาศ', checkBack:'ตรวจสอบในภายหลัง' },
  announcements: { title:'ประกาศ', noAnn:'ไม่มีประกาศ', checkBack:'ตรวจสอบในภายหลัง' },
  chat: { ...en.chat, title:'แชทชุมชน', placeholder:'ส่งข้อความ…', send:'ส่ง', noMessages:'ยังไม่มีข้อความ', beFirst:'เป็นคนแรกที่พูด!', loading:'กำลังโหลด…', online:'ออนไลน์', members:'สมาชิก', hide:'ซ่อน', show:'แสดง' },
  support: { title:'สนับสนุน', placeholder:'อธิบายปัญหาของคุณ…' },
  common: { ...en.common, loading:'กำลังโหลด…', copy:'คัดลอก', copied:'คัดลอกแล้ว!', or:'หรือ', cancel:'ยกเลิก', done:'เสร็จสิ้น', refresh:'รีเฟรช', back:'กลับ', active:'ใช้งาน', expired:'หมดอายุ', pending:'รอดำเนินการ', approved:'อนุมัติ', rejected:'ปฏิเสธ', delete:'ลบ' },
};

// ── All other languages: nav + auth fully translated, rest fallback to en ──
const partials: Record<string, Partial<T>> = {
  vi: { nav:{ home:'Trang chủ', license:'Giấy phép', chat:'Trò chuyện', shop:'Cửa hàng', bonus:'Thưởng', status:'Trạng thái', support:'Hỗ trợ', signOut:'Đăng xuất' }, auth:{ signIn:'Đăng nhập', subtitle:'Truy cập bảng điều khiển 1999X', continueGoogle:'Tiếp tục với Google', terms:'Đăng nhập đồng nghĩa đồng ý điều khoản', support:'Cần giúp? Discord →', trust1:'Không bị phát hiện', trust2:'OB52 Sẵn sàng', trust3:'Bảo mật' }, common:{ ...en.common, loading:'Đang tải…', copy:'Sao chép', copied:'Đã sao chép!', or:'hoặc', back:'Quay lại' } },
  es: { nav:{ home:'Inicio', license:'Licencia', chat:'Chat', shop:'Tienda', bonus:'Bonos', status:'Estado', support:'Soporte', signOut:'Cerrar sesión' }, auth:{ signIn:'Iniciar sesión', subtitle:'Accede a tu panel 1999X', continueGoogle:'Continuar con Google', terms:'Al iniciar sesión aceptas los términos', support:'¿Ayuda? Discord →', trust1:'No detectado', trust2:'OB52 Listo', trust3:'Seguro' }, common:{ ...en.common, loading:'Cargando…', copy:'Copiar', copied:'¡Copiado!', or:'o', cancel:'Cancelar', done:'Hecho', back:'Volver' } },
  pt: { nav:{ home:'Início', license:'Licença', chat:'Chat', shop:'Loja', bonus:'Bônus', status:'Status', support:'Suporte', signOut:'Sair' }, auth:{ signIn:'Entrar', subtitle:'Acesse seu painel 1999X', continueGoogle:'Continuar com Google', terms:'Ao entrar você concorda com os termos', support:'Ajuda? Discord →', trust1:'Não detectado', trust2:'OB52 Pronto', trust3:'Seguro' }, common:{ ...en.common, loading:'Carregando…', copy:'Copiar', copied:'Copiado!', or:'ou', back:'Voltar' } },
  hi: { nav:{ home:'होम', license:'लाइसेंस', chat:'चैट', shop:'शॉप', bonus:'बोनस', status:'स्थिति', support:'सहायता', signOut:'लॉग आउट' }, auth:{ signIn:'लॉग इन', subtitle:'अपना 1999X पैनल एक्सेस करें', continueGoogle:'Google से जारी रखें', terms:'साइन इन करके नियमों से सहमत हैं', support:'मदद? Discord →', trust1:'अनडिटेक्टेड', trust2:'OB52 रेडी', trust3:'सुरक्षित' }, common:{ ...en.common, loading:'लोड हो रहा है…', copy:'कॉपी', copied:'कॉपी हो गया!', or:'या', back:'वापस' } },
  fr: { nav:{ home:'Accueil', license:'Licence', chat:'Chat', shop:'Boutique', bonus:'Bonus', status:'Statut', support:'Support', signOut:'Déconnexion' }, auth:{ signIn:'Connexion', subtitle:'Accédez à votre panneau 1999X', continueGoogle:'Continuer avec Google', terms:'En vous connectant vous acceptez les conditions', support:'Aide? Discord →', trust1:'Non détecté', trust2:'OB52 Prêt', trust3:'Sécurisé' }, common:{ ...en.common, loading:'Chargement…', copy:'Copier', copied:'Copié!', or:'ou', back:'Retour' } },
  de: { nav:{ home:'Startseite', license:'Lizenz', chat:'Chat', shop:'Shop', bonus:'Bonus', status:'Status', support:'Support', signOut:'Abmelden' }, auth:{ signIn:'Anmelden', subtitle:'Zugriff auf Ihr 1999X-Panel', continueGoogle:'Mit Google fortfahren', terms:'Mit Anmeldung stimmen Sie zu', support:'Hilfe? Discord →', trust1:'Nicht erkannt', trust2:'OB52 Bereit', trust3:'Sicher' }, common:{ ...en.common, loading:'Laden…', copy:'Kopieren', copied:'Kopiert!', or:'oder', back:'Zurück' } },
  ja: { nav:{ home:'ホーム', license:'ライセンス', chat:'チャット', shop:'ショップ', bonus:'ボーナス', status:'ステータス', support:'サポート', signOut:'ログアウト' }, auth:{ signIn:'ログイン', subtitle:'1999Xパネルにアクセス', continueGoogle:'Googleで続ける', terms:'ログインで利用規約に同意', support:'ヘルプ? Discord →', trust1:'未検出', trust2:'OB52対応', trust3:'安全' }, common:{ ...en.common, loading:'読み込み中…', copy:'コピー', copied:'コピーしました!', or:'または', back:'戻る' } },
  ko: { nav:{ home:'홈', license:'라이선스', chat:'채팅', shop:'샵', bonus:'보너스', status:'상태', support:'지원', signOut:'로그아웃' }, auth:{ signIn:'로그인', subtitle:'1999X 패널 액세스', continueGoogle:'Google로 계속', terms:'로그인하면 이용약관에 동의합니다', support:'도움? Discord →', trust1:'감지 안됨', trust2:'OB52 준비', trust3:'안전' }, common:{ ...en.common, loading:'로딩 중…', copy:'복사', copied:'복사됨!', or:'또는', back:'뒤로' } },
  zh: { nav:{ home:'首页', license:'许可证', chat:'聊天', shop:'商店', bonus:'奖励', status:'状态', support:'支持', signOut:'退出' }, auth:{ signIn:'登录', subtitle:'访问您的1999X面板', continueGoogle:'使用Google继续', terms:'登录即表示同意条款', support:'需要帮助？Discord →', trust1:'未被检测', trust2:'OB52就绪', trust3:'安全' }, common:{ ...en.common, loading:'加载中…', copy:'复制', copied:'已复制!', or:'或', back:'返回' } },
  ru: { nav:{ home:'Главная', license:'Лицензия', chat:'Чат', shop:'Магазин', bonus:'Бонус', status:'Статус', support:'Поддержка', signOut:'Выйти' }, auth:{ signIn:'Войти', subtitle:'Доступ к вашему 1999X', continueGoogle:'Продолжить с Google', terms:'Войдя, вы принимаете условия', support:'Помощь? Discord →', trust1:'Не обнаружен', trust2:'OB52 Готов', trust3:'Безопасно' }, common:{ ...en.common, loading:'Загрузка…', copy:'Копировать', copied:'Скопировано!', or:'или', back:'Назад' } },
  tr: { nav:{ home:'Ana Sayfa', license:'Lisans', chat:'Sohbet', shop:'Mağaza', bonus:'Bonus', status:'Durum', support:'Destek', signOut:'Çıkış' }, auth:{ signIn:'Giriş', subtitle:'1999X panelinize erişin', continueGoogle:'Google ile devam et', terms:'Giriş yaparak şartları kabul edersiniz', support:'Yardım? Discord →', trust1:'Tespit edilmedi', trust2:'OB52 Hazır', trust3:'Güvenli' }, common:{ ...en.common, loading:'Yükleniyor…', copy:'Kopyala', copied:'Kopyalandı!', or:'veya', back:'Geri' } },
};

// Build full translations: en/ar/bn/th fully typed; rest = en merged with partial
const resources: Record<string, { translation: T }> = {
  en: { translation: en },
  ar: { translation: ar },
  bn: { translation: bn },
  th: { translation: th },
};
Object.entries(partials).forEach(([code, partial]) => {
  resources[code] = { translation: { ...en, ...partial } as T };
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
