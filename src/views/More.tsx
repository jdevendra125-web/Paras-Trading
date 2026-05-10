import { Link, useNavigate } from 'react-router-dom';
import { FileSpreadsheet, UploadCloud, Banknote, Package, Settings, Users, LogOut, Phone, HeartHandshake, HelpCircle } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

export function More() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: <Users size={24} />, label: 'Customers', link: '/customers', color: '#059669', bg: '#D1FAE5' },
    { icon: <FileSpreadsheet size={24} />, label: 'Reports', link: '/reports', color: '#4F46E5', bg: '#E0E7FF' },
    { icon: <UploadCloud size={24} />, label: 'Bank Import', link: '/import', color: '#0284C7', bg: '#E0F2FE' },
    { icon: <Banknote size={24} />, label: 'Cash Receipts', link: '/receipts', color: '#16A34A', bg: '#DCFCE7' },
    { icon: <Package size={24} />, label: 'Masters', link: '/masters', color: '#D97706', bg: '#FEF3C7' },
    { icon: <Settings size={24} />, label: 'Settings', link: '/settings', color: '#475569', bg: '#F1F5F9' },
    { icon: <HelpCircle size={24} />, label: 'Help & FAQ', link: '/help', color: '#8B5CF6', bg: '#EDE9FE' }
  ];

  return (
    <div>
      <div className="header mb-4" style={{ position: 'relative', border: 'none', padding: 0, backgroundColor: 'transparent', backdropFilter: 'none' }}>
        <h1 className="header-title">More Options</h1>
      </div>

      <div className="grid-2 mt-4">
        {menuItems.map((item, idx) => (
          <Link 
            to={item.link} 
            key={idx} 
            className="card" 
            style={{ 
              textDecoration: 'none', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '1.5rem 1rem',
              gap: '0.75rem',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: item.bg,
              color: item.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {item.icon}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{item.label}</span>
          </Link>
        ))}
        <button 
            onClick={handleLogout}
            className="card" 
            style={{ 
              textDecoration: 'none', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '1.5rem 1rem',
              gap: '0.75rem',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LogOut size={24} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Logout</span>
          </button>
      </div>

      <div className="mt-6 mb-4 px-2" style={{ paddingBottom: '100px' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)', border: '1px solid #FECDD3', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.05)' }}>
          <div className="card-body p-4 text-center">
            <HeartHandshake size={28} color="#E11D48" style={{ margin: '0 auto', marginBottom: '8px' }} />
            <h3 className="font-bold text-sm mb-1" style={{ color: '#881337' }}>Need Support?</h3>
            <p className="text-xs mb-3" style={{ color: '#9F1239', opacity: 0.9 }}>Contact the developer for any queries or help.</p>
            
            <div style={{ background: 'white', borderRadius: '8px', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="font-bold text-sm text-main">Devendra Parasmal Jain</div>
              <a href="tel:+918484009350" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                <Phone size={14} /> 8484009350
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
