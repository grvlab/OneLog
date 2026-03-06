// Wait for Vite dev server to be ready before launching Electron
const http = require('http');

const url = 'http://localhost:5174';
const maxRetries = 30;
let retries = 0;

function check() {
  http
    .get(url, (res) => {
      if (res.statusCode === 200) {
        process.exit(0);
      } else {
        retry();
      }
    })
    .on('error', retry);
}

function retry() {
  if (retries++ > maxRetries) {
    console.error('Vite dev server did not start in time');
    process.exit(1);
  }
  setTimeout(check, 1000);
}

check();
