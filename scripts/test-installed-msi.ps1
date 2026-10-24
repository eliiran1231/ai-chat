param(
  [Parameter(Mandatory = $true)][string]$MsiPath,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [switch]$RequireCleanMachine,
  [switch]$DisposableMachine
)
$ErrorActionPreference = 'Stop'
if (-not $DisposableMachine) { throw 'This test installs/uninstalls software. Run only on a disposable CI runner/VM with -DisposableMachine.' }
$msi = (Resolve-Path -LiteralPath $MsiPath).Path
$output = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $output -Force | Out-Null
$globalRuntime = Test-Path (Join-Path $env:WINDIR 'System32\vcruntime140.dll')
$visualStudio = (Test-Path (Join-Path $env:ProgramFiles 'Microsoft Visual Studio')) -or
  (Test-Path (Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'))
@{ globalVcRuntime = $globalRuntime; visualStudioPresent = $visualStudio; cleanMachineRequired = [bool]$RequireCleanMachine } |
  ConvertTo-Json | Set-Content (Join-Path $output 'environment.json')
if ($RequireCleanMachine -and ($globalRuntime -or $visualStudio)) {
  throw 'Clean-machine precondition failed: global VC runtime or Visual Studio is present.'
}
$install = Join-Path $output ('installed-' + [guid]::NewGuid().ToString('N'))
$installed = $false
$primaryError = $null
try {
  $process = Start-Process msiexec.exe -ArgumentList @('/i',('"' + $msi + '"'),'/qn','/norestart',('APPLICATIONFOLDER="' + $install + '"'),'/L*v',('"' + (Join-Path $output 'install.log') + '"')) -WindowStyle Hidden -Wait -PassThru
  if ($process.ExitCode -notin @(0, 3010)) { throw "MSI installation failed: $($process.ExitCode)" }
  $installed = $true
  if ($process.ExitCode -eq 3010) { throw 'Installer requires a reboot; validation cannot pass before reboot.' }
  $executable = Join-Path $install 'AI Chat.exe'
  if (-not (Test-Path -LiteralPath $executable)) { throw "Installed executable not found: $executable" }
  & node (Join-Path $PSScriptRoot 'test-installed-app.cjs') $executable (Join-Path $output 'installed-app.json')
  if ($LASTEXITCODE -ne 0) { throw "Installed app test failed: $LASTEXITCODE" }
} catch { $primaryError = $_ }
finally {
  if ($installed) {
    try {
      $process = Start-Process msiexec.exe -ArgumentList @('/x',('"' + $msi + '"'),'/qn','/norestart','/L*v',('"' + (Join-Path $output 'uninstall.log') + '"')) -WindowStyle Hidden -Wait -PassThru
      if ($process.ExitCode -notin @(0, 3010)) { throw "MSI uninstall failed: $($process.ExitCode)" }
      if (Test-Path -LiteralPath $executable) { throw 'Uninstall left the application executable behind.' }
    } catch {
      if ($null -eq $primaryError) { $primaryError = $_ } else { Write-Warning "Cleanup also failed: $_" }
    }
  }
}
if ($null -ne $primaryError) { throw $primaryError }
