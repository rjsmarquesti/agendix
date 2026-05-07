param()

$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Compose  = Join-Path $Root "docker-compose.yml"

function Step($n, $msg) { Write-Host "" ; Write-Host "[$n] $msg" -ForegroundColor Cyan }
function OK($msg)        { Write-Host "    OK  $msg" -ForegroundColor Green }
function Fail($msg)      { Write-Host "    ERR $msg" -ForegroundColor Red ; exit 1 }

# 1. .env
Step 1 "Configurando .env do backend..."
$envFile  = Join-Path $Backend ".env"
$envLocal = Join-Path $Backend ".env.local"
if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $envLocal)) { Fail ".env.local nao encontrado em $Backend" }
    Copy-Item $envLocal $envFile
    OK ".env criado a partir de .env.local"
} else {
    OK ".env ja existe - mantido"
}

# 2. PostgreSQL
Step 2 "Subindo PostgreSQL via Docker Compose..."
$pgRunning = docker ps --filter "name=agendix-postgres" --filter "status=running" -q 2>$null
if ($pgRunning) {
    OK "agendix-postgres ja esta rodando"
} else {
    docker compose -f $Compose up postgres -d
    if ($LASTEXITCODE -ne 0) { Fail "Falha ao subir o banco" }
    Write-Host "    Aguardando banco ficar pronto..." -ForegroundColor Yellow
    $ok = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep 2
        $health = docker inspect --format "{{.State.Health.Status}}" agendix-postgres 2>$null
        if ($health -eq "healthy") { $ok = $true ; break }
        Write-Host "    ... $health" -ForegroundColor DarkGray
    }
    if (-not $ok) { Fail "Banco nao ficou healthy a tempo" }
    OK "agendix-postgres healthy"
}

# 3. Migrations
Step 3 "Aplicando migrations Prisma..."
Push-Location $Backend
npx prisma migrate deploy 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
$exitCode = $LASTEXITCODE
Pop-Location
if ($exitCode -ne 0) { Fail "Migrations falharam" }
OK "Migrations aplicadas"

# 4. Seed
Step 4 "Rodando seed..."
Push-Location $Backend
node prisma/seed.js 2>&1 | Select-Object -Last 4 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
Pop-Location
OK "Seed concluido"

# 5. Backend
Step 5 "Iniciando backend na porta 3000..."
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    node server.js 2>&1
} -ArgumentList $Backend
Start-Sleep 3
OK "Backend iniciado (Job $($backendJob.Id))"

# 6. Frontend
Step 6 "Iniciando frontend na porta 5173..."
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev 2>&1
} -ArgumentList $Frontend
Start-Sleep 4
OK "Frontend iniciado (Job $($frontendJob.Id))"

# 7. Resumo
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Ambiente local pronto!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5173"
Write-Host "  Backend  : http://localhost:3000"
Write-Host ""
Write-Host "  Login admin demo:"
Write-Host "    Email : admin@crm.com"
Write-Host "    Senha : admin123"
Write-Host ""
Write-Host "  Testar MP: Configuracoes > aba Plano > Assinar"
Write-Host "    Cartao : 5031 4332 1540 6351"
Write-Host "    Venc   : 11/25   CVV: 123   CPF: 12345678909"
Write-Host ""
Write-Host "  Para parar: Stop-Job $($backendJob.Id),$($frontendJob.Id)"
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Logs em tempo real (Ctrl+C para sair):" -ForegroundColor DarkGray

while ($true) {
    Receive-Job $backendJob  | ForEach-Object { Write-Host "[backend]  $_" -ForegroundColor DarkGray }
    Receive-Job $frontendJob | ForEach-Object { Write-Host "[frontend] $_" -ForegroundColor DarkGray }
    Start-Sleep 1
}
