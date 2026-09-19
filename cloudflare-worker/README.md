# Hướng dẫn triển khai Cloudflare Worker (Douyin Edge Cache)

Cloudflare Worker này giúp giảm tải tối đa cho máy tính của bạn bằng cách:
1. **Lưu Cache Metadata & Stream URL (Cloudflare KV)**: Khi một video đã được giải mã, metadata sẽ được lưu trên Cloudflare. Các lần tải lại sau đó hoặc người khác tải video đó sẽ lấy kết quả ngay trong **20ms** mà **không cần khởi động Chrome** trên máy.
2. **Giải mã link rút gọn (Unshorten Redirect)**: Theo dõi chuyển hướng `v.douyin.com` siêu tốc tại Edge của Cloudflare.
3. **Proxy ảnh bìa (Thumbnail Proxy)**: Tránh bị chặn Referer và tải ảnh nhanh qua CDN.

---

## Cách 1: Triển khai nhanh bằng dòng lệnh (Wrangler CLI) — *Khuyên dùng*

### Bước 1: Mở terminal trong thư mục `cloudflare-worker`
```bash
cd cloudflare-worker
```

### Bước 2: Đăng nhập Cloudflare
```bash
npx wrangler login
```
*(Trình duyệt sẽ mở ra để bạn xác nhận quyền tài khoản Cloudflare)*

### Bước 3: Tạo KV Namespace để lưu Cache
```bash
npx wrangler kv namespace create DOUYIN_CACHE
```
Lệnh trên sẽ in ra một đoạn cấu hình, ví dụ:
```toml
[[kv_namespaces]]
binding = "DOUYIN_CACHE"
id = "a1b2c3d4e5f6..."
```

### Bước 4: Cập nhật `wrangler.toml`
Mở tệp `wrangler.toml` và dán `id` bạn vừa nhận được vào dòng `id = "..."`.

### Bước 5: Triển khai Worker
```bash
npx wrangler deploy
```
Sau khi hoàn tất, Cloudflare sẽ cấp cho bạn một đường dẫn URL, ví dụ:
`https://douyin-edge-cache.<tên-subdomain>.workers.dev`

---

## Cách 2: Triển khai bằng giao diện Web (Cloudflare Dashboard)

Nếu bạn không muốn cài đặt dòng lệnh:
1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Vào mục **Workers & Pages** -> Bấm **Create application** -> **Create Worker**.
3. Đặt tên Worker là `douyin-edge-cache` -> Bấm **Deploy**.
4. Bấm **Edit code**, copy toàn bộ nội dung trong tệp `src/index.js` dán vào và bấm **Deploy**.
5. Tạo KV:
   - Ở thanh menu bên trái, vào **KV** -> Bấm **Create namespace** -> Đặt tên `DOUYIN_CACHE` -> Bấm **Add**.
6. Kết nối KV vào Worker:
   - Quay lại Worker `douyin-edge-cache` -> Chọn tab **Settings** -> **Bindings**.
   - Bấm **Add binding** -> Chọn **KV Namespace**.
   - **Variable name**: Nhập chính xác `DOUYIN_CACHE`.
   - **KV namespace**: Chọn namespace vừa tạo ở bước 5.
   - Bấm **Save and deploy**.

---

## Cách tích hợp vào ứng dụng Douyin Downloader

Sau khi có URL Worker (ví dụ: `https://douyin-edge-cache.xxx.workers.dev`):

### Cách 1: Cấu hình qua biến môi trường (Environment Variable)
Khi khởi động server, thêm biến môi trường `CLOUDFLARE_WORKER_URL`:
- Trên Windows PowerShell:
  ```powershell
  $env:CLOUDFLARE_WORKER_URL="https://douyin-edge-cache.xxx.workers.dev"
  npm start
  ```
- Hoặc tạo tệp `.env` trong thư mục gốc của project:
  ```env
  CLOUDFLARE_WORKER_URL=https://douyin-edge-cache.xxx.workers.dev
  # CLOUDFLARE_WORKER_SECRET=your-secret (nếu có đặt AUTH_SECRET)
  ```

Ứng dụng sẽ tự động nhận diện Worker và kiểm tra Cache trước khi bật Chrome!
