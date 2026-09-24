# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG PHỄU TUYỂN SINH CRM TRÊN LIFERAY 7.4 DXP

Tài liệu này hướng dẫn chi tiết cách cài đặt, cấu hình, nạp cơ sở dữ liệu và vận hành hệ thống **Phân hệ Quản lý Phễu Tuyển sinh CRM** tích hợp trên nền tảng **Liferay 7.4 DXP**.

---

## 🏗️ 1. Kiến Trúc Hệ Thống

Hệ thống được thiết kế theo mô hình **Headless Client Extension** chuẩn của Liferay:
- **Liferay 7.4 DXP**: Đóng vai trò là Headless Backend & CSDL trung tâm lưu trữ thông qua **6 Liferay Objects** theo mô hình CDM (Conceptual Data Model):
  1. `Lead`: Lưu thông tin khách hàng tiềm năng.
  2. `Course`: Lưu thông tin khóa học / lớp học (học phí, phí cọc tối thiểu).
  3. `SaleStaff`: Quản lý danh sách tư vấn viên và trạng thái trực.
  4. `Deal`: Cơ hội tuyển sinh theo từng phễu.
  5. `DealAssignment`: Lịch sử phân công tư vấn viên cho từng Deal.
  6. `SaleLog`: Toàn bộ nhật ký cuộc gọi, tương tác và lý do hủy hồ sơ.
- **Node.js Express App (`client-extensions/crm-app`)**: Đóng vai trò Middleware và Frontend:
  - Tiếp nhận đăng ký từ Form khách hàng, chống trùng lặp dữ liệu theo số điện thoại.
  - Tự động phân bổ tư vấn viên theo thuật toán **Least-Recently-Assigned** (nhân viên trực có thời gian nhận khách xa nhất).
  - Cung cấp giao diện **Kanban 5 cột hỗ trợ Kéo - Thả (Drag & Drop)**.
  - Tích hợp sinh mã **VietQR** tự động khi đặt cọc và bắt buộc chọn lý do thất bại khi hủy hồ sơ.

---

## 💻 2. Yêu Cầu Môi Trường

Trước khi bắt đầu, đảm bảo máy tính đã cài đặt:
- **Docker Desktop** (hoặc Docker Engine + Docker Compose).
- **Node.js** phiên bản 18 trở lên (Khuyến nghị Node.js LTS).
- **Git**.
- **PowerShell** (trên Windows) hoặc Bash shell.
- Các cổng mạng còn trống:
  - `8080`: Cổng máy chủ Liferay DXP.
  - `5432`: Cổng cơ sở dữ liệu PostgreSQL của Liferay.
  - `3000`: Cổng giao diện ứng dụng CRM.

---

## 🚀 3. Các Bước Triển Khai Chi Tiết

