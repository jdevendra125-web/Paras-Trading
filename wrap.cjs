const fs = require('fs');

function wrap(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('className="page-container"', 'className="page-container flex flex-col h-full overflow-hidden"');
  
  // Wrap loading and empty state in flex-1
  content = content.replace('{loading ? <TableSkeleton', '<div className="flex-1 overflow-y-auto min-h-0 hide-scrollbar pb-4">\n      {loading ? <TableSkeleton');
  
  // Find the last </div> before the ConfirmDialog or AddModal
  content = content.replace('      <ConfirmDialog', '      </div>\n      <ConfirmDialog');
  content = content.replace('      <AddCustomerModal', '      </div>\n      <AddCustomerModal');
  content = content.replace('      <AddItemModal', '      </div>\n      <AddItemModal');
  content = content.replace('      <AddBankAccountModal', '      </div>\n      <AddBankAccountModal');

  fs.writeFileSync(file, content);
}

wrap('src/pages/Customers.tsx');
wrap('src/pages/Items.tsx');
wrap('src/pages/BankAccounts.tsx');
