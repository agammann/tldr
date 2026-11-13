$ErrorActionPreference = 'Stop'
# This script runs only on a fresh GitHub-hosted runner, not an operator's host.
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') { throw 'Requires a disposable GitHub-hosted runner.' }
$id = [guid]::NewGuid().ToString('N')
$name = 'tldr' + $id.Substring(0, 12)
$password = ConvertTo-SecureString ('Tldr-' + [guid]::NewGuid().ToString('N') + '!9') -AsPlainText -Force
New-LocalUser -Name $name -Password $password -AccountNeverExpires | Out-Null
Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $name
$attackerSid = (Get-LocalUser -Name $name).SID.Value
$parent = "C:\tldr-acl-test-$id"
node scripts/test-windows-accounts.mjs $parent
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the synthetic state.' }
$account = "$env:COMPUTERNAME\$name"
$credential = [pscredential]::new($account, $password)
$script = @"
`$ErrorActionPreference = 'Stop'
`$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
if (`$identity.User.Value -ne '$attackerSid') { exit 9 }
`$principal = [System.Security.Principal.WindowsPrincipal]::new(`$identity)
if (`$principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) { exit 10 }
if ([System.IO.File]::ReadAllText('$parent\control.txt') -ne 'synthetic public control') { exit 11 }
try { [System.IO.File]::ReadAllText('$parent\state\pairing.json') | Out-Null; exit 12 }
catch [System.UnauthorizedAccessException] { }
try { [System.IO.File]::WriteAllText('$parent\state\injected.json', 'fictional'); exit 13 }
catch [System.UnauthorizedAccessException] { }
exit 0
"@
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
$process = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Credential $credential -WorkingDirectory 'C:\' -ArgumentList '-NoProfile', '-NonInteractive', '-EncodedCommand', $encoded -WindowStyle Hidden -PassThru
if (-not $process.WaitForExit(30000)) { throw 'Second-account test timed out.' }
if ($process.ExitCode -ne 0) { throw "Second-account isolation test failed with exit code $($process.ExitCode)." }
Write-Output 'A separate non-administrator account read the control but could neither read nor write the synthetic private state.'
