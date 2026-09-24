# HƯỚNG DẪN CÀI ĐẶT LIFERAY OBJECT THEO CDM (COPY & CHẠY NGAY)

---

## BƯỚC 1: TẢI DỰ ÁN VÀ KHỞI ĐỘNG HỆ THỐNG

Mở **PowerShell** và chạy lần lượt các lệnh sau:

```powershell
# 1.1. Di chuyển vào thư mục làm việc và tải mã nguồn từ GitHub
mkdir D:\CT511_TTTN\project
cd D:\CT511_TTTN\project
git clone https://github.com/trantienkgdx-bot/Liferay.git .

# 1.2. Khởi động Liferay và CSDL PostgreSQL bằng Docker (nếu chưa chạy)
docker compose -f docker\docker-compose.yml up -d
```
> *Lưu ý: Chờ 2-3 phút để Liferay khởi động hoàn tất. Truy cập kiểm tra tại: `http://localhost:8080` (Tài khoản: `test@liferay.com` | Mật khẩu: `test`).*

---

## BƯỚC 2: CHẠY LỆNH CÀI ĐẶT CDM OBJECTS VÀO LIFERAY

Chạy lệnh sau trong PowerShell để tự động tạo thư mục **Meko CRM**, tạo **6 Objects** và **6 Mối quan hệ**:

```powershell
# Mở khóa quyền chạy script
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Thực thi cài đặt tự động
.\scripts\deploy-crm-objects.ps1
```

---

## BƯỚC 3: KIỂM TRA TRÊN GIAO DIỆN WEB

