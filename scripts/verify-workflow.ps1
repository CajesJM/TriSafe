param(
  [string]$ApiUrl = 'http://localhost:3000/api'
)

$ErrorActionPreference = 'Stop'

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Session,
    [object]$Body
  )

  $request = @{
    Uri = "$ApiUrl$Path"
    Method = $Method
    UseBasicParsing = $true
  }

  if ($null -ne $Session) {
    $request.Headers = @{ Authorization = "Bearer $($Session.accessToken)" }
  }

  if ($null -ne $Body) {
    $request.ContentType = 'application/json'
    $request.Body = ($Body | ConvertTo-Json -Depth 10)
  }

  try {
    return Invoke-RestMethod @request
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    $detail = $_.ErrorDetails.Message
    throw "API request $Method $Path failed with HTTP ${status}: $detail"
  }
}

function Login([string]$Email, [string]$Password, [string]$ExpectedRole) {
  $session = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email = $Email; password = $Password }
  if ($session.user.role -ne $ExpectedRole) {
    throw "Expected $ExpectedRole but received $($session.user.role)."
  }
  return $session
}

$health = Invoke-Api -Method 'GET' -Path '/health'
if ($health.status -ne 'ok') {
  throw 'The API health check did not return status ok.'
}

$admin = Login 'admin@trisafe.local' 'admin12345' 'LGU_ADMIN'
$passenger = Login 'passenger@trisafe.local' 'passenger123' 'PASSENGER'

$drivers = Invoke-Api -Method 'GET' -Path '/admin/drivers' -Session $admin
$driver = $drivers | Where-Object { @($_.vehicles).Count -gt 0 } | Select-Object -First 1
if ($null -eq $driver) {
  throw 'No registered driver with a vehicle was found.'
}

$vehicle = @($driver.vehicles) | Select-Object -First 1
$qrToken = $vehicle.qrCode.token
$verified = Invoke-Api -Method 'GET' -Path "/vehicles/verify/$qrToken"
if (-not $verified.verified -or $verified.vehicleId -ne $vehicle.id) {
  throw 'The LGU-generated QR code did not verify the registered vehicle.'
}

$fareRules = Invoke-Api -Method 'GET' -Path '/admin/fare-rules' -Session $admin
$rule = $fareRules | Where-Object { $_.active } | Select-Object -First 1
if ($null -eq $rule) {
  throw 'No active LGU fare rule was found.'
}

$rideRequest = @{
  vehicleId = $verified.vehicleId
  fromLocationId = [string]$rule.fromLocationId
  toLocationId = [string]$rule.toLocationId
  passengerCount = 1
}

$preview = Invoke-Api -Method 'POST' -Path '/rides/preview' -Session $passenger -Body $rideRequest
if ($preview.vehicleId -ne $verified.vehicleId -or [double]$preview.amount -le 0) {
  throw 'The official fare preview did not return a valid amount for the verified vehicle.'
}

$activeRides = @(Invoke-Api -Method 'GET' -Path '/rides' -Session $passenger | Where-Object { $_.status -eq 'ACTIVE' })
if ($activeRides.Count -gt 0) {
  throw 'The demo passenger already has an active ride. Complete it in the mobile app before running this acceptance check.'
}

$ride = Invoke-Api -Method 'POST' -Path '/rides' -Session $passenger -Body $rideRequest
$shareLocation = [Uri]::EscapeDataString('https://maps.google.com/?q=10.399,123.077')
$share = Invoke-Api -Method 'GET' -Path "/rides/$($ride.id)/share?liveLocationUrl=$shareLocation" -Session $passenger
if ($share.rideId -ne $ride.id -or [string]::IsNullOrWhiteSpace($share.liveLocationUrl)) {
  throw 'SafeShare did not return the ride details and live-location URL.'
}

$draft = Invoke-Api -Method 'POST' -Path '/incidents/draft' -Session $passenger -Body @{
  rideId = $ride.id
  rawDescription = 'The driver used unsafe speed near the public market during this ride.'
}
if ([string]::IsNullOrWhiteSpace($draft.aiDraft) -or [string]::IsNullOrWhiteSpace($draft.category)) {
  throw 'The incident AI assistant did not return a draft and category.'
}

$submitted = Invoke-Api -Method 'POST' -Path "/incidents/$($draft.id)/submit" -Session $passenger -Body @{}
if ($submitted.status -ne 'SUBMITTED') {
  throw 'The incident was not submitted for LGU review.'
}

$incidents = Invoke-Api -Method 'GET' -Path '/incidents/admin/all' -Session $admin
$reviewIncident = $incidents | Where-Object { $_.id -eq $draft.id }
if ($null -eq $reviewIncident) {
  throw 'The submitted incident was not visible to the LGU review queue.'
}

$reviewed = Invoke-Api -Method 'PATCH' -Path "/incidents/admin/$($draft.id)/review" -Session $admin -Body @{
  status = 'UNDER_REVIEW'
  category = $draft.category
  reviewerNotes = 'Acceptance-check review: received by the LGU queue.'
}
if ($reviewed.status -ne 'UNDER_REVIEW') {
  throw 'The LGU could not update the incident review status.'
}

$completed = Invoke-Api -Method 'POST' -Path "/rides/$($ride.id)/end" -Session $passenger -Body @{}
if ($completed.status -ne 'COMPLETED') {
  throw 'The ride did not complete successfully.'
}

$history = Invoke-Api -Method 'GET' -Path '/rides' -Session $passenger
$savedRide = $history | Where-Object { $_.id -eq $ride.id }
if ($null -eq $savedRide -or $savedRide.status -ne 'COMPLETED') {
  throw 'The completed ride was not saved in passenger history.'
}

$contacts = Invoke-Api -Method 'GET' -Path '/safety/emergency-contacts'
if ($contacts.Count -eq 0) {
  throw 'No emergency contacts were returned.'
}

[PSCustomObject]@{
  Health = $health.status
  VerifiedDriver = $verified.driverName
  VerifiedVehicle = $verified.plateNumber
  FareAmount = $preview.amount
  FareMatrix = $preview.matrixVersion
  RideStatus = $completed.status
  SafeShareRideId = $share.rideId
  IncidentStatus = $reviewed.status
  EmergencyContacts = $contacts.Count
  HistoryContainsCompletedRide = $true
} | Format-List

Write-Host 'TriSafe passenger/LGU workflow verification passed.' -ForegroundColor Green
