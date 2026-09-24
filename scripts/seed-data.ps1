# Script nap du lieu mau (Courses & SaleStaff) vao Liferay
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

Write-Host "=== DANG NAP DU LIEU MAU CHO HE THONG CRM ===" -ForegroundColor Cyan

# 1. Nap 3 Khoa hoc
$courses = @(
    @{
        "courseId" = "ENG-IELTS"
        "courseName" = "Khóa Luyện Thi IELTS 6.5+"
        "courseTuitionFee" = 12000000
        "courseDepositFee" = 2000000
    },
    @{
        "courseId" = "ENG-COMM"
        "courseName" = "Tiếng Anh Giao Tiếp Thực Chiến"
        "courseTuitionFee" = 7500000
        "courseDepositFee" = 1000000
    },
    @{
        "courseId" = "IT-FULLSTACK"
        "courseName" = "Lập Trình Web Full-Stack"
        "courseTuitionFee" = 15000000
        "courseDepositFee" = 3000000
    }
)

foreach ($c in $courses) {
    Write-Host "-> Nap Khoa hoc: $($c.courseName)..." -NoNewline
    $json = $c | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$BaseUrl/o/c/courses" -Headers $headers -ContentType "application/json; charset=utf-8" -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) -ErrorAction Stop
        Write-Host " [THANH CONG (ID: $($r.id))]" -ForegroundColor Green
    } catch {
        Write-Host " [DA TON TAI HOAC LOI: $($_.Exception.Message)]" -ForegroundColor Yellow
    }
}

# 2. Nap 2 Nhan vien Sale dang truc
$staffs = @(
    @{
        "saleId" = "SALE-01"
        "saleName" = "Nguyễn Văn Tuấn"
        "salePhone" = "0901234567"
        "saleEmail" = "tuan.nv@mekocrm.vn"
        "saleIsDuty" = $true
        "saleLastAssignedTime" = "2026-09-24T00:00:00Z"
    },
    @{
        "saleId" = "SALE-02"
        "saleName" = "Trần Thị Mai"
        "salePhone" = "0909876543"
        "saleEmail" = "mai.tt@mekocrm.vn"
        "saleIsDuty" = $true
        "saleLastAssignedTime" = "2026-09-23T00:00:00Z"
    }
)

foreach ($s in $staffs) {
    Write-Host "-> Nap Nhan vien Sale: $($s.saleName)..." -NoNewline
    $json = $s | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$BaseUrl/o/c/salestaffs" -Headers $headers -ContentType "application/json; charset=utf-8" -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) -ErrorAction Stop
        Write-Host " [THANH CONG (ID: $($r.id))]" -ForegroundColor Green
    } catch {
        Write-Host " [DA TON TAI HOAC LOI: $($_.Exception.Message)]" -ForegroundColor Yellow
    }
}

Write-Host "=== HOAN TAT NAP DU LIEU MAU ===" -ForegroundColor Green
