# 📘 HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH HỆ THỐNG PHỄU TUYỂN SINH CRM
### (Nền tảng Liferay 7.4 DXP & Full-Stack Client Extension)

> Tài liệu này được thiết kế theo dạng **Copy & Run**: Mọi bước đều có sẵn khối mã lệnh (Code block) hoàn chỉnh, bạn chỉ cần copy dán vào PowerShell là hệ thống tự động thiết lập và chạy thành công 100%.

---

## 📋 MỤC LỤC
1. [Chuẩn Bị & Khởi Động Container Docker](#-bước-1-khởi-động-hạ-tầng-docker)
2. [Cài Đặt Mô Hình CSDL (6 Liferay Objects & Relationships)](#-bước-2-cài-đặt-6-liferay-objects--relationships)
3. [Nạp Dữ Liệu Mẫu (Seed Data Khóa Học & Nhân Viên Sale)](#-bước-3-nạp-dữ-liệu-mẫu-seed-data)
4. [Cài Đặt & Khởi Chạy Ứng Dụng CRM App](#-bước-4-khởi-chạy-ứng-dụng-crm-port-3000)
5. [Kiểm Thử Các API Bằng Lệnh Copy-Paste](#-bước-5-lệnh-kiểm-thử-api-nhanh)
6. [Các Đường Dẫn Giao Diện Trực Quan](#-bước-6-các-đường-dẫn-giao-diện)
7. [Lệnh Dọn Dẹp / Sửa Lỗi Thường Gặp](#-bước-7-các-lệnh-bảo-trì--dọn-dẹp)

---

## 🐳 BƯỚC 1: Khởi Động Hạ Tầng Docker

Mở PowerShell tại thư mục gốc của dự án (`d:\CT511_TTTN\project`):

```powershell
# 1.1. Khởi động Docker containers chạy ngầm
docker-compose up -d

# 1.2. Kiểm tra trạng thái hoạt động của các container
docker ps
```

*Kết quả chuẩn: Cả 2 container `mekocrm_liferay` (cổng 8080) và `mekocrm_postgres` (cổng 5432) đều ở trạng thái `Up (healthy)`.*

```powershell
# 1.3. (Tùy chọn) Xem nhật ký khởi động của Liferay
docker logs -f mekocrm_liferay
```
> Nhấn `Ctrl + C` để thoát màn hình xem log. Khi máy chủ sẵn sàng, bạn có thể mở [http://localhost:8080](http://localhost:8080) (Đăng nhập: `test@liferay.com` / Mật khẩu: `test`).

---

## 🗄️ BƯỚC 2: Cài Đặt 6 Liferay Objects & Relationships

Hệ thống cung cấp script tự động tạo Thư mục `MekoCRM`, tạo 6 Objects chuẩn CDM và thiết lập 6 mối quan hệ 1:N thông qua Headless REST API:

```powershell
# Chạy script cài đặt tự động toàn bộ Objects
powershell -ExecutionPolicy Bypass -File "scripts/deploy-crm-objects.ps1"
```

*Script trên tự động tạo và Approve 6 Objects sau:*
- `Lead` (`ERC_OBJECT_LEAD`): Họ tên, Số điện thoại, Email, Ngày sinh, Nguồn tiếp cận.
- `Course` (`ERC_OBJECT_COURSE`): Mã khóa, Tên khóa/lớp học, Học phí chính thức, Phí cọc tối thiểu.
- `SaleStaff` (`ERC_OBJECT_SALESTAFF`): Tên nhân viên, Số điện thoại, Trạng thái trực (`saleIsDuty`), Thời gian phân bổ gần nhất.
- `Deal` (`ERC_OBJECT_DEAL`): Cơ hội tuyển sinh theo 5 trạng thái phễu (`NEW`, `PENDING_CONSULT`, `PENDING_DEPOSIT`, `COMPLETED`, `CANCELLED`), Số tiền đã cọc/đã nộp, Điểm thi thử, Lý do hủy.
- `DealAssignment` (`ERC_OBJECT_DEALASSIGNMENT`): Lịch sử phân công nhân viên tư vấn cho từng Deal.
- `SaleLog` (`ERC_OBJECT_SALELOG`): Nhật ký tương tác (kênh liên lạc, kết quả cuộc gọi, ghi chú chi tiết).

---

## 📚 BƯỚC 3: Nạp Dữ Liệu Mẫu (Seed Data)

Nạp danh mục khóa học chuẩn font tiếng Việt UTF-8 và nhân viên tư vấn đang bật chế độ nhận khách:

```powershell
# Chạy script nạp dữ liệu mẫu
powershell -ExecutionPolicy Bypass -File "scripts/seed-data.ps1"
```

*Dữ liệu được nạp vào hệ thống:*
- Khóa 1: `Khóa Luyện Thi IELTS 6.5+ Mục Tiêu Du Học` (12.000.000 đ | Cọc: 2.000.000 đ)
- Khóa 2: `Tiếng Anh Giao Tiếp Doanh Nghiệp` (7.500.000 đ | Cọc: 1.000.000 đ)
- Khóa 3: `Lập Trình Web Full-Stack Chuyên Nghiệp` (15.000.000 đ | Cọc: 3.000.000 đ)
- Khóa 4: `Lập Trình Python & Trí Tuệ Nhân Tạo (AI)` (9.500.000 đ | Cọc: 1.500.000 đ)
- Nhân viên 1: `Nguyễn Văn Tuấn` (SĐT: 0901234567 | Trực: BẬT)
- Nhân viên 2: `Trần Thị Mai` (SĐT: 0909876543 | Trực: BẬT)

---

## 🚀 BƯỚC 4: Khởi Chạy Ứng Dụng CRM (Port 3000)

```powershell
# 4.1. Di chuyển vào thư mục ứng dụng CRM
cd client-extensions/crm-app

# 4.2. Cài đặt các gói phụ thuộc (chỉ cần chạy 1 lần đầu)
npm install

# 4.3. Khởi động server
node server.js
```

Khi màn hình hiển thị:
```text
CRM Server running at http://localhost:3000
- Trang Đăng Ký Khách Hàng: http://localhost:3000/register
- Trang Phễu Tuyển Sinh CRM: http://localhost:3000/crm
- Trang Quản Lý Khóa/Lớp Học: http://localhost:3000/courses
```
Ứng dụng đã sẵn sàng phục vụ!

## 🧪 BƯỚC 5: Lệnh Kiểm Thử API & Chấm Điểm Tự Động

Mở một cửa sổ PowerShell mới để kiểm tra các luồng nghiệp vụ thông qua lệnh Copy & Run:

### 5.1. Kiểm tra danh sách khóa học:
```powershell
curl.exe -s http://localhost:3000/api/courses
```

### 5.2. Test đăng ký học viên mới (Chống trùng SĐT):
```powershell
$headers = @{ "Content-Type" = "application/json; charset=utf-8" }
$body = @{
    leadName = "Đặng Hoàng Long"
    leadPhone = "0933445566"
    leadEmail = "long.dh@gmail.com"
    courseId = 33857
    note = "Em muốn đăng ký lớp học vào tối thứ 2-4-6"
} | ConvertTo-Json -Compress

Invoke-RestMethod -Uri "http://localhost:3000/api/register" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

### 5.3. Test nộp bài thi & Tự động chấm điểm (Chức năng Test Năng Lực):
```powershell
# Gửi bài thi trực tuyến với các câu trả lời trắc nghiệm:
$testBody = @{
    dealId = 33831
    answers = @{
        q1 = "B"
        q2 = "B"
        q3 = "C"
        q4 = "C"
        q5 = "A"
    }
} | ConvertTo-Json -Compress

Invoke-RestMethod -Uri "http://localhost:3000/api/test/submit" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($testBody))
```
*Hệ thống tự động chấm 10/10, lưu vào Liferay `Deal.dealTestScore`, ghi 1 bản ghi `SaleLog` và cập nhật điểm số trực tiếp lên thẻ Kanban!*

---

## 🌐 BƯỚC 6: Các Đường Dẫn Giao Diện

Mở trình duyệt web và truy cập các liên kết sau:

| Trang Giao Diện | Đường dẫn truy cập | Chức năng nổi bật |
| :--- | :--- | :--- |
| **Cổng Điều Hướng** | [http://localhost:3000/](http://localhost:3000/) | Lựa chọn nhanh phân hệ làm việc |
| **Form Đăng Ký Tư Vấn** | [http://localhost:3000/register](http://localhost:3000/register) | Dành cho học viên: Giao diện sạch, tự động gán nguồn là `Form`, không để lộ thông tin kỹ thuật nội bộ |
| **Phân Hệ CRM & Kanban** | [http://localhost:3000/crm](http://localhost:3000/crm) | Dành cho Sale: Tra cứu SĐT nhận diện khách cũ/mới, **Kanban 5 cột hỗ trợ Kéo - Thả**, Modal VietQR, Modal lý do hủy, Side Drawer chi tiết |
| **Quản Lý Lớp & Khóa Học** | [http://localhost:3000/courses](http://localhost:3000/courses) | Dành cho Đào tạo/Admin: Bảng quản lý, thêm lớp học, cài đặt học phí và mức cọc để Sale có căn cứ xếp lớp |
| **Làm Bài Test Năng Lực** | [http://localhost:3000/test?dealId=33831](http://localhost:3000/test?dealId=33831) | Dành cho học viên: Làm bài trắc nghiệm online 15 phút, tự động chấm điểm tức thì và đồng bộ vào CRM |

---

## 🛠️ BƯỚC 7: Các Lệnh Bảo Trì & Dọn Dẹp

Nếu trong quá trình vận hành bạn muốn kiểm tra trạng thái CSDL hoặc dọn dẹp các bản ghi trùng lặp:

```powershell
# 7.1. Kiểm tra toàn bộ số lượng Lead và Deal trong CSDL Liferay
node scripts/check_records.js

# 7.2. Tự động phát hiện và xóa sạch các Deal/Lead bị trùng lặp
node scripts/clean_duplicates.js

# 7.3. Sao lưu (Backup) toàn bộ định nghĩa 6 Objects ra file JSON
powershell -ExecutionPolicy Bypass -File "scripts/backup-crm-objects.ps1"
```

---

## 📤 BƯỚC 8: Đẩy Mã Nguồn Lên GitHub

Khi cần đồng bộ toàn bộ dự án lên kho chứa GitHub:

```powershell
# Kiểm tra trạng thái Git
git status

# Đẩy mã nguồn lên nhánh chính
git push origin main
```
*(Nếu hệ thống hỏi xác thực, bạn chỉ cần đăng nhập tài khoản GitHub qua cửa sổ trình duyệt mở ra).*
