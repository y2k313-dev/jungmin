// 미리보기용 로컬 서버 (http://localhost:5799). preview/ 폴더를 보여줍니다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'preview');
http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(dir, path.normalize(name).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.end('not found'); return; }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(data);
  });
}).listen(5799, () => console.log('preview on http://localhost:5799'));
