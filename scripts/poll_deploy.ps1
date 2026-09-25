$cli = 'C:\Users\adtne\.coze\runtimes\desktop-runtime\current\bin\coze-dev.cmd'
for ($i = 0; $i -lt 120; $i++) {
  $out = & $cli deploy --format json status --app-id 7688672460220334134 --deploy-id 7688687122915541011 2>$null
  $json = ($out | Out-String) | ConvertFrom-Json
  $st = $json.status
  Write-Output ("poll#" + $i + " status=" + $st)
  if ($st -eq 'Succeeded' -or $st -eq 'Failed' -or $st -eq 'Canceled') {
    Write-Output ($out | Out-String)
    break
  }
  Start-Sleep -Seconds 15
}