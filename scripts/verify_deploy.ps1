$cli = 'C:\Users\adtne\.coze\runtimes\desktop-runtime\current\bin\coze-dev.cmd'
Write-Output '=== ONLINE ==='
& $cli deploy --format json online --app-id 7688672460220334134 2>$null | Out-String | Write-Output
Write-Output '=== SHOW ==='
& $cli deploy --format json app show --app-id 7688672460220334134 2>$null | Out-String | Write-Output
Write-Output '=== DOMAIN ==='
& $cli deploy --format json domain list --app-id 7688672460220334134 --unit-type prod 2>$null | Out-String | Write-Output