# Run from D:\dev\body-health-app so node and npm are found
$env:PATH = "$PSScriptRoot;$env:PATH"
Set-Location $PSScriptRoot
& $PSScriptRoot\node.exe $PSScriptRoot\node_modules\vite\bin\vite.js
