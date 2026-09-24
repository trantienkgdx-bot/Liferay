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
