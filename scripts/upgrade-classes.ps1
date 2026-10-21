param(
    [string]$MySqlPath = 'mysql',
    [string]$DbHost = '127.0.0.1',
    [ValidateRange(1, 65535)][int]$DbPort = 3306,
    [string]$DbUser = 'root'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$mysql = (Get-Command $MySqlPath -ErrorAction Stop).Source
$databasePassword = $env:DB_PASSWORD
if (-not $databasePassword) {
    $securePassword = Read-Host 'MySQL password' -AsSecureString
    $databasePassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
}
function Invoke-ProjectSql([string]$Sql) {
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $mysql
    # Keep paths and credentials out of shell command text; SQL is sent as UTF-8 stdin.
    $info.Arguments = "--host=$DbHost --port=$DbPort --user=$DbUser --default-character-set=utf8mb4 --batch --skip-column-names --skip-reconnect"
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardInputEncoding = New-Object System.Text.UTF8Encoding($false)
    $info.EnvironmentVariables['MYSQL_PWD'] = $databasePassword
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $outputTask = $process.StandardOutput.ReadToEndAsync()
        $errorTask = $process.StandardError.ReadToEndAsync()
        $process.StandardInput.Write($Sql)
        $process.StandardInput.Close()
        $process.WaitForExit()
        $output = $outputTask.GetAwaiter().GetResult()
        $errorText = $errorTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw "MySQL failed: $errorText" }
        return $output.Trim()
    } finally { $process.Dispose() }
}
try {
    $exists = Invoke-ProjectSql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='classroom_learning' AND table_name='teaching_class';"
    if ($exists -ne '0') {
        $members = Invoke-ProjectSql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='classroom_learning' AND table_name='class_member';"
        if ($members -ne '1') { throw 'Partial migration detected. Check backup and repair before proceeding.' }
        Write-Host 'Already upgraded; no classes or rosters were changed.'; return
    }
    $prerequisite = Invoke-ProjectSql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='classroom_learning' AND table_name='course_enrollment';"
    if ($prerequisite -ne '1') { throw 'Run upgrade-teachers.ps1 first.' }
    $partial = Invoke-ProjectSql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='classroom_learning' AND table_name='class_member';"
    if ($partial -ne '0') { throw 'Partial migration detected. Review the database and backup before proceeding.' }
    $backupRoot = Join-Path $projectRoot '.local/backups'
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    $dumpPath = Join-Path (Split-Path $mysql -Parent) 'mysqldump.exe'
    if (-not (Test-Path -LiteralPath $dumpPath)) { $dumpPath = (Get-Command mysqldump -ErrorAction Stop).Source }
    $info = [System.Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $dumpPath
    $info.Arguments = "--host=$DbHost --port=$DbPort --user=$DbUser --single-transaction --set-gtid-purged=OFF --default-character-set=utf8mb4 classroom_learning"
    $info.UseShellExecute = $false; $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $info.EnvironmentVariables['MYSQL_PWD'] = $databasePassword
    $process = [System.Diagnostics.Process]::new(); $process.StartInfo = $info
    try {
        [void]$process.Start()
        $outTask = $process.StandardOutput.ReadToEndAsync(); $errTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $dump = $outTask.GetAwaiter().GetResult(); $errText = $errTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw "Backup failed: $errText" }
        $backupPath = Join-Path $backupRoot ("before-classes-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sql')
        [System.IO.File]::WriteAllText($backupPath, $dump, [System.Text.UTF8Encoding]::new($false))
    } finally { $process.Dispose() }
    Invoke-ProjectSql ([System.IO.File]::ReadAllText((Join-Path $projectRoot 'sql/legacy/08_teaching_classes.sql'), [System.Text.Encoding]::UTF8)) | Out-Null
    Write-Host 'Teaching class migration completed. Restart this project after building the latest backend.'
    Write-Host "Backup: $backupPath"
} finally { $databasePassword = $null }
