import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
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
import { saveInvoice, getLatestInvoiceNo, getMostSellingItem, getSettings } from './lib/storage';
import { todayISO } from './lib/utils';
import type { InvoiceData } from './types';

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

function NewInvoiceWrapper() {
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNo: 'PT/25-26/001',
    dateOfSupply: todayISO(),
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
      setInvoiceData(prev => ({
        ...prev, invoiceNo: nextNo,
        items: [{ id: crypto.randomUUID(), description: mostSelling?.description || 'Jaggery', hsnCode: mostSelling?.hsnCode || '17011410', qty: '', unit: mostSelling?.unit || 'Kgs', inclusiveRate: '', gstRate: mostSelling?.gstRate || 0, isInclusive: true }],
      }));
    }
    fetchDefaults();
  }, []);

  const handleGenerate = async () => {
    await saveInvoice(invoiceData);
    navigate(`/preview/${encodeURIComponent(invoiceData.invoiceNo)}`);
  };

  return <InvoiceForm data={invoiceData} onChange={setInvoiceData} onGenerate={handleGenerate} />;
}

function PreviewWrapper() {
  const { invoiceNo } = useParams<{ invoiceNo: string }>();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = React.useState<InvoiceData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!invoiceNo) return;
    import('./lib/storage').then(({ getInvoiceByNo }) =>
      getInvoiceByNo(decodeURIComponent(invoiceNo)).then(d => { setInvoiceData(d || null); setLoading(false); })
    );
  }, [invoiceNo]);

  if (loading) return <div className="page-container flex items-center justify-center h-64 text-slate-500 text-sm">Loading invoice...</div>;
  if (!invoiceData) return <div className="page-container"><p className="text-sm text-neon-red">Invoice not found.</p></div>;
  return <InvoicePreviewPage data={invoiceData} onEdit={() => navigate(-1)} />;
}

const pageVariants = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };
const pageTransition = { duration: 0.25, ease: 'easeInOut' as any };

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute><NewInvoiceWrapper /></ProtectedRoute>} />
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
      </motion.div>
    </AnimatePresence>
  );
}

import { Sidebar } from './components/layout/Sidebar';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sun, Moon, X } from 'lucide-react';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <motion.button 
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={toggleTheme}
      className="w-11 h-11 rounded-2xl bg-bg-card border border-content-primary/10 text-content-secondary hover:text-accent-red flex items-center justify-center shadow-lg hover:shadow-glow-red transition-all relative overflow-hidden"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative z-10">
        {theme === 'dark' ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-accent-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}

import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

function AppLayout() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Native Mobile Theme Sync
  React.useEffect(() => {
    const syncNativeTheme = async () => {
      try {
        const isDark = theme === 'dark';
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: isDark ? '#120A09' : '#FDFCFB' });
        if (NavigationBar) {
          await (NavigationBar as any).set({ color: isDark ? '#1C1211' : '#FFFFFF', darkButtons: !isDark });
        }
      } catch (err) {
        // Not on mobile or plugin missing
      }
    };
    syncNativeTheme();
  }, [theme]);

  return (
    <div className="min-h-dvh bg-bg-primary flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      {user && !isMobile && <Sidebar />}
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {user && isMobile && mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-bg-secondary z-[70] shadow-2xl"
            >
              <Sidebar />
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 -right-12 w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-content-primary shadow-lg border border-content-primary/5"
              >
                <X size={20} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 h-dvh overflow-y-auto scrollbar-hide pb-20 md:pb-0 relative">
        <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
          <ThemeToggle />
        </div>
        <div className="max-w-7xl mx-auto">
          <AppRoutes />
        </div>
      </main>
      {user && isMobile && <BottomNav onOpenMenu={() => setMobileMenuOpen(true)} />}
    </div>
  );
}

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
