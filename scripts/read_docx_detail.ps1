Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('C:\Users\trant\OneDrive\Máy tính\ChucNang_PhanHe_QL_PheuTuyenSinh.docx')
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = [xml]$reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
$nodes = $xml.SelectNodes('//*[local-name()="p"]')
foreach ($p in $nodes) {
    $t = $p.InnerText
    if ($t -match '1\.1|1\.2|1\.3|1\.4|1\.5|VietQR|cọc|hủy|thông báo') {
        Write-Output ">>> $t"
    }
}
