/* 本地预览服务：双击「启动预览.bat」或在命令行运行 node serve.js
   启动后家里同一 WiFi 的设备都能打开 http://<本机IP>:8850  */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8850;
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const file = path.join(ROOT, path.normalize(url).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('403'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404 Not Found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  const ips = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach(k => nets[k].forEach(n => {
    if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
  }));
  console.log('==========================================');
  console.log('  Micky 学习工作台已启动');
  console.log('  本机打开： http://localhost:' + PORT);
  ips.forEach(ip => console.log('  手机/平板： http://' + ip + ':' + PORT));
  console.log('  关闭窗口即可停止');
  console.log('==========================================');
});
