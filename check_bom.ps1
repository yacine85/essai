$filePath = 'c:\Users\yacin\essai\frontend\src\pages\Register.jsx'
$bytes = [System.IO.File]::ReadAllBytes($filePath)
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host 'BOM found - removing it'
    $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
    [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
    Write-Host 'BOM removed'
} else {
    Write-Host 'No BOM'
}
