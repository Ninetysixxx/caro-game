# Deploy Guide — Caro Game

> Target: GitHub Pages (frontend) + Cloudflare Workers (backend)
> Owner: `ninetysixxx`

---

## 1. Deploy Backend (Cloudflare Workers)

### 1.1 Cài wrangler CLI

```bash
npm install -g wrangler
```

### 1.2 Login Cloudflare

```bash
wrangler login
```

Mở trình duyệt và authorize. Sau đó kiểm tra:

```bash
wrangler whoami
```

### 1.3 Kiểm tra config

File `caro-server/wrangler.toml` đã được cấu hình:

```toml
name = "caro-server"
main = "src/index.js"
compatibility_date = "2024-05-12"

[vars]
ALLOWED_ORIGIN = "https://ninetysixxx.github.io"

[[durable_objects.bindings]]
name = "ROOMS"
class_name = "RoomDurableObject"

[[migrations]]
tag = "v1"
new_classes = ["RoomDurableObject"]
```

### 1.4 Deploy

```bash
cd caro-server
wrangler deploy
```

**Output mong đợi:**

```
Published caro-server (2.34 sec)
  https://caro-server.ninetysixxx.workers.dev
```

> **Lưu ý:** Nếu domain bị trùng, wrangler sẽ thêm suffix ngẫu nhiên. Kiểm tra URL thực tế và cập nhật lại `window.CARO_SERVER_URL` trong `caro-game/index.html` nếu khác.

---

## 2. Deploy Frontend (GitHub Pages)

### 2.1 Tạo GitHub Repository

1. Vào [github.com/new](https://github.com/new)
2. Repository name: `caro-game`
3. Visibility: **Public**
4. Không tick "Add a README" (đã có sẵn)
5. Click **Create repository**

### 2.2 Push code lên GitHub

```bash
# Từ thư mục gốc dự án
git remote add origin https://github.com/ninetysixxx/caro-game.git
git branch -M main
git push -u origin main
```

### 2.3 Bật GitHub Pages

1. Vào repo → **Settings** → **Pages** (sidebar)
2. **Source**: Deploy from a branch
3. **Branch**: `main` / `root`
4. Click **Save**

### 2.4 Đợi deploy

- GitHub Actions sẽ tự động chạy workflow `.github/workflows/deploy.yml`
- Kiểm tra tab **Actions** trong repo
- Sau ~1-2 phút, site sẽ live tại: `https://ninetysixxx.github.io/caro-game/`

---

## 3. Kiểm tra sau deploy

### 3.1 Test backend health

```bash
curl https://caro-server.ninetysixxx.workers.dev/create
```

Mong đợi:
```json
{"room":"AB12"}
```

### 3.2 Test frontend

1. Mở `https://ninetysixxx.github.io/caro-game/`
2. Chọn chế độ **Online**
3. Click **Tạo phòng** — nếu hiện mã phòng 4 ký tự → backend kết nối thành công
4. Nếu hiện modal "Chưa cấu hình server" → kiểm tra `window.CARO_SERVER_URL` trong DevTools Console

### 3.3 Test PWA

- Chrome DevTools → Lighthouse → Run PWA audit
- Kiểm tra Service Worker trong Application tab
- Test Add to Home Screen trên mobile

---

## 4. Troubleshooting

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| `CORS error` | ALLOWED_ORIGIN sai | Kiểm tra `wrangler.toml` khớp với GitHub Pages URL |
| `404 on /create` | Backend chưa deploy | Chạy `wrangler deploy` lại |
| `config-missing modal` | CARO_SERVER_URL chưa set | Kiểm tra script tag trong `index.html` |
| `Durable Object migration error` | Chưa apply migration | `wrangler d1 migrations apply` hoặc xóa worker cũ |
| GitHub Pages 404 | Repo chưa public hoặc chưa bật Pages | Kiểm tra Settings → Pages |

---

## 5. Cập nhật sau này

### Update backend

```bash
cd caro-server
# Edit code...
wrangler deploy
```

### Update frontend

```bash
# Edit code trong caro-game/
git add .
git commit -m "fix: ..."
git push origin main
```

GitHub Actions tự động deploy trong ~1 phút.

---

## 6. Tùy chọn nâng cao

### Custom domain (tuỳ chọn)

1. Mua domain (VD: `caro.fun`)
2. GitHub Pages Settings → Custom domain → nhập `caro.fun`
3. DNS: CNAME `caro.fun` → `ninetysixxx.github.io`
4. Cập nhật `ALLOWED_ORIGIN` trong `wrangler.toml` và deploy lại backend

### Analytics

- Thêm Cloudflare Web Analytics (free) vào custom domain
- Hoặc Google Analytics 4

---

**Last updated:** 2026-05-16
