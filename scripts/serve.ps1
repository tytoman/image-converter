param([int]$Port = 4173, [switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\dist'))
if (!(Test-Path -LiteralPath (Join-Path $root 'index.html'))) { throw 'dist/index.html is missing. Build the app first.' }
$listener = $null
for ($attempt = 0; $attempt -lt 10; $attempt++) {
  $candidate = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, ($Port + $attempt))
  try {
    $candidate.Start()
    $listener = $candidate
    $Port += $attempt
    break
  } catch [Net.Sockets.SocketException] {
    $candidate.Stop()
    if ($_.Exception.SocketErrorCode -ne [Net.Sockets.SocketError]::AddressAlreadyInUse) { throw }
  }
}
if (!$listener) { throw 'No available local port. Close another app instance and try again.' }
$url = "http://127.0.0.1:$Port/"
Write-Host "Image Converter: $url   (Ctrl+C to stop)"
if ($OpenBrowser) { Start-Process $url }
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.wasm'='application/wasm'; '.svg'='image/svg+xml'; '.json'='application/json'; '.png'='image/png'; '.ico'='image/x-icon' }
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $stream = $client.GetStream()
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $line = $reader.ReadLine()
      $headers = 0
      while (($header = $reader.ReadLine()) -and $headers -lt 100) { $headers++ }
      $status = '200 OK'; $type = 'text/plain; charset=utf-8'; $data = [byte[]]@(); $head = $false
      if ($line -notmatch '^(GET|HEAD) ([^ ]+) HTTP/1\.[01]$') {
        $status = '405 Method Not Allowed'
      } else {
        $head = $Matches[1] -eq 'HEAD'
        $relative = [Uri]::UnescapeDataString(($Matches[2] -split '\?')[0]).TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        if (!$relative) { $relative = 'index.html' }
        $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
        if (!$path.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { $status = '403 Forbidden' }
        elseif (!(Test-Path -LiteralPath $path -PathType Leaf)) { $status = '404 Not Found' }
        else {
          $data = [IO.File]::ReadAllBytes($path)
          $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
          if ($mime.ContainsKey($ext)) { $type = $mime[$ext] } else { $type = 'application/octet-stream' }
        }
      }
      if ($status -ne '200 OK') { $data = [Text.Encoding]::UTF8.GetBytes($status) }
      $response = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($data.Length)`r`nConnection: close`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nReferrer-Policy: no-referrer`r`n`r`n"
      $bytes = [Text.Encoding]::ASCII.GetBytes($response)
      $stream.Write($bytes, 0, $bytes.Length)
      if (!$head) { $stream.Write($data, 0, $data.Length) }
      $stream.Flush()
      $reader.Dispose()
    } catch { Write-Verbose $_ } finally { $client.Dispose() }
  }
} finally { $listener.Stop() }
