# 测试项目列表API
Write-Host "Testing login API..."

# 登录获取token
$loginData = @{
    email = "user@example.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "Login successful!"
    $token = $loginResponse.data.accessToken
    Write-Host "Access Token: $token"
    
    # 测试获取项目列表
    Write-Host "`nTesting GET /api/projects..."
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $projectsResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/projects" -Method Get -Headers $headers
    Write-Host "Projects response:" ($projectsResponse | ConvertTo-Json -Depth 3)
    
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    }
}
