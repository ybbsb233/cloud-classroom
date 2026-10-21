param([string]$MySqlPath='mysql',[string]$DbHost='127.0.0.1',[int]$DbPort=3306,[string]$DbUser='root')
$ErrorActionPreference='Stop'
$databasePassword=$env:DB_PASSWORD
if (-not $databasePassword) {
 $securePassword=Read-Host 'MySQL password' -AsSecureString
 $databasePassword=[System.Net.NetworkCredential]::new('', $securePassword).Password
}
$info=[System.Diagnostics.ProcessStartInfo]::new()
$info.FileName=(Get-Command $MySqlPath).Source
$info.Arguments="--host=$DbHost --port=$DbPort --user=$DbUser --default-character-set=utf8mb4 --batch --skip-reconnect"
$info.UseShellExecute=$false
$info.CreateNoWindow=$true
$info.RedirectStandardInput=$true
$info.RedirectStandardOutput=$true
$info.RedirectStandardError=$true
$info.StandardInputEncoding=[System.Text.UTF8Encoding]::new($false)
$info.EnvironmentVariables['MYSQL_PWD']=$databasePassword
$process=[System.Diagnostics.Process]::new()
$process.StartInfo=$info
try {
 [void]$process.Start()
 $output=$process.StandardOutput.ReadToEndAsync()
 $errors=$process.StandardError.ReadToEndAsync()
 $path=Join-Path (Split-Path $PSScriptRoot -Parent) 'sql/legacy/09_course_schedule.sql'
 $process.StandardInput.Write([System.IO.File]::ReadAllText($path,[System.Text.Encoding]::UTF8))
 $process.StandardInput.Close()
 $process.WaitForExit()
 $text=$output.GetAwaiter().GetResult()
 $errorText=$errors.GetAwaiter().GetResult()
 if($process.ExitCode -ne 0){throw "Schedule migration failed: $errorText"}
 Write-Output 'Weekly schedule ready. Existing course times and learning records were preserved.'
} finally {$process.Dispose();$databasePassword=$null}
