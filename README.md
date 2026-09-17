# 🎓 Education CRM - Liferay 7.4 Workspace & Infrastructure

[![Liferay](https://img.shields.io/badge/Liferay-7.4%20CE%20GA132-blue.svg)](https://www.liferay.com)
[![Docker](https://img.shields.io/badge/Docker-WSL2%20Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Java](https://img.shields.io/badge/JDK-OpenJDK%2011%20(LTS)-ED8B00.svg?logo=openjdk&logoColor=white)](https://adoptium.net)
[![Gradle](https://img.shields.io/badge/Build-Gradle%20Wrapper-02303A.svg?logo=gradle&logoColor=white)](https://gradle.org)

> **Học phần:** Thực tập tốt nghiệp ngành Kỹ thuật Phần mềm (CT511_TTTN)  
> **Đề tài:** Xây dựng Phân hệ Quản lý Tuyển sinh & Báo cáo CRM trên nền tảng Liferay 7.4 Community Edition  
> **Sinh viên thực hiện:** Trần Lê Việt Tiến (`tienb2203479@student.ctu.edu.vn`)  

---

## 📌 Giới thiệu dự án

Dự án này cung cấp bộ khung **Liferay Workspace chuẩn doanh nghiệp** tích hợp toàn bộ **hạ tầng dịch vụ chạy trên Docker (Containerized)** cho nền tảng **Liferay 7.4 Community Edition (GA132)** kết nối với hệ quản trị cơ sở dữ liệu **PostgreSQL 15**.

Hệ thống được tối ưu hóa sẵn:
- Phân bổ chuyên dụng **4GB RAM** cho tiến trình Java JVM Liferay Portal.
- Tự động kết nối cơ sở dữ liệu qua cấu hình JDBC `portal-ext.properties`.
- Tối ưu hóa bộ nhớ đĩa, tách biệt dữ liệu nhị phân với mã nguồn qua `.gitignore` chuẩn.

---

## 🏗️ Cấu trúc thư mục dự án

```text
.
├── docker/                             # Cấu hình hạ tầng containerized
│   ├── docker-compose.yml              # Khởi chạy PostgreSQL 15 & Liferay 7.4 GA132
│   └── files/
│       └── portal-ext.properties       # Cấu hình kết nối JDBC tới PostgreSQL
├── client-extensions/                  # Nơi phát triển Frontend (React, Vue, Custom Elements)
├── modules/                            # Nơi phát triển OSGi Modules / REST APIs Backend
├── themes/                             # Nơi phát triển giao diện Portal
├── configs/                            # Cấu hình môi trường (local, dev, uat, prod)
├── gradle/wrapper/                     # Bộ Gradle Wrapper chạy build độc lập
├── .gitignore                          # Loại trừ file rác, build, dữ liệu database
├── gradle.properties                   # Cấu hình liferay.workspace.product=portal-7.4-ga132
├── build.gradle                        # Gradle build script gốc
└── settings.gradle                     # Khai báo liên kết các module
```

---

## ⚡ Hướng dẫn khởi chạy nhanh (Quick Start)

### 1. Yêu cầu môi trường (Prerequisites)
- **Git** $\ge$ 2.40
- **Java OpenJDK 11** (Eclipse Temurin LTS)
- **Docker Desktop** (kích hoạt WSL2 backend)

### 2. Clone mã nguồn
```bash
git clone https://github.com/trantienkgdx-bot/Liferay.git
cd Liferay
```

### 3. Khởi chạy hạ tầng Liferay & PostgreSQL (1-Click)
```bash
cd docker
docker compose up -d
```

Để theo dõi tiến trình khởi động máy chủ:
```bash
docker compose logs -f liferay
```

### 4. Truy cập giao diện quản trị
Sau khi hệ thống khởi động hoàn tất (khoảng 3 - 5 phút cho lần đầu tiên):
- **Địa chỉ:** [http://localhost:8080](http://localhost:8080)
- **Tài khoản mặc định ban đầu:**
  - Email: `test@liferay.com`
  - Mật khẩu: `test`

---

## ⚙️ Thông số cấu hình hệ thống

| Thành phần | Thông số chi tiết |
| :--- | :--- |
| **Liferay Portal** | Version 7.4.3.132-ga132 (Community Edition) |
| **Cổng dịch vụ Web** | `8080` (HTTP Portal), `11311` (OSGi Agent/Debug) |
| **Bộ nhớ cấp phát (JVM)** | `-Xms4096m -Xmx4096m -XX:MaxMetaspaceSize=1024m` (4GB RAM) |
| **Cơ sở dữ liệu** | PostgreSQL 15 (Alpine Linux) |
| **Tên Database** | `liferay_crm_db` |
| **Cổng Database** | `5432` |
| **Người dùng Database** | `liferay` / Mật khẩu: `liferaypassword` |

---

## 📝 Nhật ký & Tài liệu chi tiết

Xem chi tiết toàn bộ các bước thiết lập từ số 0 tại file:
👉 **[HUONG_DAN_TRIEN_KHAI_LIFERAY_7.4_WORKSPACE_DOCKER.md](./HUONG_DAN_TRIEN_KHAI_LIFERAY_7.4_WORKSPACE_DOCKER.md)**

---
*Phát triển bởi Trần Lê Việt Tiến - Đồ án Thực tập tốt nghiệp CT511.*
