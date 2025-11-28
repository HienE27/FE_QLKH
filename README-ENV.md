# Bảo vệ file .env - Hướng dẫn

## ⚠️ QUAN TRỌNG: Không bao giờ commit file .env lên Git!

File `.env` chứa các thông tin nhạy cảm như API keys, secrets, và credentials. **TUYỆT ĐỐI KHÔNG** được commit lên Git.

## ✅ Đã được bảo vệ

File `.gitignore` đã được cấu hình để ignore tất cả các file `.env*`:
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env*.local`
- `*.env`

## 🔍 Kiểm tra trước khi commit

### Cách 1: Chạy script kiểm tra (PowerShell)
```powershell
.\check-env.ps1
```

### Cách 2: Kiểm tra thủ công
```bash
# Kiểm tra file nào đang được staged
git status

# Kiểm tra xem .env có trong staging không
git diff --cached --name-only | findstr /i "\.env"
```

## 🚨 Nếu đã vô tình commit .env

### Bước 1: Xóa file khỏi Git tracking (nhưng giữ file local)
```bash
git rm --cached .env
git rm --cached .env.local
# ... các file .env khác nếu có
```

### Bước 2: Commit việc xóa
```bash
git commit -m "Remove .env files from git tracking"
```

### Bước 3: Xóa khỏi Git history (QUAN TRỌNG!)
Nếu đã push lên remote, cần xóa khỏi history:
```bash
# CẢNH BÁO: Lệnh này sẽ rewrite git history
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env .env.local" --prune-empty --tag-name-filter cat -- --all

# Hoặc dùng git-filter-repo (khuyên dùng hơn)
# git filter-repo --path .env --invert-paths
```

### Bước 4: Force push (CHỈ KHI CẦN THIẾT!)
```bash
# CẢNH BÁO: Chỉ làm khi chắc chắn!
git push origin --force --all
git push origin --force --tags
```

## 📝 Tạo file .env từ template

1. Copy file `.env.example` (nếu có) hoặc tạo mới:
```bash
cp .env.example .env
```

2. Điền các giá trị thực tế vào `.env`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
# Thêm các biến môi trường khác...
```

## 🔒 Best Practices

1. ✅ **LUÔN** kiểm tra `git status` trước khi commit
2. ✅ **LUÔN** chạy `.\check-env.ps1` trước khi commit
3. ✅ Sử dụng `.env.example` để chia sẻ cấu trúc (không có giá trị thực)
4. ✅ Thêm `.env*` vào `.gitignore` (đã có sẵn)
5. ❌ **KHÔNG BAO GIỜ** commit file `.env`
6. ❌ **KHÔNG BAO GIỜ** hardcode API keys trong code

## 🛠️ Tự động hóa với Git Hooks

Để tự động kiểm tra trước mỗi commit, tạo file `.git/hooks/pre-commit`:

```bash
#!/bin/sh
# Kiểm tra .env files
if git diff --cached --name-only | grep -q '\.env'; then
    echo "❌ ERROR: .env files detected in staging area!"
    echo "Please remove them before committing."
    exit 1
fi
exit 0
```

Hoặc copy script PowerShell vào `.git/hooks/pre-commit` và chạy bằng PowerShell.

