import fs from 'fs';
import path from 'path';

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const colorMap = {
  // Greens
  '#00ff88': '#00c477',
  '#00FF88': '#00c477',
  '#00cc6a': '#009a5e',
  '#00CC6A': '#009a5e',
  '#00ff99': '#00c477',
  '#00FF99': '#00c477',
  
  // Blacks
  '#080808': '#050505',
  '#0a0a0a': '#050505',
  '#0A0A0A': '#050505',
  '#111111': '#050505',
  '#111': '#050505',
  '#050505': '#050505' // Base black
};

const files = getAllFiles('./src');

let totalReplacedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    // Regex for oldColor case-insensitive
    const regex = new RegExp(oldColor, 'gi');
    content = content.replace(regex, newColor);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplacedFiles++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Replaced colors in ${totalReplacedFiles} files.`);
