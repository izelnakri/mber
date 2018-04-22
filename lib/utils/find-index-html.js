import fs from 'fs';

export default function() {
  const cwd = process.cwd();
  const folders = cwd.split('/');
  const htmlIndex = folders.findIndex((path) => path === 'index.html');

  if (htmlIndex !== -1) {
    return folders.slice(0, htmlIndex + 1).join('/');
  } else if (fs.readdirSync('.').includes('index.html')) {
    return `${cwd}/index.html`;
  }
}
