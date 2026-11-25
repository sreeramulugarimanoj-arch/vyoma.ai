# VYOMA Atmospheric Intelligence - Zero-Dependency Native PowerShell HTTP Server
param([switch]$NoBrowser, [int]$Port = 3000)
$rootPath = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  VYOMA ATMOSPHERIC INTELLIGENCE 2.0 LOCAL SERVER RUNNING" -ForegroundColor White
    Write-Host "  URL: $prefix" -ForegroundColor Yellow
    Write-Host "  Serving from: $rootPath" -ForegroundColor Gray
    Write-Host "  Press Ctrl+C to terminate server" -ForegroundColor DarkGray
    Write-Host "==========================================================" -ForegroundColor Cyan

    if (-not $NoBrowser) {
        Start-Process $prefix
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.Url.LocalPath
        if ($rawUrl -eq "/" -or $rawUrl -eq "") {
            $rawUrl = "/standalone.html"
        }

        $localFile = Join-Path $rootPath ($rawUrl.TrimStart('/'))

        if (Test-Path $localFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
            $mime = "application/octet-stream"
            switch ($ext) {
                ".html" { $mime = "text/html; charset=utf-8" }
                ".htm"  { $mime = "text/html; charset=utf-8" }
                ".css"  { $mime = "text/css; charset=utf-8" }
                ".js"   { $mime = "application/javascript; charset=utf-8" }
                ".jsx"  { $mime = "application/javascript; charset=utf-8" }
                ".json" { $mime = "application/json; charset=utf-8" }
                ".svg"  { $mime = "image/svg+xml" }
                ".png"  { $mime = "image/png" }
            }

            $bytes = [System.IO.File]::ReadAllBytes($localFile)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
