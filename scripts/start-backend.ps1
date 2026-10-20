param([int]$Port = 18090)
$ErrorActionPreference = 'Stop'
$backendRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend'
if (-not $env:DB_PASSWORD) {
    $securePassword = Read-Host 'MySQL password' -AsSecureString
    $env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
}
if (-not $env:JWT_SECRET) {
    $randomBytes = New-Object byte[] 48
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $generator.GetBytes($randomBytes)
    $generator.Dispose()
    $env:JWT_SECRET = [Convert]::ToBase64String($randomBytes)
}
if (-not $env:ADMIN_INITIAL_PASSWORD) {
    $secureAdmin = Read-Host 'Initial teacher password (only used when teacher accounts do not exist)' -AsSecureString
    $env:ADMIN_INITIAL_PASSWORD = [System.Net.NetworkCredential]::new('', $secureAdmin).Password
}
$env:SERVER_PORT = "$Port"
$jarPath = Join-Path $backendRoot 'target/classroom-learning-1.0.0.jar'
if (-not (Test-Path -LiteralPath $jarPath)) { throw 'Build backend first: cd backend; mvn package' }
Push-Location $backendRoot
try { & java '-Duser.timezone=Asia/Shanghai' -jar $jarPath }
finally { Pop-Location }
