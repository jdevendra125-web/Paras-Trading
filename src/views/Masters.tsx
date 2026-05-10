import { useState } from 'react';
import { Customers } from './Customers';
import { Items } from './Items';
import { BankAccounts } from './BankAccounts';
import { Users, Package, Landmark } from 'lucide-react';

export function Masters() {
  const [activeTab, setActiveTab] = useState<'customers' | 'items' | 'bank_accounts'>('customers');

  return (
    <div>
      <div className="header mb-4" style={{ position: 'relative', border: 'none', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <h1 className="header-title">Master Data</h1>
      </div>

      <div className="h-scroll mb-3">
        <button 
          className={`filter-chip ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Users size={14} /> Customers
        </button>
        <button 
          className={`filter-chip ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Package size={14} /> Items
        </button>
        <button 
          className={`filter-chip ${activeTab === 'bank_accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('bank_accounts')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Landmark size={14} /> Bank Accounts
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'customers' && (
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <Customers />
          </div>
        )}
        {activeTab === 'items' && (
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <Items />
          </div>
        )}
        {activeTab === 'bank_accounts' && (
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <BankAccounts />
          </div>
        )}
      </div>
    </div>
  );
}
