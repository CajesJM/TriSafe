param(
  [string]$ApiUrl = 'http://localhost:3000/api'
)

$ErrorActionPreference = 'Stop'

function Invoke-Login([string]$Email, [string]$Password, [string]$ExpectedRole) {
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json
  $session = Invoke-RestMethod -Uri "$ApiUrl/auth/login" -Method Post -ContentType 'application/json' -Body $body
  if ($session.user.role -ne $ExpectedRole) {
    throw "Expected role $ExpectedRole but received $($session.user.role)."
  }
  return $session
}

function Get-AuthHeaders($Session) {
  return @{ Authorization = "Bearer $($Session.accessToken)" }
}

$health = Invoke-RestMethod -Uri "$ApiUrl/health"
if ($health.status -ne 'ok') {
  throw 'The API health check did not return status ok.'
}
if ($health.database -ne 'ok') {
  throw 'The API health check did not confirm PostgreSQL connectivity.'
}

$admin = Invoke-Login 'admin@trisafe.local' 'admin12345' 'LGU_ADMIN'
$passenger = Invoke-Login 'passenger@trisafe.local' 'passenger123' 'PASSENGER'
$driver = Invoke-Login 'driver@trisafe.local' 'driver12345' 'DRIVER'

$dashboard = Invoke-RestMethod -Uri "$ApiUrl/admin/dashboard" -Headers (Get-AuthHeaders $admin)
$fareRules = Invoke-RestMethod -Uri "$ApiUrl/admin/fare-rules" -Headers (Get-AuthHeaders $admin)
$auditLogs = Invoke-RestMethod -Uri "$ApiUrl/admin/audit-logs?limit=50" -Headers (Get-AuthHeaders $admin)
$driverProfile = Invoke-RestMethod -Uri "$ApiUrl/drivers/me" -Headers (Get-AuthHeaders $driver)
$driverAnnouncements = Invoke-RestMethod -Uri "$ApiUrl/drivers/me/announcements" -Headers (Get-AuthHeaders $driver)

try {
  Invoke-RestMethod -Uri "$ApiUrl/admin/dashboard" -Headers (Get-AuthHeaders $passenger) | Out-Null
  throw 'Passenger access to the LGU dashboard was unexpectedly allowed.'
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 401) {
    throw
  }
}

[PSCustomObject]@{
  Health = $health.status
  AdminRole = $admin.user.role
  PassengerRole = $passenger.user.role
  DriverRole = $driver.user.role
  RegisteredDrivers = $dashboard.drivers
  FareRules = $fareRules.Count
  AuditLogs = $auditLogs.Count
  DriverProfile = $driverProfile.fullName
  DriverAnnouncements = $driverAnnouncements.Count
  PassengerAdminAccess = '401 rejected'
} | Format-List

Write-Host 'TriSafe API workflow verification passed.' -ForegroundColor Green
