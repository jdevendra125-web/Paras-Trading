// ─── All imports at the top (Bug 5 fix) ─────────────────────────────────────
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sun, Moon, X } from 'lucide-react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { App as CapacitorApp } from '@capacitor/app';

import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Invoices } from './pages/Invoices';
import { Customers } from './pages/Customers';
import { Outstandings } from './pages/Outstandings';
import { Receipts } from './pages/Receipts';
import { More } from './pages/More';
import { Masters } from './pages/Masters';
import { Items } from './pages/Items';
import { BankAccounts } from './pages/BankAccounts';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';
import { Reports } from './pages/Reports';
import { BankImport } from './pages/BankImport';
import { CustomerStatement } from './pages/CustomerStatement';
import { CustomerOutstandingBills } from './pages/CustomerOutstandingBills';
import { InvoiceForm } from './components/invoice/InvoiceForm';
import { InvoicePreviewPage } from './components/invoice/InvoicePreviewPage';

import { saveInvoice, getLatestInvoiceNo, getMostSellingItem, getSettings, getInvoiceByNo } from './lib/storage';
import { todayISO } from './lib/utils';
import type { InvoiceData } from './types';

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-primary">
      <div className="w-8 h-8 border-2 border-accent-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

// ─── New Invoice Wrapper (Bug 11 fix: disable save until defaults load) ───────
function NewInvoiceWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNo: '...',   // placeholder until fetchDefaults resolves
    invoiceType: 'goods',
    dateOfSupply: '',
    poNo: '', poDate: '', vehicleNo: '', nameOfTransport: 'Private',
    placeOfSupply: 'Dharangaon', modeOfTransport: 'By Road',
    customerId: '', receiverName: '', receiverAddress: '',
    receiverState: '', receiverStateCode: '', receiverGstin: '', receiverRegion: '',
    items: [{ id: crypto.randomUUID(), description: 'Jaggery', hsnCode: '17011410', qty: '', unit: 'Kgs', inclusiveRate: '', gstRate: 0, isInclusive: true }],
    loadingCharges: '', transportCharges: '', otherCharges: '', hamali: '', reportable: false,
  });

  React.useEffect(() => {
    async function fetchDefaults() {
      const [userSettings, latestNo, mostSelling] = await Promise.all([getSettings(), getLatestInvoiceNo(), getMostSellingItem()]);
      const prefix = userSettings?.invoicePrefix || 'PT/25-26/';
      let nextNo = `${prefix}001`;
      if (latestNo && latestNo.startsWith(prefix)) {
        const numStr = latestNo.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num)) nextNo = `${prefix}${String(num + 1).padStart(3, '0')}`;
      }
      
      const prefill = location.state?.prefill;
      
      setInvoiceData(prev => ({
        ...prev, 
        ...prefill,
        invoiceNo: nextNo,
        invoiceType: (userSettings?.invoiceFormat as any) || 'goods',
        items: prefill?.items?.length ? prefill.items : [{ id: crypto.randomUUID(), description: mostSelling?.description || 'Jaggery', hsnCode: mostSelling?.hsnCode || '17011410', qty: '', unit: mostSelling?.unit || 'Kgs', inclusiveRate: '', gstRate: mostSelling?.gstRate || 0, isInclusive: true }],
      }));
      setDefaultsLoaded(true);
    }
    fetchDefaults();
  }, [location.state]);

  const handleGenerate = async () => {
    await saveInvoice(invoiceData);
    navigate(`/preview/${encodeURIComponent(invoiceData.invoiceNo)}`);
  };

  return <InvoiceForm data={invoiceData} onChange={setInvoiceData} onGenerate={handleGenerate} defaultsLoading={!defaultsLoaded} />;
}