1. Vào [http://localhost:8080](http://localhost:8080), đăng nhập `test@liferay.com` / `test`.
2. Mở **Control Panel** $\rightarrow$ **Objects** (Đối tượng).
3. Cột bên trái mục **THƯ MỤC ĐỐI TƯỢNG**, chọn **Meko CRM**.
4. Bạn sẽ thấy đầy đủ 6 Objects đã xuất bản (**Approved**).
5. Bấm nút **"Xem trong Model Builder"** ở góc trên bên phải để xem sơ đồ ERD trực quan.

---

## BƯỚC 4: LỆNH SAO LƯU (BACKUP) & COMMIT GIT

```powershell
# Sao lưu toàn bộ 6 Objects ra file JSON trong thư mục backups/objects/
.\scripts\backup-crm-objects.ps1

# Lưu lên GitHub
git add .
git commit -m "feat: setup CDM objects in Meko CRM folder"
git push origin main
```

---

# TOÀN BỘ MÃ NGUỒN CÁC FILE CẤU HÌNH LIÊN QUAN

Dưới đây là nội dung đầy đủ của từng file trong dự án để phục vụ backup hoặc tái tạo lại bất kỳ lúc nào:

### 1. File: `client-extensions/crm-objects-batch/client-extension.yaml`
```yaml
assemble:
    - from: batch
      into: batch

crm-objects-batch:
    name: CRM Objects Batch Initialization
    oAuthApplicationHeadlessServer: crm-objects-oauth-server
    type: batch

crm-objects-oauth-server:
    .serviceAddress: localhost:8080
    .serviceScheme: http
    name: CRM Objects OAuth Server
    scopes:
        - Liferay.Headless.Batch.Engine.everything
        - Liferay.Object.Admin.REST.everything
    type: oAuthApplicationHeadlessServer
```

---

### 2. File: `client-extensions/crm-objects-batch/batch/01-00-folder-definition.batch-engine-data.json`
```json
{
  "configuration": {
    "className": "com.liferay.object.admin.rest.dto.v1_0.ObjectFolder",
    "parameters": {
      "createStrategy": "UPSERT",
      "updateStrategy": "UPDATE"
    }
  },
  "items": [
    {
      "externalReferenceCode": "ERC_FOLDER_MEKOCRM",
      "name": "MekoCRM",
      "label": {
        "en_US": "Meko CRM",
        "vi_VN": "Meko CRM"
      }
    }
  ]
}
```

---

### 3. File: `client-extensions/crm-objects-batch/batch/01-01-object-definition.batch-engine-data.json`
```json
{
  "configuration": {
    "className": "com.liferay.object.admin.rest.dto.v1_0.ObjectDefinition",
    "parameters": {
      "createStrategy": "UPSERT",
      "updateStrategy": "UPDATE"
    }
  },
  "items": [
    {
      "externalReferenceCode": "ERC_OBJECT_LEAD",
      "name": "Lead",
      "label": {
        "en_US": "Lead",
        "vi_VN": "Khách hàng tiềm năng (Lead)"
      },
      "pluralLabel": {
        "en_US": "leads",
        "vi_VN": "leads"
      },
      "scope": "company",
      "status": { "code": 0 },
      "objectFolderExternalReferenceCode": "ERC_FOLDER_MEKOCRM",
      "titleObjectFieldName": "leadPhone",
      "objectFields": [
        {
          "name": "leadId",
          "label": { "en_US": "Lead ID", "vi_VN": "Mã Lead" },
          "businessType": "Text",
          "required": true,
          "indexed": true
        },
        {
          "name": "leadName",
          "label": { "en_US": "Lead Name", "vi_VN": "Tên Lead" },
          "businessType": "Text",
          "required": false,
          "indexed": true
        },
        {
          "name": "leadPhone",
          "label": { "en_US": "Lead Phone", "vi_VN": "Số điện thoại" },
          "businessType": "Text",
          "required": true,
          "indexed": true
        },
        {
          "name": "leadEmail",
          "label": { "en_US": "Lead Email", "vi_VN": "Email" },
          "businessType": "Text",
          "required": false
        },
        {
          "name": "leadBirthday",
          "label": { "en_US": "Lead Birthday", "vi_VN": "Ngày sinh" },
          "businessType": "Date",
          "required": false
        },
        {
          "name": "leadSource",
          "label": { "en_US": "Lead Source", "vi_VN": "Nguồn Lead" },
          "businessType": "Text",
          "required": true
        },
        {
          "name": "leadCreatedAt",
          "label": { "en_US": "Lead Created At", "vi_VN": "Ngày tạo" },
          "businessType": "DateTime",
          "required": true,
          "objectFieldSettings": [
            { "name": "timeStorage", "value": "convertToUTC" }
          ]
        }
      ]
    },
    {
      "externalReferenceCode": "ERC_OBJECT_COURSE",
      "name": "Course",
      "label": {
        "en_US": "Course",
        "vi_VN": "Khóa học (Course)"
      },
      "pluralLabel": {
        "en_US": "courses",
        "vi_VN": "courses"
      },
      "scope": "company",
      "status": { "code": 0 },
      "objectFolderExternalReferenceCode": "ERC_FOLDER_MEKOCRM",
      "titleObjectFieldName": "courseName",
      "objectFields": [
        {
          "name": "courseId",
          "label": { "en_US": "Course ID", "vi_VN": "Mã khóa học" },
          "businessType": "Text",
          "required": true,
          "indexed": true
        },
        {
          "name": "courseName",
          "label": { "en_US": "Course Name", "vi_VN": "Tên khóa học" },
          "businessType": "Text",
          "required": true,
          "indexed": true
        },
        {
          "name": "courseTuitionFee",
          "label": { "en_US": "Course Tuition Fee", "vi_VN": "Học phí" },
          "businessType": "Decimal",
          "required": true
        },
        {
          "name": "courseDepositFee",
          "label": { "en_US": "Course Deposit Fee", "vi_VN": "Phí cọc" },
          "businessType": "Decimal",
          "required": true
        }
      ]
    },
    {
      "externalReferenceCode": "ERC_OBJECT_SALESTAFF",
      "name": "SaleStaff",
      "label": {
        "en_US": "Sale Staff",
        "vi_VN": "Nhân viên Sale (Sale Staff)"
      },
      "pluralLabel": {
        "en_US": "salestaff",
        "vi_VN": "salestaff"
      },
      "scope": "company",
      "status": { "code": 0 },
      "objectFolderExternalReferenceCode": "ERC_FOLDER_MEKOCRM",
      "titleObjectFieldName": "saleName",
      "objectFields": [
        {
          "name": "saleId",
          "label": { "en_US": "Sale ID", "vi_VN": "Mã Sale" },
          "businessType": "Text",
          "required": true,
          "indexed": true
        },
        {
          "name": "saleName",
          "label": { "en_US": "Sale Name", "vi_VN": "Tên nhân viên" },
          "businessType": "Text",
          "required": true,
          "indexed": true
        },
        {
          "name": "salePhone",
          "label": { "en_US": "Sale Phone", "vi_VN": "Số điện thoại" },
          "businessType": "Text",
          "required": true
        },
        {
          "name": "saleEmail",
          "label": { "en_US": "Sale Email", "vi_VN": "Email" },
          "businessType": "Text",
          "required": false
        },
        {
          "name": "saleIsDuty",
          "label": { "en_US": "Sale Is Duty", "vi_VN": "Đang trực ca" },
          "businessType": "Boolean",
          "required": true
        },
        {
          "name": "saleLastAssignedTime",
          "label": { "en_US": "Sale Last Assigned Time", "vi_VN": "Lần phân công gần nhất" },
          "businessType": "DateTime",
          "required": false,
          "objectFieldSettings": [
            { "name": "timeStorage", "value": "convertToUTC" }
          ]
        }
      ]
    },
    {
      "externalReferenceCode": "ERC_OBJECT_DEAL",
      "name": "Deal",
      "label": {
        "en_US": "Deal",
        "vi_VN": "Giao dịch (Deal)"
      },
      "pluralLabel": {
        "en_US": "deals",
        "vi_VN": "deals"
      },
      "scope": "company",
      "status": { "code": 0 },
      "objectFolderExternalReferenceCode": "ERC_FOLDER_MEKOCRM",
      "titleObjectFieldName": "dealId",
      "objectFields": [
        {
          "name": "dealId",
          "label": { "en_US": "Deal ID", "vi_VN": "Mã Deal" },
          "businessType": "Text",
          "required": true,
          "indexed": true
        },
        {
          "name": "dealStatus",
          "label": { "en_US": "Deal Status", "vi_VN": "Trạng thái Deal" },
          "businessType": "Text",
          "required": true,
          "indexed": true
        },
        {
          "name": "dealTestScore",
          "label": { "en_US": "Deal Test Score", "vi_VN": "Điểm test" },
          "businessType": "Decimal",
          "required": true
        },
        {
          "name": "dealPaidAmount",
          "label": { "en_US": "Deal Paid Amount", "vi_VN": "Tiền đã đóng" },
          "businessType": "Decimal",
          "required": false
        },
        {
          "name": "dealLostReason",
          "label": { "en_US": "Deal Lost Reason", "vi_VN": "Lý do mất deal" },
          "businessType": "Text",
          "required": false
        },
        {
          "name": "dealLostNote",
          "label": { "en_US": "Deal Lost Note", "vi_VN": "Ghi chú mất deal" },
          "businessType": "LongText",
          "required": false
        },
        {
          "name": "dealLastContactDate",
          "label": { "en_US": "Deal Last Contact Date", "vi_VN": "Ngày liên hệ gần nhất" },
          "businessType": "DateTime",
          "required": false,
          "objectFieldSettings": [
            { "name": "timeStorage", "value": "convertToUTC" }
          ]
        },
        {
          "name": "dealNextAppointment",
          "label": { "en_US": "Deal Next Appointment", "vi_VN": "Lịch hẹn kế tiếp" },
          "businessType": "DateTime",
          "required": false,
          "objectFieldSettings": [
            { "name": "timeStorage", "value": "convertToUTC" }
          ]
        },
        {
          "name": "dealCreatedAt",
          "label": { "en_US": "Deal Created At", "vi_VN": "Ngày tạo deal" },
          "businessType": "DateTime",
          "required": true,
          "objectFieldSettings": [
            { "name": "timeStorage", "value": "convertToUTC" }
          ]
        },
        {
          "name": "assignStatus",
          "label": { "en_US": "Assign Status", "vi_VN": "Trạng thái phân công" },
          "businessType": "Text",
          "required": true
        }
      ]
    },
    {
      "externalReferenceCode": "ERC_OBJECT_ASSIGN",
      "name": "DealAssignment",
      "label": {
        "en_US": "Deal Assignment",
        "vi_VN": "Phân công Deal (Assign)"
      },
      "pluralLabel": {
        "en_US": "dealassignments",
        "vi_VN": "dealassignments"
      },
      "scope": "company",
      "status": { "code": 0 },
      "objectFolderExternalReferenceCode": "ERC_FOLDER_MEKOCRM",
      "titleObjectFieldName": "assignStatus",
      "objectFields": [
        {
          "name": "assignAt",
          "label": { "en_US": "Assign At", "vi_VN": "Thời gian phân công" },
          "businessType": "DateTime",
          "required": true,
          "objectFieldSettings": [
            { "name": "timeStorage", "value": "convertToUTC" }
          ]
        },
        {
          "name": "assignStatus",
          "label": { "en_US": "Assign Status", "vi_VN": "Trạng thái phân công" },
          "businessType": "Text",
          "required": true
        },
        {
          "name": "assignRevokeReason",
          "label": { "en_US": "Assign Revoke Reason", "vi_VN": "Lý do thu hồi" },
          "businessType": "Text",
          "required": false
        }
      ]
    },
    {
      "externalReferenceCode": "ERC_OBJECT_SALELOG",
      "name": "SaleLog",
      "label": {
        "en_US": "Sale Log",
        "vi_VN": "Nhật ký cuộc gọi/gặp (Sale Log)"
      },
      "pluralLabel": {
        "en_US": "salelogs",
        "vi_VN": "salelogs"
      },
      "scope": "company",
      "status": { "code": 0 },
      "objectFolderExternalReferenceCode": "ERC_FOLDER_MEKOCRM",
      "titleObjectFieldName": "logOutcome",
      "objectFields": [
        {
          "name": "logChannel",
          "label": { "en_US": "Log Channel", "vi_VN": "Kênh liên hệ" },
          "businessType": "Text",
          "required": true
        },
        {
          "name": "logOutcome",
          "label": { "en_US": "Log Outcome", "vi_VN": "Kết quả liên hệ" },
          "businessType": "Text",
          "required": true
        },
        {
          "name": "logNoteContent",
          "label": { "en_US": "Log Note Content", "vi_VN": "Nội dung ghi chú" },
          "businessType": "Text",
          "required": true
        },
        {
          "name": "logCreatedAt",
          "label": { "en_US": "Log Created At", "vi_VN": "Ngày tạo nhật ký" },
          "businessType": "DateTime",
          "required": true,
          "objectFieldSettings": [
            { "name": "timeStorage", "value": "convertToUTC" }
          ]
        }
      ]
    }
  ]
}
```

---

### 4. File: `client-extensions/crm-objects-batch/batch/02-00-relationship.batch-engine-data.json`
```json
{
  "configuration": {
    "className": "com.liferay.object.admin.rest.dto.v1_0.ObjectRelationship",
    "parameters": {
      "createStrategy": "UPSERT",
      "updateStrategy": "UPDATE"
    }
  },
  "items": [
    {
      "deletionType": "prevent",
      "label": { "en_US": "Lead Deals (HAS)", "vi_VN": "Lead Deals (HAS)" },
      "name": "leadDeals",
      "objectDefinitionExternalReferenceCode1": "ERC_OBJECT_LEAD",
      "objectDefinitionExternalReferenceCode2": "ERC_OBJECT_DEAL",
      "type": "oneToMany"
    },
    {
      "deletionType": "prevent",
      "label": { "en_US": "Course Deals (CHOOSES)", "vi_VN": "Course Deals (CHOOSES)" },
      "name": "courseDeals",
      "objectDefinitionExternalReferenceCode1": "ERC_OBJECT_COURSE",
      "objectDefinitionExternalReferenceCode2": "ERC_OBJECT_DEAL",
      "type": "oneToMany"
    },
    {
      "deletionType": "cascade",
      "label": { "en_US": "Deal Assignments (ASSIGNED)", "vi_VN": "Deal Assignments (ASSIGNED)" },
      "name": "dealAssignments",
      "objectDefinitionExternalReferenceCode1": "ERC_OBJECT_DEAL",
      "objectDefinitionExternalReferenceCode2": "ERC_OBJECT_ASSIGN",
      "type": "oneToMany"
    },
    {
      "deletionType": "prevent",
      "label": { "en_US": "Sale Assignments (RECEIVES)", "vi_VN": "Sale Assignments (RECEIVES)" },
      "name": "saleAssignments",
      "objectDefinitionExternalReferenceCode1": "ERC_OBJECT_SALESTAFF",
      "objectDefinitionExternalReferenceCode2": "ERC_OBJECT_ASSIGN",
      "type": "oneToMany"
    },
    {
      "deletionType": "cascade",
      "label": { "en_US": "Deal Logs (HAS_LOG)", "vi_VN": "Deal Logs (HAS_LOG)" },
      "name": "dealSaleLogs",
      "objectDefinitionExternalReferenceCode1": "ERC_OBJECT_DEAL",
      "objectDefinitionExternalReferenceCode2": "ERC_OBJECT_SALELOG",
      "type": "oneToMany"
    },
    {
      "deletionType": "prevent",
      "label": { "en_US": "Sale Made Logs (MAKES)", "vi_VN": "Sale Made Logs (MAKES)" },
      "name": "saleMadeLogs",
      "objectDefinitionExternalReferenceCode1": "ERC_OBJECT_SALESTAFF",
      "objectDefinitionExternalReferenceCode2": "ERC_OBJECT_SALELOG",
      "type": "oneToMany"
    }
  ]
}
```

---

### 5. File: `scripts/deploy-crm-objects.ps1`
```powershell
# Script tu dong trien khai cac Liferay Objects tu file JSON vao Liferay thong qua REST API
param (
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Username = "test@liferay.com",
    [string]$Password = "test"
)

$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:${Password}"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Accept"        = "application/json"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$batchDir = Join-Path $projectRoot "client-extensions\crm-objects-batch\batch"

Write-Host "=== BAT DAU TRIEN KHAI LIFERAY OBJECTS THEO CDM VAO THU MUC RIENG ===" -ForegroundColor Cyan

# 0. Xu ly Object Folder
$folderFile = Join-Path $batchDir "01-00-folder-definition.batch-engine-data.json"
$folderIdMap = @{}

if (Test-Path $folderFile) {
    $folderJson = Get-Content $folderFile -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($f in $folderJson.items) {
        Write-Host "-> Kiem tra Thu muc: $($f.name) ($($f.externalReferenceCode))..." -NoNewline
        $checkFolderUri = "$BaseUrl/o/object-admin/v1.0/object-folders/by-external-reference-code/$($f.externalReferenceCode)"
        $existingFolder = $null
        try {
            $existingFolder = Invoke-RestMethod -Uri $checkFolderUri -Headers $headers -Method Get -ErrorAction SilentlyContinue
        } catch {}

        if ($existingFolder -and $existingFolder.id) {
            $folderIdMap[$f.externalReferenceCode] = $existingFolder.id
            Write-Host " [DA TON TAI (ID: $($existingFolder.id))]" -ForegroundColor Yellow
        } else {
            $folderBody = @{
                "name" = $f.name
                "label" = $f.label
                "externalReferenceCode" = $f.externalReferenceCode
            } | ConvertTo-Json -Depth 5

            try {
                $postFolderParams = @{
                    Uri         = "$BaseUrl/o/object-admin/v1.0/object-folders"
                    Headers     = $headers
                    ContentType = "application/json; charset=utf-8"
                    Method      = "Post"
                    Body        = [System.Text.Encoding]::UTF8.GetBytes($folderBody)
                    ErrorAction = "Stop"
                }
                $createdFolder = Invoke-RestMethod @postFolderParams
                $folderIdMap[$f.externalReferenceCode] = $createdFolder.id
                Write-Host " [TAO THU MUC THANH CONG (ID: $($createdFolder.id))]" -ForegroundColor Green
            } catch {
                Write-Host " [LOI TAO THU MUC: $($_.Exception.Message)]" -ForegroundColor Red
            }
        }
    }
}

# 1. Doc va tao cac Object Definitions
$objFile = Join-Path $batchDir "01-01-object-definition.batch-engine-data.json"
$objIdMap = @{}

if (Test-Path $objFile) {
    $objJson = Get-Content $objFile -Raw -Encoding UTF8 | ConvertFrom-Json

    foreach ($item in $objJson.items) {
        Write-Host "-> Dang xu ly Object: $($item.name) ($($item.externalReferenceCode))..." -NoNewline
        
        $checkUri = "$BaseUrl/o/object-admin/v1.0/object-definitions/by-external-reference-code/$($item.externalReferenceCode)"
        $existing = $null
        try {
            $existing = Invoke-RestMethod -Uri $checkUri -Headers $headers -Method Get -ErrorAction SilentlyContinue
        } catch {}

        $targetId = $null
        if ($existing -and $existing.id) {
            $targetId = $existing.id
            $objIdMap[$item.externalReferenceCode] = $targetId
            Write-Host " [DA TON TAI (ID: $targetId)]" -ForegroundColor Yellow
        } else {
            $bodyObj = @{
                "externalReferenceCode" = $item.externalReferenceCode
                "name" = $item.name
                "label" = $item.label
                "pluralLabel" = $item.pluralLabel
                "scope" = $item.scope
                "titleObjectFieldName" = $item.titleObjectFieldName
                "objectFolderExternalReferenceCode" = $item.objectFolderExternalReferenceCode
                "objectFields" = $item.objectFields
            }
            $bodyJson = $bodyObj | ConvertTo-Json -Depth 10

            try {
                $postParams = @{
                    Uri         = "$BaseUrl/o/object-admin/v1.0/object-definitions"
                    Headers     = $headers
                    ContentType = "application/json; charset=utf-8"
                    Method      = "Post"
                    Body        = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)
                    ErrorAction = "Stop"
                }
                $created = Invoke-RestMethod @postParams
                $targetId = $created.id
                $objIdMap[$item.externalReferenceCode] = $targetId
                Write-Host " [TAO THANH CONG (ID: $targetId)]" -ForegroundColor Green
            } catch {
                Write-Host " [LOI TAO OBJECT: $($_.Exception.Message)]" -ForegroundColor Red
            }
        }

        # Xuat ban (Publish) neu Object dang o trang thai Draft
        if ($targetId) {
            try {
                $statusCheck = Invoke-RestMethod -Uri "$BaseUrl/o/object-admin/v1.0/object-definitions/$targetId" -Headers $headers -Method Get -ErrorAction SilentlyContinue
                if ($statusCheck -and $statusCheck.status.code -ne 0) {
                    Invoke-RestMethod -Uri "$BaseUrl/o/object-admin/v1.0/object-definitions/$targetId/publish" -Headers $headers -Method Post -ErrorAction Stop | Out-Null
                    Write-Host "   -> Da Publish $($item.name) thanh cong!" -ForegroundColor Green
                } else {
                    Write-Host "   -> $($item.name) da o trang thai Approved (Da Publish)" -ForegroundColor Gray
                }
            } catch {
                Write-Host "   -> Khong can publish: $($_.Exception.Message)" -ForegroundColor Gray
            }
        }
    }
}

# 2. Doc va tao cac Relationships
$relFile = Join-Path $batchDir "02-00-relationship.batch-engine-data.json"
if (Test-Path $relFile) {
    $relJson = Get-Content $relFile -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host "`n=== DANG THIET LAP CAC MOI QUAN HE (RELATIONSHIPS) ===" -ForegroundColor Cyan

    foreach ($rel in $relJson.items) {
        $parentErc = $rel.objectDefinitionExternalReferenceCode1
        $childErc = $rel.objectDefinitionExternalReferenceCode2
        $parentId = $objIdMap[$parentErc]
        $childId = $objIdMap[$childErc]

        if ($parentId -and $childId) {
            Write-Host "-> Tao lien ket: $($rel.name) [$parentErc -> $childErc]..." -NoNewline
            
            $relBodyObj = @{
                "name" = $rel.name
                "label" = $rel.label
                "type" = $rel.type
                "deletionType" = $rel.deletionType
                "objectDefinitionId2" = $childId
            }
            $relJsonStr = $relBodyObj | ConvertTo-Json -Depth 5

            try {
                $relParams = @{
                    Uri         = "$BaseUrl/o/object-admin/v1.0/object-definitions/$parentId/object-relationships"
                    Headers     = $headers
                    ContentType = "application/json; charset=utf-8"
                    Method      = "Post"
                    Body        = [System.Text.Encoding]::UTF8.GetBytes($relJsonStr)
                    ErrorAction = "Stop"
                }
                $createdRel = Invoke-RestMethod @relParams
                Write-Host " [THANH CONG]" -ForegroundColor Green
            } catch {
                Write-Host " [BO QUA / DA TON TAI]" -ForegroundColor Yellow
            }
        } else {
            Write-Host "-> Bo qua lien ket $($rel.name): Khong tim thay Object cha hoac con." -ForegroundColor Red
        }
    }
}