### Bước 1: Khởi động Liferay 7.4 DXP & PostgreSQL
Từ thư mục gốc dự án (`d:/CT511_TTTN/project`), khởi chạy container:
```powershell
docker-compose up -d
```
> **Lưu ý:** Lần đầu khởi động, Liferay sẽ mất khoảng 2 - 3 phút để khởi tạo schema database. Bạn có thể kiểm tra trạng thái bằng lệnh:
> ```powershell
> docker logs -f mekocrm_liferay
> ```
> Khi thấy dòng log thông báo server Tomcat đã started trên cổng `8080`, bạn có thể truy cập [http://localhost:8080](http://localhost:8080) (Tài khoản mặc định: `test@liferay.com` / `test`).

---

### Bước 2: Triển khai Mô hình CSDL (Liferay Objects)
Dự án đã có sẵn script PowerShell tự động tạo Folder `MekoCRM`, cài đặt 6 Objects và thiết lập 6 Relationships 1:N:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/deploy-crm-objects.ps1"
```

*Script này sẽ tự động:*
1. Tạo thư mục Object Folder `MekoCRM` (`ERC_FOLDER_MEKOCRM`).
2. Khởi tạo và Approve lần lượt 6 Objects: `Lead`, `Course`, `SaleStaff`, `Deal`, `DealAssignment`, `SaleLog`.
3. Thiết lập các liên kết quan hệ 1:N giữa các Objects: `leadDeals`, `courseDeals`, `dealAssignments`, `saleAssignments`, `dealSaleLogs`, `saleMadeLogs`.

---

### Bước 3: Nạp Dữ Liệu Mẫu Ban Đầu (Seed Data)
Để hệ thống có sẵn danh mục khóa học chuẩn UTF-8 và nhân viên tư vấn đang trực:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/seed-data.ps1"
```

*Dữ liệu được nạp bao gồm:*
- **Các khóa học chuẩn**:
  - `Khóa Luyện Thi IELTS 6.5+ Mục Tiêu Du Học` (Học phí: 12.000.000 đ | Cọc: 2.000.000 đ)
  - `Tiếng Anh Giao Tiếp Doanh Nghiệp` (Học phí: 7.500.000 đ | Cọc: 1.000.000 đ)
  - `Lập Trình Web Full-Stack Chuyên Nghiệp` (Học phí: 15.000.000 đ | Cọc: 3.000.000 đ)
  - `Lập Trình Python & Trí Tuệ Nhân Tạo (AI)` (Học phí: 9.500.000 đ | Cọc: 1.500.000 đ)
- **Nhân viên Sale trực**:
  - `Nguyễn Văn Tuấn` (SĐT: 0901234567) - Trạng thái: Đang trực (`saleIsDuty = true`)
  - `Trần Thị Mai` (SĐT: 0909876543) - Trạng thái: Đang trực (`saleIsDuty = true`)

---

### Bước 4: Cài đặt và Khởi chạy Ứng dụng CRM

1. Di chuyển vào thư mục ứng dụng CRM:
   ```powershell
   cd client-extensions/crm-app
   ```
2. Cài đặt các thư viện cần thiết:
   ```powershell
   npm install
   ```
3. Khởi động máy chủ:
   ```powershell
   node server.js
   ```

Khi màn hình xuất hiện thông báo:
```text
CRM Server running at http://localhost:3000
- Trang Đăng Ký Khách Hàng: http://localhost:3000/register
- Trang Phễu Tuyển Sinh CRM: http://localhost:3000/crm
- Trang Quản Lý Khóa/Lớp Học: http://localhost:3000/courses
```
Hệ thống đã sẵn sàng hoạt động!

---

## 🌐 4. Các Đường Dẫn Truy Cập Phân Hệ

| Phân hệ | Đường dẫn | Đối tượng | Mô tả |
| :--- | :--- | :--- | :--- |
| **Cổng Điều Hướng** | [http://localhost:3000/](http://localhost:3000/) | Mọi người | Trang chủ lựa chọn phân hệ làm việc |
| **Form Đăng Ký Khách Hàng** | [http://localhost:3000/register](http://localhost:3000/register) | Học viên | Form đăng ký tư vấn sạch, tự động gán nguồn là `Form`, không để lộ thông tin kỹ thuật nội bộ |
| **Phân Hệ CRM & Kanban** | [http://localhost:3000/crm](http://localhost:3000/crm) | Tư vấn viên | Tra cứu SĐT nhận diện khách cũ/mới, Bảng **Kanban 5 cột Kéo - Thả**, Modal VietQR, Modal lý do hủy, Side Drawer xem chi tiết |
| **Quản Lý Lớp & Khóa Học** | [http://localhost:3000/courses](http://localhost:3000/courses) | Đào tạo / Admin | Thêm mới khóa học/lớp học, thiết lập học phí và mức phí cọc tối thiểu để tư vấn viên xếp lớp |

---

## 🎯 5. Hướng Dẫn Kiểm Thử Các Luồng Nghiệp Vụ Cốt Lõi

### A. Kiểm thử Kéo - Thả Trên Bảng Kanban (Chức năng 1.3 & 1.5)
1. Mở trang [http://localhost:3000/crm](http://localhost:3000/crm).
2. **Kéo từ `MỚI` sang `CHỜ TƯ VẤN`**: Thẻ lập tức chuyển cột, cập nhật CSDL.
3. **Kéo sang `CHỜ CỌC`**: 
   - Tự động bật Modal **Xác Nhận Đặt Cọc & Mã VietQR**.
   - Hiển thị ảnh mã QR VietQR thật của ngân hàng kèm cú pháp chuyển khoản `MEKO [Mã Deal] [SĐT]`.
   - Bấm *Xác nhận đặt cọc* $\rightarrow$ Thẻ chuyển sang cột Chờ cọc kèm nhãn số tiền đã cọc.
4. **Kéo lùi về `CHỜ TƯ VẤN`**: Nếu khách đổi ý muốn suy nghĩ thêm hoặc dời lịch, kéo thẻ lùi về cột Chờ tư vấn để tiếp tục chăm sóc.
5. **Kéo sang `ĐÃ HỦY`**:
   - Tự động bật Modal **Xác Nhận Lý Do Hủy (Lost)**.
   - Bắt buộc chọn lý do: *Học phí cao*, *Trùng lịch bận*, *Đi lại xa*, *Đã học nơi khác*, *Đổi định hướng*, *Không liên lạc được*.
   - Nhập ghi chú $\rightarrow$ Bấm *Xác nhận hủy*, thẻ chuyển sang màu xám và hiện rõ lý do hủy.

### B. Kiểm thử Xem Chi Tiết & Ghi Log (Side Drawer - Chức năng 1.4)
1. Click vào bất kỳ thẻ học viên nào trên Kanban.
2. Ngăn kéo **Side Drawer** từ bên phải trượt ra, hiển thị:
   - Thông tin cá nhân học viên, nguồn đăng ký.
   - Thông tin khóa học, học phí, số tiền đã cọc/đã nộp.
   - Dòng thời gian **Timeline** toàn bộ các cuộc gọi, ghi chép trước đây.
3. Nhập kênh liên lạc, kết quả cuộc gọi, ghi chú và lịch hẹn gọi lại vào form ở đáy Drawer rồi bấm **Lưu Ghi Chú**. Thẻ trên Kanban và timeline sẽ tự động cập nhật ngay lập tức.

### C. Kiểm thử Chống Trùng SĐT (Chức năng 0.2)
1. Mở trang [http://localhost:3000/register](http://localhost:3000/register).
2. Nhập số điện thoại của một học viên **đang có hồ sơ trên phễu** (ví dụ: `0988776655` - Phạm Tuấn Anh):
   - Form báo tiếp nhận thành công.
   - Kiểm tra trên Kanban: **Tuyệt đối không sinh thêm Deal mới ở cột MỚI** (tránh rác phễu).
   - Trên thẻ hiện tại của Phạm Tuấn Anh sẽ tự động xuất hiện nhãn cam nhấp nháy: **`🔔 Khách gửi lại form`** kèm nội dung ghi chú mới!

---

## 📁 6. Cấu Trúc Thư Mục Dự Án

```text
project/
├── backups/objects/              # Bản sao lưu JSON định nghĩa 6 Liferay Objects
│   ├── Lead.json
│   ├── Course.json
│   ├── SaleStaff.json
│   ├── Deal.json
│   ├── DealAssignment.json
│   └── SaleLog.json
├── client-extensions/crm-app/    # Mã nguồn ứng dụng CRM Full-stack
│   ├── public/
│   │   ├── index.html            # Cổng điều hướng 3 phân hệ
│   │   ├── landing.html          # Form đăng ký tư vấn dành cho học viên
│   │   ├── crm.html              # Phân hệ CRM Kanban Kéo Thả & Tra cứu SĐT
│   │   └── courses.html          # Giao diện quản lý khóa học / lớp học
│   ├── server.js                 # Backend Express kết nối Liferay Headless REST
│   └── package.json
├── scripts/
│   ├── deploy-crm-objects.ps1    # Script tự động tạo và publish 6 Objects
│   ├── seed-data.ps1             # Script nạp dữ liệu mẫu ban đầu
│   ├── check_records.js          # Script kiểm tra số lượng bản ghi trong CSDL
│   └── clean_duplicates.js       # Script tự động phát hiện và xóa bản ghi trùng
├── docker-compose.yml            # Cấu hình container Liferay & PostgreSQL
├── HUONG_DAN_TRIEN_KHAI.md       # Tài liệu hướng dẫn triển khai (File này)
└── HUONG_DAN_CAI_DAT_CDM_OBJECTS.md
```
