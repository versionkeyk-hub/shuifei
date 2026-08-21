param(
  [Parameter(Mandatory = $true)]
  [string]$SourceRoot,
  [string]$CatalogPath = "data/generated/product-catalog.json",
  [string]$Bucket = "hmht-agri-product-assets"
)

$ErrorActionPreference = "Stop"
$catalog = Get-Content -LiteralPath $CatalogPath -Raw -Encoding UTF8 | ConvertFrom-Json
$uploaded = 0
$failed = @()

foreach ($asset in $catalog.image_manifest) {
  $sourcePath = Join-Path $SourceRoot $asset.source_path
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    $failed += "$($asset.source_path) (source missing)"
    continue
  }

  try {
    wrangler r2 object put "$Bucket/$($asset.r2_key)" --file "$sourcePath" --remote | Out-Host
    $uploaded += 1
  } catch {
    $failed += "$($asset.source_path) ($($_.Exception.Message))"
  }
}

[PSCustomObject]@{
  Uploaded = $uploaded
  Failed = $failed.Count
  FailedFiles = $failed
} | ConvertTo-Json -Depth 3
