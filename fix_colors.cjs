const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  if (filePath.includes('Button.tsx')) return;
  if (filePath.includes('Sidebar.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/className=(['"]|{`)([^'"`]*)(['"]|`})/g, (match, open, classes, close) => {
    if (!classes.includes('text-white')) return match;
    
    if (classes.includes('bg-accent') || classes.includes('bg-gradient') || classes.includes('bg-neon') || classes.includes('bg-[#25D366]')) {
      return match;
    }

    let newClasses = classes.replace(/\btext-white\b/g, 'text-content-primary');
    newClasses = newClasses.replace(/\bhover:text-white\b/g, 'hover:text-content-primary');
    
    return 'className=' + open + newClasses + close;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
});
