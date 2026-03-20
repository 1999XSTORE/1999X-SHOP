import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: { dashboard: 'Dashboard', products: 'Products', licenses: 'Licenses', chat: 'Community', support: 'Support', panelStatus: 'Panel Status', logout: 'Logout' },
      dashboard: { title: 'Dashboard', balance: 'Balance', addBalance: 'Add Balance', activeKeys: 'Active Keys', totalPurchases: 'Total Purchases', bonusPoints: 'Bonus Points', recentActivity: 'Recent Activity', quickActions: 'Quick Actions' },
      products: { title: 'Products', buy: 'Purchase Now', insufficient: 'Insufficient Balance', perMonth: '/month', features: 'Features' },
      wallet: { title: 'Add Balance', selectAmount: 'Select Amount', paymentMethod: 'Payment Method', transactionId: 'Transaction ID', screenshot: 'Upload Screenshot', submit: 'Submit Payment', history: 'Transaction History', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', custom: 'Custom Amount' },
      licenses: { title: 'My Licenses', key: 'License Key', hwid: 'HWID', lastLogin: 'Last Login', expiry: 'Expires', status: 'Status', active: 'Active', expired: 'Expired', resetHwid: 'Reset HWID', copied: 'Copied!', copy: 'Copy', device: 'Device', ip: 'IP Address', resetsLeft: 'resets left this month' },
      chat: { title: 'Community Chat', placeholder: 'Type a message...', send: 'Send' },
      support: { title: 'Support Chat', tagSupport: 'Tag @support for help' },
      bonus: { title: 'Daily Bonus', claim: 'Claim Bonus', claimed: 'Already Claimed', nextClaim: 'Next claim in', points: 'Points', convert: 'Convert to Discount' },
      announcements: { title: 'Announcements', noAnnouncements: 'No announcements yet' },
      status: { title: 'Panel Status', online: 'All Systems Operational', maintenance: 'Under Maintenance', lastUpdate: 'Last Update' },
      auth: { login: 'Login', loginGoogle: 'Continue with Google', welcome: 'Welcome back', subtitle: 'Sign in to access your dashboard' },
      common: { loading: 'Loading...', error: 'Error', success: 'Success', cancel: 'Cancel', confirm: 'Confirm', save: 'Save', search: 'Search...' }
    }
  },
  ar: { translation: { nav: { dashboard: 'لوحة القيادة', products: 'المنتجات', licenses: 'التراخيص', chat: 'المجتمع', support: 'الدعم', panelStatus: 'حالة اللوحة', logout: 'تسجيل الخروج' }, auth: { login: 'تسجيل الدخول', loginGoogle: 'المتابعة مع Google', welcome: 'مرحبًا بعودتك', subtitle: 'سجّل الدخول للوصول إلى لوحتك' } } },
  bn: { translation: { nav: { dashboard: 'ড্যাশবোর্ড', products: 'পণ্য', licenses: 'লাইসেন্স', chat: 'কমিউনিটি', support: 'সাপোর্ট', panelStatus: 'প্যানেল স্ট্যাটাস', logout: 'লগআউট' }, auth: { login: 'লগইন', loginGoogle: 'Google দিয়ে চালিয়ে যান', welcome: 'স্বাগতম', subtitle: 'আপনার ড্যাশবোর্ড অ্যাক্সেস করুন' } } },
  th: { translation: { nav: { dashboard: 'แดชบอร์ด', products: 'ผลิตภัณฑ์', licenses: 'ใบอนุญาต', chat: 'ชุมชน', support: 'สนับสนุน', panelStatus: 'สถานะแผง', logout: 'ออกจากระบบ' }, auth: { login: 'เข้าสู่ระบบ', loginGoogle: 'ดำเนินการต่อด้วย Google' } } },
  vi: { translation: { nav: { dashboard: 'Bảng điều khiển', products: 'Sản phẩm', licenses: 'Giấy phép', chat: 'Cộng đồng', support: 'Hỗ trợ', panelStatus: 'Trạng thái bảng', logout: 'Đăng xuất' }, auth: { login: 'Đăng nhập', loginGoogle: 'Tiếp tục với Google' } } },
  es: { translation: { nav: { dashboard: 'Panel', products: 'Productos', licenses: 'Licencias', chat: 'Comunidad', support: 'Soporte', panelStatus: 'Estado del panel', logout: 'Cerrar sesión' }, auth: { login: 'Iniciar sesión', loginGoogle: 'Continuar con Google' } } },
  pt: { translation: { nav: { dashboard: 'Painel', products: 'Produtos', licenses: 'Licenças', chat: 'Comunidade', support: 'Suporte', panelStatus: 'Status do painel', logout: 'Sair' }, auth: { login: 'Entrar', loginGoogle: 'Continuar com Google' } } },
  hi: { translation: { nav: { dashboard: 'डैशबोर्ड', products: 'उत्पाद', licenses: 'लाइसेंस', chat: 'समुदाय', support: 'सहायता', panelStatus: 'पैनल स्थिति', logout: 'लॉगआउट' }, auth: { login: 'लॉगिन', loginGoogle: 'Google से जारी रखें' } } },
  si: { translation: { nav: { dashboard: 'උපකරණ පුවරුව', products: 'නිෂ්පාදන', licenses: 'බලපත්‍ර', chat: 'ප්‍රජාව', support: 'සහාය', panelStatus: 'පුවරු තත්ත්වය', logout: 'පිටවීම' }, auth: { login: 'පුරනය', loginGoogle: 'Google සමඟ ඉදිරියට' } } },
  fr: { translation: { nav: { dashboard: 'Tableau de bord', products: 'Produits', licenses: 'Licences', chat: 'Communauté', support: 'Support', panelStatus: 'État du panneau', logout: 'Déconnexion' }, auth: { login: 'Connexion', loginGoogle: 'Continuer avec Google' } } },
  de: { translation: { nav: { dashboard: 'Dashboard', products: 'Produkte', licenses: 'Lizenzen', chat: 'Gemeinschaft', support: 'Support', panelStatus: 'Panel-Status', logout: 'Abmelden' }, auth: { login: 'Anmelden', loginGoogle: 'Weiter mit Google' } } },
  ja: { translation: { nav: { dashboard: 'ダッシュボード', products: '製品', licenses: 'ライセンス', chat: 'コミュニティ', support: 'サポート', panelStatus: 'パネルステータス', logout: 'ログアウト' }, auth: { login: 'ログイン', loginGoogle: 'Googleで続ける' } } },
  ko: { translation: { nav: { dashboard: '대시보드', products: '제품', licenses: '라이선스', chat: '커뮤니티', support: '지원', panelStatus: '패널 상태', logout: '로그아웃' }, auth: { login: '로그인', loginGoogle: 'Google로 계속' } } },
  zh: { translation: { nav: { dashboard: '仪表板', products: '产品', licenses: '许可证', chat: '社区', support: '支持', panelStatus: '面板状态', logout: '退出' }, auth: { login: '登录', loginGoogle: '使用Google继续' } } },
  ru: { translation: { nav: { dashboard: 'Панель', products: 'Продукты', licenses: 'Лицензии', chat: 'Сообщество', support: 'Поддержка', panelStatus: 'Статус панели', logout: 'Выйти' }, auth: { login: 'Войти', loginGoogle: 'Войти через Google' } } },
  tr: { translation: { nav: { dashboard: 'Panel', products: 'Ürünler', licenses: 'Lisanslar', chat: 'Topluluk', support: 'Destek', panelStatus: 'Panel Durumu', logout: 'Çıkış' }, auth: { login: 'Giriş', loginGoogle: 'Google ile devam et' } } },
};

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
});

export default i18n;
