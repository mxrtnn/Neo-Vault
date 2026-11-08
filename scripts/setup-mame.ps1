param([switch]$UseCachedDownloads)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$downloadRoot = Join-Path $projectRoot 'work/mame-download'
$runtimeRoot = Join-Path $projectRoot 'runtime/mame'
$archive = Join-Path $downloadRoot 'mame0289b_x64.exe'
$xmlArchive = Join-Path $downloadRoot 'mame0289lx.zip'
$runtimeUrl = 'https://github.com/mamedev/mame/releases/download/mame0289/mame0289b_x64.exe'
$xmlUrl = 'https://github.com/mamedev/mame/releases/download/mame0289/mame0289lx.zip'
$catalogFile = Join-Path $projectRoot 'src/shared/arcade-catalog.json'
if (![Environment]::Is64BitOperatingSystem) { throw 'MAME 0.289 requiere Windows 10+ de 64 bits y CPU x86-64-v2.' }
if ((Test-Path (Join-Path $runtimeRoot 'mame.exe')) -and (Test-Path (Join-Path $runtimeRoot 'neo-vault-runtime.json')) -and (Test-Path $catalogFile)) {
  Write-Output 'MAME y su catalogo ya estan preparados. Se conserva la instalacion.'
  exit 0
}
New-Item -ItemType Directory -Force $downloadRoot | Out-Null
if (!(Test-Path $archive) -or !$UseCachedDownloads) {
  Write-Output 'Descargando MAME 0.289 oficial (84 MiB)...'
  Invoke-WebRequest -Uri ($runtimeUrl + '?neo-vault=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -OutFile $archive -TimeoutSec 600
}
if (!(Test-Path $xmlArchive) -or !$UseCachedDownloads) {
  Write-Output 'Descargando metadatos oficiales; no contienen ROMs...'
  Invoke-WebRequest -Uri ($xmlUrl + '?neo-vault=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -OutFile $xmlArchive -TimeoutSec 300
}
$stage = Join-Path $projectRoot ('work/mame-stage-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $stage | Out-Null
$entries = & tar -tf $archive
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer la distribucion oficial.' }
$selected = @($entries | Where-Object { $_ -in @('mame.exe','COPYING','uismall.bdf') -or $_ -match '^(bgfx|artwork/bgfx)/.+[^/]$' })
foreach ($entry in $selected) { if ($entry -match '(^|/)\.\.(/|$)|^[\\/]|^[A-Za-z]:') { throw 'Ruta no valida en el paquete.' } }
$listFile = Join-Path $stage 'extract-list.txt'
[System.IO.File]::WriteAllLines($listFile, $selected, [System.Text.UTF8Encoding]::new($false))
& tar -xf $archive -C $stage -T $listFile
if ($LASTEXITCODE -ne 0 -or !(Test-Path (Join-Path $stage 'mame.exe'))) { throw 'No se pudo extraer MAME.' }
Write-Output 'Generando catalogo arcade desde el XML oficial...'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($xmlArchive)
$games = [System.Collections.Generic.List[object]]::new()
try {
  $xmlEntry = $zip.Entries | Where-Object { $_.FullName -eq 'mame0289.xml' } | Select-Object -First 1
  if (!$xmlEntry) { throw 'Falta el XML esperado de MAME 0.289.' }
  $stream = $xmlEntry.Open()
  $settings = [System.Xml.XmlReaderSettings]::new()
  $settings.DtdProcessing = [System.Xml.DtdProcessing]::Ignore
  $settings.XmlResolver = $null
  $reader = [System.Xml.XmlReader]::Create($stream, $settings)
  try {
    while ($reader.Read()) {
      if ($reader.NodeType -ne [System.Xml.XmlNodeType]::Element -or $reader.Name -ne 'machine') { continue }
      if ($reader.GetAttribute('isdevice') -eq 'yes' -or $reader.GetAttribute('isbios') -eq 'yes' -or $reader.GetAttribute('ismechanical') -eq 'yes') { continue }
      $subtree = $reader.ReadSubtree()
      try {
        $document = [System.Xml.XmlDocument]::new()
        $document.XmlResolver = $null
        $document.Load($subtree)
        $machine = $document.DocumentElement
        $input = $machine.SelectSingleNode('input')
        $coins = 0
        if (!$input -or ![int]::TryParse($input.GetAttribute('coins'), [ref]$coins) -or $coins -lt 1) { continue }
        $id = $machine.GetAttribute('name')
        if ($id -notmatch '^[a-z0-9_]{1,64}$') { continue }
        $driver = $machine.SelectSingleNode('driver')
        if (!$driver) { continue }
        $games.Add([pscustomobject]@{
          id = $id
          title = [string]$machine.description
          year = [string]$machine.year
          manufacturer = [string]$machine.manufacturer
          cloneOf = $machine.GetAttribute('cloneof')
          status = $driver.GetAttribute('status')
          saveStates = $driver.GetAttribute('savestate') -eq 'supported'
          romless = $id -in @('pong','pongd','rebound','breakout')
        })
      } finally { $subtree.Dispose() }
    }
  } finally { $reader.Dispose(); $stream.Dispose() }
} finally { $zip.Dispose() }
if ($games.Count -lt 1000) { throw 'El catalogo resultante esta incompleto; no se reemplaza la fuente.' }
foreach ($group in ($games | Group-Object title | Where-Object { $_.Count -gt 1 })) {
  foreach ($game in $group.Group) { $game.title += ' [' + $game.id + ']' }
}
$catalog = @{ version = '0.289'; source = $xmlUrl; games = @($games | Sort-Object title) }
[System.IO.File]::WriteAllText($catalogFile, ($catalog | ConvertTo-Json -Depth 5 -Compress), [System.Text.UTF8Encoding]::new($false))
New-Item -ItemType Directory -Force $runtimeRoot | Out-Null
foreach ($item in (Get-ChildItem -LiteralPath $stage)) {
  if ($item.Name -ne 'extract-list.txt') { Copy-Item -LiteralPath $item.FullName -Destination $runtimeRoot -Recurse -Force }
}
$manifest = @{ version = '0.289'; platform = 'windows-x86_64-v2'; source = $runtimeUrl; installedAt = [DateTime]::UtcNow.ToString('o'); archiveSha256 = (Get-FileHash $archive -Algorithm SHA256).Hash; executableSha256 = (Get-FileHash (Join-Path $runtimeRoot 'mame.exe') -Algorithm SHA256).Hash; catalogSha256 = (Get-FileHash $xmlArchive -Algorithm SHA256).Hash }
[System.IO.File]::WriteAllText((Join-Path $runtimeRoot 'neo-vault-runtime.json'), ($manifest | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))
$bytes = (Get-ChildItem -LiteralPath $runtimeRoot -Recurse -File | Measure-Object Length -Sum).Sum
Write-Output ('MAME instalado: {0:N1} MiB. Catalogo: {1} entradas arcade. No se descargaron ROMs.' -f ($bytes / 1MB), $games.Count)
