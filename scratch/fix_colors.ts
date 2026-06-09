import fs from 'fs';
import path from 'path';

const srcDir = 'c:/Users/manag/Downloads/Employee Management System/src';

function walk(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach(( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  }));
}

walk(srcDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace simple hsl(var(--foo)) with var(--foo)
    // Note: This regex is simple and might need refinement
    let newContent = content.replace(/hsl\(var\(--([^)]+)\)\)/g, 'var(--$1)');
    
    // Replace hsl(var(--foo) / 0.1) with color-mix(in srgb, var(--foo), transparent 90%)
    newContent = newContent.replace(/hsl\(var\(--([^)]+)\)\s*\/\s*([\d.]+)\)/g, (match, varName, opacity) => {
      const transparentPercentage = Math.round((1 - parseFloat(opacity)) * 100);
      return `color-mix(in srgb, var(--${varName}), transparent ${transparentPercentage}%)`;
    });

    if (newContent !== content) {
      console.log(`Updating ${filePath}`);
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
  }
});
