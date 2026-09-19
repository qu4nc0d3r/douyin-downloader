import path from 'node:path';
import { spawn } from 'node:child_process';
import { writableDir, isPackaged } from './src/paths.js';
import { createApp } from './src/app.js';

try {
  process.loadEnvFile(path.join(writableDir(), '.env'));
} catch {}

const port = Number(process.env.PORT) || 3030;
const host = '127.0.0.1';
const app = createApp();

function openInBrowser(url) {
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {}
}

function holdConsole() {
  if (!process.stdin.isTTY) {
    process.exit(1);
  }
  console.error('Nhấn Enter để thoát...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
}

const server = app.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log(`Douyin Downloader đang chạy: ${url}`);
  if (isPackaged() && process.env.DOUYIN_NO_OPEN_BROWSER !== '1') openInBrowser(url);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} đang được tiến trình khác dùng. Đóng tiến trình đó hoặc chạy với PORT khác (ví dụ: $env:PORT=3031; npm start).`,
    );
  } else {
    console.error(err);
  }
  if (isPackaged()) {
    holdConsole();
    return;
  }
  process.exit(1);
});
