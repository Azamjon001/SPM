# 🎨 Azaton Frontend

React + TypeScript + Vite bilan yaratilgan e-commerce frontend.

## 📁 Struktura

```
frontend/
├── src/
│   ├── components/       # UI komponentlari (60+)
│   │   ├── ui/           # Bazaviy UI komponentlar (Radix UI)
│   │   ├── figma/        # Figma dizayndan import
│   │   ├── HomePage.tsx  # Asosiy sahifa
│   │   ├── CompanyPanel.tsx  # Kompaniya paneli
│   │   ├── AdminPanel.tsx    # Admin panel
│   │   └── ...
│   │
│   ├── utils/            # Yordamchi funksiyalar
│   │   ├── api.tsx       # Supabase API
│   │   ├── goApi.ts      # Go Backend API
│   │   ├── cache.tsx     # Kesh boshqaruvi
│   │   ├── translations.tsx  # Lokalizatsiya (Rus/O'zbek)
│   │   └── ...
│   │
│   ├── hooks/            # Custom React hooks
│   ├── styles/           # CSS fayllari
│   ├── App.tsx           # Asosiy app komponenti
│   ├── main.tsx          # Entry point
│   └── index.css         # Global CSS
│
├── index.html            # HTML template
├── package.json          # Dependencies
├── vite.config.ts        # Vite konfiguratsiyasi
└── .npmrc                # NPM konfiguratsiyasi
```

## 🚀 Ishga Tushirish

### Development
```bash
# Dependencies o'rnatish
npm install

# Dev server ishga tushirish
npm run dev
```

### Production Build
```bash
npm run build
```

## 🔧 Texnologiyalar

| Texnologiya | Versiya | Vazifasi |
|-------------|---------|----------|
| React | 18.3.1 | UI framework |
| TypeScript | - | Type safety |
| Vite | 6.3.5 | Build tool |
| Tailwind CSS | - | Styling |
| Radix UI | - | Accessible components |
| React Router | 7.12.0 | Routing |
| Recharts | 2.15.2 | Charts |
| Lucide React | 0.487.0 | Icons |

## 🌐 API Konfiguratsiyasi

Backend API URL ni `.env` faylda sozlash:

```env
VITE_API_URL=http://localhost:8080/api
```

## 📱 Komponentlar

### Asosiy Sahifalar
- `HomePage` - Mahsulotlar ro'yxati, savat
- `CompanyPanel` - Kompaniya boshqaruv paneli
- `AdminPanel` - Admin boshqaruv
- `LoginPage` - Kirish sahifasi

### Kompaniya Paneli
- `DigitalWarehouse` - Inventar boshqaruvi
- `SalesPanel` - Sotuvlar
- `OrdersPanel` - Buyurtmalar
- `AnalyticsPanel` - Statistika
- `BarcodeSearchPanel` - Shtrix-kod qidirish
- `CompanySMMPanel` - SMM boshqaruvi

### Foydalanuvchi Komponentlari
- `ProductCard` - Mahsulot kartasi
- `BottomNavigation` - Pastki navigatsiya
- `LikesPage` - Yoqtirilganlar
- `PaymentPage` - To'lov sahifasi

## 🌍 Lokalizatsiya

Ilova ikki tilda mavjud:
- 🇷🇺 Ruscha
- 🇺🇿 O'zbekcha

```tsx
import { useTranslation } from '../utils/translations';

const t = useTranslation(language);
console.log(t.products); // "Товары" yoki "Mahsulotlar"
```

## 🎨 Tema

Ilova Light/Dark rejimlarni qo'llab-quvvatlaydi:

```tsx
import { ThemeProvider } from './utils/ThemeContext';

// ThemeProvider orqali tema boshqariladi
```

## 📦 Build

```bash
# Production build
npm run build

# Build papkasi: /build
```
