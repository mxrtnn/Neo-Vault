param([switch]$UseCachedDownloads)
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$downloadRoot = Join-Path $projectRoot 'work/runtime-download'
$runtimeRoot = Join-Path $projectRoot 'runtime/retroarch'
$archive = Join-Path $downloadRoot 'RetroArch-1.22.2.7z'
$coreArchive = Join-Path $downloadRoot 'snes9x_libretro.dll.zip'
$retroarchUrl = 'https://buildbot.libretro.com/stable/1.22.2/windows/x86_64/RetroArch.7z'
$coreUrl = 'https://buildbot.libretro.com/nightly/windows/x86_64/latest/snes9x_libretro.dll.zip'
if (![Environment]::Is64BitOperatingSystem) { throw 'Este paquete inicial requiere Windows de 64 bits.' }
if ((Test-Path (Join-Path $runtimeRoot 'neo-vault-runtime.json')) -and (Test-Path (Join-Path $runtimeRoot 'retroarch.exe')) -and (Test-Path (Join-Path $runtimeRoot 'cores/snes9x_libretro.dll'))) {
  Write-Output 'SNES ya esta instalado en runtime/retroarch. Se conserva la instalacion existente.'
  exit 0
}
New-Item -ItemType Directory -Force $downloadRoot | Out-Null
$ProgressPreference = 'SilentlyContinue'
if (!(Test-Path $archive) -or !$UseCachedDownloads) {
  Write-Output 'Descargando RetroArch 1.22.2 desde su fuente oficial (aprox. 203 MB)...'
  Invoke-WebRequest -Uri $retroarchUrl -OutFile $archive -TimeoutSec 600
}
if (!(Test-Path $coreArchive) -or !$UseCachedDownloads) {
  Write-Output 'Descargando solo el nucleo Snes9x...'
  Invoke-WebRequest -Uri $coreUrl -OutFile $coreArchive -TimeoutSec 180
}
$stage = Join-Path $projectRoot ('work/runtime-stage-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $stage | Out-Null
$entries = & tar -tf $archive
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el paquete oficial. No se modifica el runtime.' }
$selected = @($entries | Where-Object {
  $_ -match '^RetroArch-Win64/(retroarch\.exe|[^/]+\.dll|retroarch\.default\.cfg)$' -or
  $_ -match '^RetroArch-Win64/autoconfig/[^/]+/[^/]+\.cfg$' -or
  $_ -eq 'RetroArch-Win64/info/snes9x_libretro.info' -or
  $_ -eq 'RetroArch-Win64/assets/pkg/osd-font.ttf' -or
  $_ -eq 'RetroArch-Win64/assets/COPYING'
})
foreach ($entry in $selected) {
  if ($entry -match '(^|/)\.\.(/|$)|^[\\/]|^[A-Za-z]:') { throw 'Ruta de archivo no valida dentro del paquete.' }
}
$listFile = Join-Path $stage 'extract-list.txt'
[System.IO.File]::WriteAllLines($listFile, $selected, [System.Text.UTF8Encoding]::new($false))
Write-Output 'Extrayendo ejecutable, bibliotecas, perfiles de mando y recursos minimos...'
& tar -xf $archive -C $stage --strip-components 1 -T $listFile
if ($LASTEXITCODE -ne 0) { throw 'Fallo la extraccion. No se modifica el runtime existente.' }
New-Item -ItemType Directory -Force (Join-Path $stage 'cores'),(Join-Path $stage 'licenses') | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($coreArchive)
try {
  $entry = $zip.Entries | Where-Object { $_.FullName -eq 'snes9x_libretro.dll' } | Select-Object -First 1
  if (!$entry) { throw 'El paquete de Snes9x no contiene el nucleo esperado.' }
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $stage 'cores/snes9x_libretro.dll'), $true)
} finally { $zip.Dispose() }
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/libretro/RetroArch/v1.22.2/COPYING' -OutFile (Join-Path $stage 'licenses/RetroArch-COPYING.txt') -TimeoutSec 60
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/libretro/snes9x/master/LICENSE' -OutFile (Join-Path $stage 'licenses/Snes9x-LICENSE.txt') -TimeoutSec 60
if (!(Test-Path (Join-Path $stage 'retroarch.exe'))) { throw 'Falta retroarch.exe despues de la extraccion.' }
$manifest = @{
  retroarchVersion = '1.22.2'
  platform = 'windows-x86_64'
  core = 'snes9x_libretro.dll'
  installedAt = [DateTime]::UtcNow.ToString('o')
  retroarchUrl = $retroarchUrl
  coreUrl = $coreUrl
  retroarchArchiveSha256 = (Get-FileHash $archive -Algorithm SHA256).Hash
  coreArchiveSha256 = (Get-FileHash $coreArchive -Algorithm SHA256).Hash
  executableSha256 = (Get-FileHash (Join-Path $stage 'retroarch.exe') -Algorithm SHA256).Hash
  coreSha256 = (Get-FileHash (Join-Path $stage 'cores/snes9x_libretro.dll') -Algorithm SHA256).Hash
}
New-Item -ItemType Directory -Force $runtimeRoot | Out-Null
# Copy only selected runtime files, never user saves or data/launcher.json.
foreach ($item in (Get-ChildItem -LiteralPath $stage)) {
  if ($item.Name -ne 'extract-list.txt') { Copy-Item -LiteralPath $item.FullName -Destination $runtimeRoot -Recurse -Force }
}
[System.IO.File]::WriteAllText((Join-Path $runtimeRoot 'neo-vault-runtime.json'), ($manifest | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))
$bytes = (Get-ChildItem -LiteralPath $runtimeRoot -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Output ('SNES instalado en runtime/retroarch. Tamano: {0:N1} MiB. No se descargaron juegos.' -f ($bytes / 1MB))
