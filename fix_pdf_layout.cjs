const fs = require('fs');
let file = 'src/components/invoice/InvoicePreviewPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update capturePDF
content = content.replace('scale: 2,', 'scale: 5,');
content = content.replace('windowWidth: printRef.current.scrollWidth,', 'windowWidth: 1024,');
content = content.replace('windowHeight: printRef.current.scrollHeight,', '');

const onCloneOld = 'const el = doc.getElementById(\'invoice-print-content\');\\n        if (el) {\\n          let p = el.parentElement;';
const onCloneNew = 'const el = doc.getElementById(\'invoice-print-content\');\\n        if (el) {\\n          el.style.width = \\'1024px\\';\\n          el.style.maxWidth = \\'1024px\\';\\n          let p = el.parentElement;';

// Use a simpler replace for onClone
content = content.replace("const el = doc.getElementById('invoice-print-content');", "const el = doc.getElementById('invoice-print-content');\\n        if (el) { el.style.width = '1024px'; el.style.maxWidth = '1024px'; }");

// 2. Wrap the invoice-print-content in a min-w-[800px] div
const targetDiv = '<div id="invoice-print-content"';
if (content.includes(targetDiv)) {
  content = content.replace(
    targetDiv, 
    '<div className="w-full overflow-x-auto pb-6 hide-scrollbar">\\n        <div className="min-w-[800px] w-full mx-auto">\\n          <div id="invoice-print-content"'
  );
  
  // Close the two new divs at the very end of the component
  content = content.replace(
    '        </div>\\n      </div>\\n    </div>\\n  );\\n}',
    '        </div>\\n      </div>\\n      </div>\\n      </div>\\n    </div>\\n  );\\n}'
  );
}

fs.writeFileSync(file, content);
