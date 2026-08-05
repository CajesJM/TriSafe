param(
  [Parameter(Mandatory = $true)][string]$SourcePath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [Parameter(Mandatory = $true)][string]$PreviewDirectory
)

$ErrorActionPreference = 'Stop'
$resolvedSource = (Resolve-Path -LiteralPath $SourcePath).Path
$resolvedOutputDirectory = (Resolve-Path -LiteralPath (Split-Path -Parent $OutputPath)).Path
$resolvedPreviewDirectory = (Resolve-Path -LiteralPath $PreviewDirectory).Path
$resolvedOutput = Join-Path $resolvedOutputDirectory (Split-Path -Leaf $OutputPath)

Copy-Item -LiteralPath $resolvedSource -Destination $resolvedOutput -Force

$replacements = [ordered]@{
  'React Vite, Flutter' = 'React with Vite, Flutter'
  'NestJS' = 'NestJS (Node.js)'
  'Firebase Authentication' = 'Custom JWT (HS256), NestJS Guards/RBAC, scrypt password hashing'
  'Visual Studio Code' = 'Visual Studio Code, Android Studio'
  'Postman' = 'Postman, Jest, PowerShell API verification scripts'
  'pgAdmin 4' = 'pgAdmin 4, Prisma ORM'
  'Android Emulator, Google Chrome, Microsoft Edge' = 'Android Emulator, physical Android device, Google Chrome, Microsoft Edge'
}

$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($resolvedOutput, $false, $false)

  foreach ($entry in $replacements.GetEnumerator()) {
    $find = $document.Content.Find
    $find.ClearFormatting()
    $find.Replacement.ClearFormatting()
    $found = $find.Execute($entry.Key, $false, $false, $false, $false, $false, $true, 1, $false, $entry.Value, 2)
    if (-not $found) {
      throw "Expected table value was not found: $($entry.Key)"
    }
  }

  $document.Save()
  $pdfPath = Join-Path $resolvedPreviewDirectory 'Table_8.0_Tools_TriSafe_Verified.pdf'
  $document.ExportAsFixedFormat($pdfPath, 17)

  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $pageCount = $document.ComputeStatistics(2)
  for ($page = 1; $page -le $pageCount; $page++) {
    $pageStart = $document.GoTo(1, 1, $page)
    if ($page -lt $pageCount) {
      $nextPage = $document.GoTo(1, 1, $page + 1)
      $pageEnd = $nextPage.Start - 1
    } else {
      $pageEnd = $document.Content.End
    }
    $range = $document.Range($pageStart.Start, $pageEnd)
    $range.CopyAsPicture()
    Start-Sleep -Milliseconds 500
    $image = [System.Windows.Forms.Clipboard]::GetImage()
    if ($null -ne $image) {
      $previewPath = Join-Path $resolvedPreviewDirectory ("page-{0}.png" -f $page)
      $image.Save($previewPath, [System.Drawing.Imaging.ImageFormat]::Png)
      $image.Dispose()
    }
  }
} finally {
  if ($null -ne $document) {
    $document.Close($false)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
  }
  if ($null -ne $word) {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

Write-Output $resolvedOutput
