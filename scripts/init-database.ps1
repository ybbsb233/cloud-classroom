param(
    [string]$MySqlPath = 'mysql',
    [string]$DbHost = '127.0.0.1',
    [ValidateRange(1, 65535)][int]$DbPort = 3306,
    [string]$DbUser = 'root',
    [switch]$WithHistory
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$mysql = (Get-Command $MySqlPath -ErrorAction Stop).Source
$files = if ($WithHistory) { @('00_full_database.sql', '07_teachers_enrollment.sql', '08_teaching_classes.sql', '09_course_schedule.sql', '10_attendance.sql') } else { @('01_schema.sql', '02_demo_data.sql', '03_optional_password_change.sql', '04_expand_question_bank.sql', '06_chapter_bank.sql', '07_teachers_enrollment.sql', '08_teaching_classes.sql', '09_course_schedule.sql', '10_attendance.sql') }
foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "sql/$file"))) { throw "Missing SQL file: $file" }
}
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
    $exists = Invoke-ProjectSql "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='classroom_learning';"
    if ($exists -ne '0') { throw 'Database classroom_learning already exists. Initialization stopped to preserve its data.' }
    foreach ($file in $files) {
        Write-Host "Importing $file ..."
        $sql = [System.IO.File]::ReadAllText((Join-Path $projectRoot "sql/$file"), [System.Text.Encoding]::UTF8)
        Invoke-ProjectSql $sql | Out-Null
    }
    $counts = Invoke-ProjectSql 'SELECT COUNT(DISTINCT c.id), COUNT(DISTINCT ch.id), COUNT(DISTINCT q.id) FROM classroom_learning.course c JOIN classroom_learning.chapter ch ON ch.course_id=c.id AND ch.is_current=1 JOIN classroom_learning.question q ON q.chapter_id=ch.id;'
    if ($counts -ne "5`t25`t500") { throw "Unexpected course/chapter/question counts: $counts" }
    Write-Host 'Database initialized: classroom_learning; 5 courses, 25 current chapters, 500 current questions.'
    if ($WithHistory) { Write-Host 'Original demonstration accounts and learning history were imported into the independent database.' }
    Write-Host 'Next: run scripts/start-site.ps1 to start the backend and Nginx.'
} catch {
    Write-Warning 'Initialization stopped. If importing had started, completed DDL may remain; do not blindly rerun or delete an existing database.'
    throw
} finally { $databasePassword = $null }
