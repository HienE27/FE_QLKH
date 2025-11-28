# 📚 Ví dụ sử dụng Settings trong hệ thống

## 🎯 Tại sao Settings hữu ích?

Settings cho phép bạn **thay đổi nội dung hệ thống mà KHÔNG CẦN sửa code**:
- ✅ Thay đổi tên công ty → Chỉ cần update setting
- ✅ Thay đổi số điện thoại, email → Không cần deploy lại
- ✅ Cấu hình giới hạn, thông báo → Admin tự quản lý
- ✅ Nội dung động (banner, thông báo) → Update real-time

---

## 💡 Ví dụ 1: Tên công ty trong Header

**Trước đây (hardcode):**
```tsx
<span>Công ty ABC</span>  // Phải sửa code mỗi khi đổi tên
```

**Bây giờ (dùng Settings):**
```tsx
import { useSetting } from '@/hooks/useSettings';

const { value: companyName } = useSetting('company_name', 'Công ty ABC');
<span>{companyName}</span>  // Tự động lấy từ Settings!
```

**Cách dùng:**
1. Vào Settings → Tạo setting mới:
   - Key: `company_name`
   - Value: `Công ty TNHH XYZ`
   - Description: `Tên công ty hiển thị trong header`

2. Header sẽ tự động hiển thị tên mới!

---

## 💡 Ví dụ 2: Thông tin liên hệ

**Tạo các settings:**
- `company_phone`: `1900-xxxx`
- `company_email`: `support@example.com`
- `company_address`: `123 Đường ABC, Quận XYZ, TP.HCM`
- `company_website`: `https://example.com`

**Sử dụng trong component:**
```tsx
import { useSetting } from '@/hooks/useSettings';

function ContactInfo() {
  const { value: phone } = useSetting('company_phone');
  const { value: email } = useSetting('company_email');
  
  return (
    <div>
      <p>Hotline: {phone}</p>
      <p>Email: {email}</p>
    </div>
  );
}
```

---

## 💡 Ví dụ 3: Giới hạn hệ thống

**Tạo settings:**
- `max_order_quantity`: `1000` (Số lượng tối đa mỗi đơn hàng)
- `low_stock_threshold`: `10` (Cảnh báo khi tồn kho < 10)
- `order_timeout_minutes`: `30` (Thời gian timeout đơn hàng)

**Sử dụng trong code:**
```tsx
import { useSetting } from '@/hooks/useSettings';

function CreateOrder() {
  const { value: maxQty } = useSetting('max_order_quantity', '1000');
  const maxQuantity = parseInt(maxQty);
  
  // Validate
  if (quantity > maxQuantity) {
    alert(`Số lượng tối đa là ${maxQuantity}`);
  }
}
```

**Lợi ích:** Admin có thể thay đổi giới hạn mà không cần dev!

---

## 💡 Ví dụ 4: Thông báo/Banner

**Tạo settings:**
- `maintenance_message`: `Hệ thống sẽ bảo trì từ 22h-24h ngày 30/12`
- `promotion_banner`: `🎉 Giảm giá 50% cho tất cả sản phẩm!`
- `welcome_message`: `Chào mừng đến với hệ thống quản lý kho`

**Sử dụng:**
```tsx
import { useSetting } from '@/hooks/useSettings';

function Dashboard() {
  const { value: banner } = useSetting('promotion_banner');
  
  if (banner) {
    return (
      <div className="bg-yellow-100 p-4 rounded">
        {banner}
      </div>
    );
  }
}
```

---

## 💡 Ví dụ 5: Cấu hình tích hợp

**Tạo settings:**
- `payment_gateway_url`: `https://payment.example.com/api`
- `sms_api_key`: `xxxx-xxxx-xxxx` (Không hardcode trong code!)
- `email_smtp_host`: `smtp.gmail.com`

**Sử dụng trong Backend:**
```java
@Value("${settings.payment_gateway_url}")
private String paymentUrl;

// Hoặc lấy từ database
Setting paymentSetting = settingService.getByKey("payment_gateway_url");
String paymentUrl = paymentSetting.getValue();
```

---

## 💡 Ví dụ 6: Nội dung CMS

**Tạo settings:**
- `about_us`: `Nội dung giới thiệu công ty...`
- `terms_of_service`: `Điều khoản sử dụng...`
- `privacy_policy`: `Chính sách bảo mật...`

**Sử dụng:**
```tsx
function AboutPage() {
  const { value: aboutUs } = useSetting('about_us');
  
  return (
    <div dangerouslySetInnerHTML={{ __html: aboutUs }} />
  );
}
```

---

## 🛠️ Cách sử dụng Hook

### 1. Lấy một setting:
```tsx
import { useSetting } from '@/hooks/useSettings';

const { value, loading, refresh } = useSetting('setting_key', 'default_value');
```

### 2. Lấy nhiều settings:
```tsx
import { useSettings } from '@/hooks/useSettings';

const { settings, loading } = useSettings(['key1', 'key2', 'key3']);
// settings = { key1: 'value1', key2: 'value2', ... }
```

### 3. Clear cache (sau khi update):
```tsx
import { clearSettingsCache } from '@/hooks/useSettings';

// Sau khi update setting
clearSettingsCache();
```

---

## 📋 Danh sách Settings mẫu nên tạo

### Thông tin công ty:
- ✅ `company_name` - Tên công ty
- ✅ `company_address` - Địa chỉ
- ✅ `company_phone` - Số điện thoại
- ✅ `company_email` - Email
- ✅ `company_website` - Website
- ✅ `company_tax_code` - Mã số thuế

### Cấu hình hệ thống:
- ✅ `max_order_quantity` - Số lượng tối đa đơn hàng
- ✅ `low_stock_threshold` - Ngưỡng cảnh báo tồn kho
- ✅ `order_timeout_minutes` - Timeout đơn hàng
- ✅ `auto_backup_enabled` - Bật/tắt auto backup

### Thông báo:
- ✅ `maintenance_message` - Thông báo bảo trì
- ✅ `promotion_banner` - Banner khuyến mãi
- ✅ `welcome_message` - Lời chào

### Tích hợp:
- ✅ `payment_gateway_url` - URL payment gateway
- ✅ `sms_api_key` - API key SMS
- ✅ `email_smtp_host` - SMTP host

---

## 🎯 Kết luận

Settings giúp bạn:
1. **Linh hoạt** - Thay đổi nội dung không cần deploy
2. **Bảo mật** - Không hardcode sensitive data
3. **Dễ bảo trì** - Admin tự quản lý, không cần dev
4. **Tập trung** - Tất cả cấu hình ở một nơi
5. **Real-time** - Thay đổi có hiệu lực ngay

**Hãy bắt đầu tạo các settings cần thiết cho hệ thống của bạn!** 🚀

