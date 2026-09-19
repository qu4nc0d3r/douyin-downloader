# Douyin Downloader

[![tests](https://github.com/qu4nc0d3r/douyin-downloader/actions/workflows/test.yml/badge.svg)](https://github.com/qu4nc0d3r/douyin-downloader/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![node: >=22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

[English](README.md) · **Tiếng Việt**

Web app chạy local tải video Douyin **không watermark** ở chất lượng cao nhất. Mọi thứ chạy trên máy bạn: một server Express nhỏ điều khiển Chrome/Edge ẩn gọi trực tiếp API web của Douyin — không qua dịch vụ trung gian, không cần tài khoản.

> Không liên kết với Douyin hay ByteDance. Chỉ dùng cho mục đích cá nhân — bản quyền video thuộc về tác giả nội dung.

## Tính năng

- **Một hoặc nhiều link** — dán một hay nhiều link (hoặc cả đoạn text share). Tối đa 10 link mỗi lần lấy thông tin, tự bỏ link trùng, link lỗi hiển thị riêng.
- **Tải cả kênh** — dán URL profile (`douyin.com/user/...`) hoặc link chia sẻ `v.douyin.com` để lấy danh sách video của kênh (tối đa `PROFILE_MAX_VIDEOS` mỗi lần, nút **Tải thêm** cho phần còn lại), chọn video rồi tải vào `downloads/<tên kênh>/`.
- **Tab Hàng đợi** — xếp link trước mà không cần lấy thông tin, sau đó tải theo cơ chế cuốn chiếu (vừa extract vừa tải).
- **Chọn chất lượng** — nhãn độ phân giải thật kèm bitrate (`2160p · 5.5 Mbps`); mặc định ưu tiên H.264 để tương thích tối đa.
- **Tạm dừng / tiếp tục** — từng video, và **tạm dừng tất cả / tiếp tục tất cả** ở mọi tab.
- **Tải nhiều kết nối, có resume** — file lớn tự chia chunk kiểu IDM, giữ `.part` để resume, tự retry và tự lấy lại URL khi link CDN hết hạn.
- **Cookie đăng nhập (tùy chọn)** — cho video riêng tư hoặc giới hạn tuổi; chỉ lưu trên máy tại `data/cookie.json`.
- **Chế độ xem** — danh sách, lưới và gọn (nhiều video hơn trên màn hình).
- **Bài đăng ảnh** được nhận diện và hiển thị là không hỗ trợ — tool chỉ tải video.

## Yêu cầu

- Node.js **>= 22**
- **Chrome hoặc Edge** (app tự dò; có thể chỉ định qua `DOUYIN_BROWSER_PATH`)

Windows là nền tảng chính; macOS/Linux chạy được nếu có trình duyệt nhân Chromium.

## Cách dùng nhanh

```bash
npm install
npm start
```

Mở http://127.0.0.1:3030, dán link và bấm **Lấy thông tin**.

Nếu file đã có trong `downloads/`, app sẽ hỏi: **Ghi đè**, **Tạo tên mới** (` (1)`) hoặc **Hủy**.

## Ảnh giao diện

![Tab Tải video](docs/screenshots/extract-tab.png)
![Tab Tải kênh](docs/screenshots/profile-tab.png)
![Chế độ gọn](docs/screenshots/compact-view.png)

## Cookie đăng nhập (tùy chọn)

Dùng khi video yêu cầu đăng nhập (riêng tư, giới hạn tuổi...):

1. Cài extension **Get cookies.txt LOCALLY** trên trình duyệt
2. Đăng nhập douyin.com, mở extension và export cookie (Netscape `.txt` hoặc JSON), hoặc copy header string
3. Mở tab **Cookie đăng nhập** trong app, dán kết quả và lưu

Định dạng hỗ trợ: `cookies.txt` Netscape (kể cả dòng `#HttpOnly_`), JSON export, header string, `Copy as cURL` và cookie trần `a=b; c=d`.

Chỉ **cookie đăng nhập** (`sessionid`, `sid_tt`, `uid_tt`…) được đưa vào trình duyệt ẩn; cookie fingerprint (`ttwid`, `UIFID`, `s_v_web_id`…) bị bỏ qua để không phá cơ chế ký request của Douyin. Cookie chỉ nằm trong `data/cookie.json` trên máy bạn và chỉ gửi tới Douyin.

## Cách hoạt động

1. Tách link từ text đã dán; link rút gọn được follow để lấy `aweme_id`
2. Mở Chrome/Edge headless với profile tạm, vào `douyin.com`
3. Gọi API web của Douyin **từ trong page context** — SDK của trang tự ký request, không cần reverse-engineer signature
4. Lấy stream từ `video.play_addr` (bản không watermark) và `video.bit_rate` (các mức chất lượng)
5. Stream file về `downloads/`, fallback nhiều URL khi CDN lỗi, có phát hiện stall và resume

Lần lấy thông tin đầu tiên mất ~5–10 giây vì phải khởi động trình duyệt ẩn; các lần sau nhanh hơn do được tái sử dụng.

## Cấu hình

Mọi biến đều tùy chọn (xem `.env.example`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 3030 | Cổng server |
| `MAX_CONCURRENT_DOWNLOADS` | 2 | Số video tải song song tối đa |
| `SEGMENT_MIN_SIZE` | 83886080 (80 MB) | File lớn hơn mức này sẽ tải kiểu IDM (chia nhiều connection); `0` để tắt |
| `SEGMENTS` | 8 | Số connection tối đa cho mỗi file lớn |
| `CHUNK_SIZE` | 16777216 (16 MB) | Kích thước mỗi chunk khi tải segmented |
| `STALL_TIMEOUT_MS` | 30000 | Ngắt kết nối nếu không nhận byte nào trong bao lâu |
| `DOWNLOAD_RETRIES` | 2 | Số lần retry mỗi URL |
| `DOUYIN_BROWSER_PATH` | tự dò | Đường dẫn Chrome/Edge |
| `BROWSER_IDLE_TIMEOUT_MS` | 120000 | Tắt trình duyệt ẩn sau thời gian rảnh |
| `PROFILE_MAX_VIDEOS` | 200 | Số video tối đa lấy mỗi lần từ một kênh (vượt trần có nút Tải thêm) |
| `CLOUDFLARE_WORKER_URL` | — | Edge cache tùy chọn cho metadata video (xem `cloudflare-worker/`) |
| `CLOUDFLARE_WORKER_SECRET` | — | Secret chia sẻ với worker |

## Test

```bash
npm test
```

Test unit chạy hoàn toàn offline (test cần browser/mạng bị skip trừ khi bật):

```powershell
$env:RUN_NETWORK_TESTS=1; $env:TEST_DOUYIN_URL="https://www.douyin.com/video/xxxx"; npm test
```

## Cấu trúc dự án

```
server.js             Điểm khởi động Express
src/browser.js        Chrome/Edge headless qua CDP
src/extractor.js      Parse link, parse metadata, hàm thuần
src/downloader.js     Tải streaming + retry + refresh URL
src/segmented.js      Chia chunk kiểu IDM
src/app.js            Express app factory (routes, hàng đợi job, SSE)
public/               Frontend vanilla JS (không build step)
cloudflare-worker/    Worker edge cache tùy chọn
electron/             Vỏ desktop tùy chọn
test/                 Bộ test node:test (mặc định offline)
```

## Lưu ý

- Chỉ dùng cho mục đích cá nhân. Bản quyền video thuộc về tác giả nội dung.
- Douyin có thể đổi API bất kỳ lúc nào. Nếu extract lỗi, kiểm tra `src/browser.js` (endpoint/params) và `src/extractor.js` (`parseAwemeDetail`).
- App không gửi dữ liệu của bạn đi đâu: cookie và file tải về chỉ nằm trên máy bạn.

## Giấy phép

[MIT](LICENSE)

## Ghi công

- Icon [Lucide](https://lucide.dev) (giấy phép ISC)
- Font **UTM Avo** — Việt hóa bởi Đinh Kiên (free for personal use)