// ─── Preview Wrapper ──────────────────────────────────────────────────────────
function PreviewWrapper() {
  const { invoiceNo } = useParams<{ invoiceNo: string }>();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = React.useState<InvoiceData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!invoiceNo) return;
    getInvoiceByNo(decodeURIComponent(invoiceNo)).then(d => {
      setInvoiceData(d || null);
      setLoading(false);
    });
  }, [invoiceNo]);

  if (loading) return <div className="page-container flex items-center justify-center h-64 text-slate-500 text-sm">Loading invoice...</div>;
  if (!invoiceData) return <div className="page-container"><p className="text-sm text-neon-red">Invoice not found.</p></div>;
  return <InvoicePreviewPage data={invoiceData} onEdit={() => navigate(`/edit/${encodeURIComponent(invoiceData.invoiceNo)}`)} />;
}

// ─── Edit Invoice Wrapper ─────────────────────────────────────────────────────
function EditInvoiceWrapper() {
  const { invoiceNo } = useParams<{ invoiceNo: string }>();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!invoiceNo) return;
    getInvoiceByNo(decodeURIComponent(invoiceNo)).then(d => {
      if (d) setInvoiceData(d);
      setLoading(false);
    });
  }, [invoiceNo]);

  const handleSave = async () => {
    if (!invoiceData) return;
    await saveInvoice(invoiceData);
    navigate(`/preview/${encodeURIComponent(invoiceData.invoiceNo)}`);
  };

  if (loading) return <div className="page-container flex items-center justify-center h-64 text-slate-500 text-sm">Loading invoice...</div>;
  if (!invoiceData) return <div className="page-container"><p className="text-sm text-neon-red">Invoice not found.</p></div>;
  return <InvoiceForm data={invoiceData} onChange={setInvoiceData} onGenerate={handleSave} />;
}

// ─── App Routes ───────────────────────────────────────────────────────────────
function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/new" element={<ProtectedRoute><NewInvoiceWrapper /></ProtectedRoute>} />
      <Route path="/edit/:invoiceNo" element={<ProtectedRoute><EditInvoiceWrapper /></ProtectedRoute>} />
      <Route path="/preview/:invoiceNo" element={<ProtectedRoute><PreviewWrapper /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/outstandings" element={<ProtectedRoute><Outstandings /></ProtectedRoute>} />
      <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
      <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
      <Route path="/masters" element={<ProtectedRoute><Masters /></ProtectedRoute>} />
      <Route path="/masters/items" element={<ProtectedRoute><Items /></ProtectedRoute>} />
      <Route path="/bank-accounts" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><BankImport /></ProtectedRoute>} />
      <Route path="/statement/:customerId" element={<ProtectedRoute><CustomerStatement /></ProtectedRoute>} />
      <Route path="/outstanding-bills/:customerId" element={<ProtectedRoute><CustomerOutstandingBills /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



// ─── App Layout ───────────────────────────────────────────────────────────────
function AppLayout() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hardware Back Button
  React.useEffect(() => {
    const listener = CapacitorApp.addListener('backButton', () => {
      if (location.pathname === '/' || location.pathname === '/login') {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    });
    return () => {
      listener.then(l => l.remove());
    };
  }, [location.pathname, navigate]);

  // Native Mobile Theme Sync
  React.useEffect(() => {
    const syncNativeTheme = async () => {
      try {
        const isDark = theme === 'dark';
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: isDark ? '#120A09' : '#FDFCFB' });
        await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        if (NavigationBar) {
          await (NavigationBar as any).set({ color: isDark ? '#1C1211' : '#FFFFFF', darkButtons: !isDark });
        }
      } catch (err) {
        // Not on mobile or plugin missing — safe to ignore
      }
    };
    syncNativeTheme();
  }, [theme]);

  return (
    <div 
      className="min-h-dvh bg-bg-primary flex flex-col md:flex-row transition-colors duration-300"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {user && !isMobile && <Sidebar />}
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {user && isMobile && mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-68 h-full bg-bg-secondary shadow-2xl"
            >
              <Sidebar onClose={() => setMobileMenuOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 pb-20 md:pb-0 relative">
        <div className="max-w-7xl mx-auto">
          <AppRoutes />
        </div>
      </main>
      {user && isMobile && <BottomNav onOpenMenu={() => setMobileMenuOpen(true)} />}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
