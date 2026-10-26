$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$env:Path = "$env:ProgramFiles\nodejs;$env:Path"
$node = Join-Path $env:ProgramFiles 'nodejs\node.exe'
$npm = Join-Path $env:ProgramFiles 'nodejs\npm.cmd'

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
}

$securePassword = Read-Host 'Enter the PostgreSQL password for user postgres (input is hidden)' -AsSecureString
if ($securePassword.Length -eq 0) {
  throw 'A PostgreSQL password is required.'
}

$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  $securePassword.Dispose()
}

$env:PORTFOLIO_DB_PASSWORD = $password
$probe = 'const { Pool } = require("pg"); (async () => { const pool = new Pool({ host: "localhost", port: 5432, user: "postgres", password: process.env.PORTFOLIO_DB_PASSWORD, database: "portfolio" }); try { const result = await pool.query("SELECT current_database() AS db, current_user AS username"); console.log("Connected to PostgreSQL:", result.rows[0].username + "@" + result.rows[0].db); } catch (error) { console.error("PostgreSQL connection failed:", error.message); process.exitCode = 1; } finally { await pool.end(); } })();'
$probePath = Join-Path $PSScriptRoot (".portfolio-db-probe-" + [guid]::NewGuid().ToString('N') + '.cjs')
[IO.File]::WriteAllText($probePath, $probe, [Text.UTF8Encoding]::new($false))
try {
  & $node $probePath
  $probeExitCode = $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
}
$env:PORTFOLIO_DB_PASSWORD = ''
if ($probeExitCode -ne 0) {
  throw 'Could not connect. Check the PostgreSQL password, server, port, and that the portfolio database exists.'
}

$databaseUrl = "postgres://postgres:$([Uri]::EscapeDataString($password))@localhost:5432/portfolio"
$envFile = Join-Path $projectRoot '.env'
$envContents = [IO.File]::ReadAllText($envFile)
if ($envContents -match '(?m)^DATABASE_URL=') {
  $envContents = [regex]::Replace(
    $envContents,
    '(?m)^DATABASE_URL=.*$',
    [System.Text.RegularExpressions.MatchEvaluator]{ param($match) "DATABASE_URL=$databaseUrl" },
    1
  )
} else {
  $envContents = "DATABASE_URL=$databaseUrl`r`n$envContents"
}
[IO.File]::WriteAllText($envFile, $envContents, [Text.UTF8Encoding]::new($false))
$env:DATABASE_URL = $databaseUrl
$env:PORTFOLIO_DB_PASSWORD = ''
$password = ''

Write-Host 'Preparing database tables and sample content...'
& $npm run seed
if ($LASTEXITCODE -ne 0) {
  throw 'Database seeding failed; see the error above.'
}

Write-Host 'Starting the portfolio at http://localhost:3000'
& $npm start
