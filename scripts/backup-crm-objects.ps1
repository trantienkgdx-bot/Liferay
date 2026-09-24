# Script sao lưu (Backup) toàn bộ Object Definitions từ Liferay về thư mục local
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

Write-Host "=== BẮT ĐẦU BACKUP LIFERAY OBJECTS ===" -ForegroundColor Cyan
Write-Host "Thư mục lưu trữ: $OutputDir"

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/o/object-admin/v1.0/object-definitions?pageSize=-1" -Headers $headers -Method Get -ErrorAction Stop
    $count = 0
    foreach ($obj in $response.items) {
        # Chỉ backup các Object tùy biến (bỏ qua System Objects)
        if ($obj.system -eq $false) {
            $fileName = Join-Path $OutputDir "$($obj.name).json"
            $obj | ConvertTo-Json -Depth 15 | Set-Content -Path $fileName -Encoding UTF8
            Write-Host "-> Đã backup Object: $($obj.name) -> $fileName" -ForegroundColor Green
            $count++
        }
    }
    Write-Host "=== HOÀN THÀNH BACKUP ($count Objects) ===" -ForegroundColor Cyan
} catch {
    Write-Host "Lỗi khi backup: $_" -ForegroundColor Red
}
