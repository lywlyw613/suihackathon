# PowerShell 腳本：自動添加 Vercel 環境變數
# Script to automatically add Vercel environment variables

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vercel 環境變數自動添加工具" -ForegroundColor Cyan
Write-Host "Vercel Environment Variables Auto-Add Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 env-values.txt 是否存在
if (-not (Test-Path "env-values.txt")) {
    Write-Host "錯誤：找不到 env-values.txt 文件" -ForegroundColor Red
    Write-Host "Error: env-values.txt file not found" -ForegroundColor Red
    Write-Host "請先填寫 env-values.txt 文件中的值" -ForegroundColor Yellow
    Write-Host "Please fill in the values in env-values.txt first" -ForegroundColor Yellow
    exit 1
}

# 讀取環境變數文件
$envVars = @{}
$lines = Get-Content "env-values.txt"

foreach ($line in $lines) {
    # 跳過註釋和空行
    if ($line -match "^\s*#" -or $line -match "^\s*$") {
        continue
    }
    
    # 解析 變數名稱=值
    if ($line -match "^([^=]+)=(.*)$") {
        $varName = $matches[1].Trim()
        $varValue = $matches[2].Trim()
        
        # 如果值為空，跳過
        if ([string]::IsNullOrWhiteSpace($varValue)) {
            Write-Host "跳過 $varName（值為空）/ Skipping $varName (empty value)" -ForegroundColor Yellow
            continue
        }
        
        $envVars[$varName] = $varValue
    }
}

if ($envVars.Count -eq 0) {
    Write-Host "錯誤：沒有找到有效的環境變數" -ForegroundColor Red
    Write-Host "Error: No valid environment variables found" -ForegroundColor Red
    exit 1
}

Write-Host "找到 $($envVars.Count) 個環境變數 / Found $($envVars.Count) environment variables" -ForegroundColor Green
Write-Host ""

# 確認
Write-Host "即將添加以下環境變數：" -ForegroundColor Yellow
Write-Host "About to add the following environment variables:" -ForegroundColor Yellow
foreach ($varName in $envVars.Keys) {
    $value = $envVars[$varName]
    # 隱藏敏感值（只顯示前幾個字符）
    if ($value.Length -gt 10) {
        $displayValue = $value.Substring(0, 10) + "..."
    } else {
        $displayValue = $value
    }
    Write-Host "  - $varName = $displayValue" -ForegroundColor Gray
}
Write-Host ""

$confirm = Read-Host "確認添加？(Y/N) / Confirm? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "已取消 / Cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "開始添加環境變數..." -ForegroundColor Cyan
Write-Host "Starting to add environment variables..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($varName in $envVars.Keys) {
    $varValue = $envVars[$varName]
    
    Write-Host "添加 $varName..." -ForegroundColor Yellow
    Write-Host "Adding $varName..." -ForegroundColor Yellow
    
    # 使用 --value 參數非交互式添加
    # 為每個環境添加（production, preview, development）
    $environments = @("production", "preview", "development")
    $envSuccess = 0
    
    foreach ($env in $environments) {
        try {
            # 使用管道從 stdin 提供值（非交互式）
            $varValue | vercel env add $varName $env 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ $varName ($env) 添加成功" -ForegroundColor Green
                $envSuccess++
            } else {
                Write-Host "  ✗ $varName ($env) 添加失敗" -ForegroundColor Red
            }
        } catch {
            Write-Host "  ✗ $varName ($env) 添加失敗：$_" -ForegroundColor Red
        }
    }
    
    if ($envSuccess -eq 3) {
        Write-Host "✓ $varName 全部環境添加成功 / All environments added successfully" -ForegroundColor Green
        $successCount++
    } elseif ($envSuccess -gt 0) {
        Write-Host "⚠ $varName 部分環境添加成功 ($envSuccess/3) / Partially added" -ForegroundColor Yellow
        $successCount++
    } else {
        Write-Host "✗ $varName 添加失敗 / Failed" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "完成！/ Done!" -ForegroundColor Cyan
Write-Host "成功：$successCount 個 / Success: $successCount" -ForegroundColor Green
Write-Host "失敗：$failCount 個 / Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan

