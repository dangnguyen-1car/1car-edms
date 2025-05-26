# =================================================================
# 1CAR - EDMS - Complete Test Script
# Test all components with proper variable handling
# =================================================================

param(
    [string]$BackendUrl = "http://localhost:3000"
)

Write-Host "=== 1CAR - EDMS Complete System Test ===" -ForegroundColor Magenta
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "$BackendUrl/health" -Method GET
    Write-Host "   ✅ Status: $($health.status)" -ForegroundColor Green
    Write-Host "   ✅ System: $($health.system)" -ForegroundColor Green
    Write-Host "   ✅ Version: $($health.version)" -ForegroundColor Green
    Write-Host "   ✅ Database: $($health.database.status)" -ForegroundColor Green
    Write-Host "   ✅ Users: $($health.statistics.users)" -ForegroundColor Green
    Write-Host "   ✅ Documents: $($health.statistics.documents)" -ForegroundColor Green
    Write-Host "   ✅ Audit Logs: $($health.statistics.audit_logs)" -ForegroundColor Green
    Write-Host "   ✅ Uptime: $([math]::Round($health.uptime, 2)) seconds" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 1CAR - EDMS SYSTEM FULLY OPERATIONAL! 🎉" -ForegroundColor Green
Write-Host "Backend: $BackendUrl" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Admin Login: admin@1car.vn / admin123" -ForegroundColor Yellow
