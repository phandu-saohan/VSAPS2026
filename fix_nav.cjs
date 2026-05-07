const fs=require('fs'); let s=fs.readFileSync('public/landing.html','utf8'); s=s.replace(/Cổng quản lý/g,'Đăng nhập'); fs.writeFileSync('public/landing.html',s); console.log('Done');
