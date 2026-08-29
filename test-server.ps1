try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 3
    Write-Output "Status: $($r.StatusCode), Length: $($r.Content.Length)"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
