const fs = require('fs');
let file = 'src/components/invoice/InvoicePreviewPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const capturePdfLogic = `
  const capturePDF = async () => {
    if (!printRef.current) return null;
    return await html2canvas(printRef.current, {
      scale: 2,
      backgroundColor: '#fff',
      useCORS: true,
      windowWidth: printRef.current.scrollWidth,
      windowHeight: printRef.current.scrollHeight,
      onclone: (doc) => {
        const el = doc.getElementById('invoice-print-content');
        if (el) {
          let p = el.parentElement;
          while (p && p.tagName !== 'BODY') {
            p.style.overflow = 'visible';
            p.style.height = 'auto';
            p.style.maxHeight = 'none';
            p = p.parentElement;
          }
        }
      }
    });
  };
`;

content = content.replace('const handlePrint = () => window.print();', capturePdfLogic + '\n  const handlePrint = () => window.print();');
content = content.replace(/const canvas = await html2canvas\(printRef\.current, [^\)]+\);/g, 'const canvas = await capturePDF();\n      if (!canvas) return;');
content = content.replace('<div ref={printRef}', '<div id="invoice-print-content" ref={printRef}');

fs.writeFileSync(file, content);
