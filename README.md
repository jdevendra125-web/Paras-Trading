# Paras Trading — Premium Billing Platform v2.0

<div align="center">
  <h3>🚀 Modern GST Billing & Business Management Platform</h3>
  <p>Built with React + Vite + TypeScript + Tailwind CSS + Supabase</p>
</div>

---

## ✨ Features

- **GST Invoice Generation** — Goods & Service formats with automatic GST calculations
- **Customer Management** — Full CRUD with GSTIN, state codes, contact info
- **Items Master** — Product catalog with HSN codes and GST rates
- **Receipts & Payments** — Bank and cash transactions (CR/DR)
- **Outstanding Tracker** — Customer-wise pending payment dashboard
- **Bank Import** — Import bank statements via CSV/Excel
- **Reports & Analytics** — Revenue charts, monthly breakdown
- **Customer Statements** — Full ledger with debit/credit history
- **PDF Download** — Print-ready invoice generation
- **Dark Premium UI** — Glassmorphism design with neon accents
- **PWA Support** — Install as app on any device
- **Capacitor Ready** — Convert to Android/iOS native app

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Routing | React Router v6 |
| Backend | Supabase (Auth + Database) |
| PDF | jsPDF + html2canvas |
| Excel | SheetJS (xlsx) |
| Icons | Lucide React |
| PWA | vite-plugin-pwa |
| Mobile | Capacitor v6 |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/paras-trading.git
cd paras-trading
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Setup Supabase Database
Run the SQL files in your Supabase SQL editor in order:
```
supabase-schema.sql
01-multi-tenant-migration.sql
02-settings-migration.sql
03-feature-updates-migration.sql
```

### 4. Run Development Server
```bash
npm run dev
```

Open http://localhost:5173

---

## 📱 PWA Installation

The app supports "Add to Home Screen" on mobile devices.
- Open the app URL in Chrome/Safari
- Tap the browser menu → "Add to Home Screen" or "Install App"

---

## 📦 Android App Build (Capacitor)

### Prerequisites
- Android Studio installed
- Java JDK 17+

### Steps
```bash
# 1. Build the web app
npm run build

# 2. Add Android platform
npx cap add android

# 3. Sync the build
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. Build APK in Android Studio:
#    Build → Build Bundle(s) / APK(s) → Build APK(s)
```

---

## 🍎 iOS App Build (Capacitor)

### Prerequisites
- macOS with Xcode 15+
- Apple Developer account

### Steps
```bash
# 1. Build the web app
npm run build

# 2. Add iOS platform
npx cap add ios

# 3. Sync the build
npx cap sync ios

# 4. Open in Xcode
npx cap open ios

# 5. Select device/simulator and run
```

---

## 🔧 Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/           # Button, Input, Modal, Skeleton
│   ├── layout/       # BottomNav, PageHeader
│   ├── modals/       # AddCustomerModal, AddItemModal
│   └── invoice/      # InvoiceForm, InvoicePreviewPage
├── pages/            # All route pages
├── hooks/            # useAuth
├── lib/              # supabase, storage, utils, numberToWords
└── types.ts          # TypeScript interfaces
```

---

## 🌐 Deploy to Vercel

```bash
npm run build
# Push to GitHub, connect repo to Vercel
# Set environment variables in Vercel dashboard
```

---

## 📄 License

MIT License — © 2025 Paras Trading