Write-Host "`n=== HOAN TAT TRIEN KHAI TOAN BO CDM OBJECTS VAO THU MUC RIENG ===" -ForegroundColor Green
```

---

### 6. File: `scripts/backup-crm-objects.ps1`
```powershell
# Script sao luu (Backup) toan bo Object Definitions tu Liferay ve thu muc local
param (
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Username = "test@liferay.com",
    [string]$Password = "test",
    [string]$OutputDir = ""
)

$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:${Password}"))
$headers = @{
    "Authorization" = "Basic $auth"
    "Accept"        = "application/json"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($OutputDir)) {
    $OutputDir = Join-Path $scriptDir "..\backups\objects"
}

if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Write-Host "=== BAT DAU BACKUP LIFERAY OBJECTS ===" -ForegroundColor Cyan
Write-Host "Thu muc luu tru: $OutputDir"

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/o/object-admin/v1.0/object-definitions?pageSize=-1" -Headers $headers -Method Get -ErrorAction Stop
    $count = 0
    foreach ($obj in $response.items) {
        if ($obj.system -eq $false) {
            $fileName = Join-Path $OutputDir "$($obj.name).json"
            $obj | ConvertTo-Json -Depth 15 | Set-Content -Path $fileName -Encoding UTF8
            Write-Host "-> Da backup Object: $($obj.name) -> $fileName" -ForegroundColor Green
            $count++
        }
    }
    Write-Host "=== HOAN THANH BACKUP ($count Objects) ===" -ForegroundColor Cyan
} catch {
    Write-Host "Loi khi backup: $_" -ForegroundColor Red
}
```
