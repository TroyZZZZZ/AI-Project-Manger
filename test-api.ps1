# Test login API
$loginBody = @{
    email = "user@example.com"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Testing login API..."
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    Write-Host "Login successful!"
    Write-Host ($loginResponse | ConvertTo-Json -Depth 3)
    
    # Get access token
    $accessToken = $loginResponse.data.accessToken
    Write-Host "Access Token: $accessToken"
    
    # Test create project API
    $projectBody = @{
        name = "Test Project"
        description = "This is a test project"
    } | ConvertTo-Json
    
    Write-Host ""
    Write-Host "Testing create project API..."
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    try {
        $projectResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/projects" -Method Post -Headers $headers -Body $projectBody
        Write-Host "Project creation successful!"
        Write-Host ($projectResponse | ConvertTo-Json -Depth 3)
    } catch {
        Write-Host "Project creation failed:"
        Write-Host $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body: $responseBody"
        }
    }
    
} catch {
    Write-Host "Login failed:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}
