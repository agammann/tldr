import { lstatSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const windowsAcl = `
$ErrorActionPreference = 'Stop'
$target = $env:TLDR_STATE_PATH
$mode = $env:TLDR_STATE_ACTION
$current = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$allowed = @($current, 'S-1-5-18', 'S-1-5-32-544')
$entry = Get-Item -LiteralPath $target -Force
if ($mode -eq 'protect') {
  $acl = [System.Security.AccessControl.DirectorySecurity]::new()
  $acl.SetOwner([System.Security.Principal.SecurityIdentifier]::new($current))
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($sid in $allowed) {
    $identity = [System.Security.Principal.SecurityIdentifier]::new($sid)
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
  }
  $entry.SetAccessControl($acl)
}
$acl = $entry.GetAccessControl()
$owner = $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
if ($mode -eq 'parent') {
  if ($owner -notin $allowed) { throw 'State parent is owned by another account.' }
  # Create, modify, delete, take ownership and change-permission bits.
  $unsafe = 0xD0156
  foreach ($rule in $acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier])) {
    if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin $allowed -and
        (([int]$rule.FileSystemRights -band $unsafe) -ne 0)) {
      throw 'State parent is writable by another account.'
    }
  }
  # A protected immediate parent is insufficient if another account can
  # replace it through an ancestor. Ignore inherit-only ACEs on the ancestor
  # itself, and trust the Windows servicing owner used on system roots.
  $trustedInstaller = (New-Object System.Security.Principal.NTAccount('NT SERVICE', 'TrustedInstaller')).Translate([System.Security.Principal.SecurityIdentifier]).Value
  $ancestor = $entry
  while ($null -ne $ancestor) {
    if (($ancestor.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'State ancestry contains a reparse point.' }
    $ancestorAcl = $ancestor.GetAccessControl()
    if ($ancestorAcl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -notin ($allowed + $trustedInstaller)) { throw 'State ancestor is owned by another account.' }
    foreach ($rule in $ancestorAcl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier])) {
      if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin ($allowed + $trustedInstaller) -and
          (($rule.PropagationFlags -band [System.Security.AccessControl.PropagationFlags]::InheritOnly) -eq 0) -and
          (([int]$rule.FileSystemRights -band 0xD0040) -ne 0)) { throw 'State ancestor can be replaced by another account.' }
    }
    $ancestor = $ancestor.Parent
  }
} else {
  if (($mode -eq 'file' -and $owner -notin $allowed) -or
      ($mode -ne 'file' -and $owner -ne $current)) { throw 'Private state is owned by another account.' }
  foreach ($rule in $acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier])) {
    if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin $allowed) {
      throw 'Private state grants access to another account.'
    }
  }
}
`;

function checkWindowsAcl(target, action) {
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', windowsAcl], {
      env: { ...process.env, TLDR_STATE_PATH: target, TLDR_STATE_ACTION: action },
      windowsHide: true, stdio: 'pipe', timeout: 15000,
    });
  } catch {
    throw new Error('Private tldr state permissions are unsafe or could not be verified. Use a private per-user directory; see docs/INSTALL.md for migration and pairing rotation.');
  }
}

function ordinaryDirectory(directory) {
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Private tldr state must be an ordinary directory.');
}

export function defaultDataDirectory() {
  const selected = process.env.TLDR_DATA_DIR || process.env.TERMS_TLDR_DATA_DIR;
  if (selected) return resolve(selected);
  if (process.platform === 'win32') {
    if (!process.env.LOCALAPPDATA) throw new Error('LOCALAPPDATA is required for private tldr state on Windows.');
    return join(process.env.LOCALAPPDATA, 'TermsTLDR');
  }
  return fileURLToPath(new URL('../.local/', import.meta.url));
}

// This helper is also used to prepare empty, disposable test parents. No
// sensitive state is read or written until the resulting ACL is verified.
export function protectEmptyDirectory(directory) {
  ordinaryDirectory(directory);
  if (readdirSync(directory).length) throw new Error('Existing private state needs manual inspection before changing its permissions.');
  if (process.platform === 'win32') checkWindowsAcl(directory, 'protect');
  if (readdirSync(directory).length) throw new Error('Private state changed while its permissions were set.');
}

export function prepareDataDirectory(directory) {
  const selected = resolve(directory);
  if (process.platform !== 'win32') {
    mkdirSync(selected, { recursive: true, mode: 0o700 });
    ordinaryDirectory(selected);
    assertPrivateStateFile(selected, 'pairing.json');
    assertPrivateStateFile(selected, 'history.json');
    return selected;
  }
  const parent = dirname(selected);
  ordinaryDirectory(parent);
  checkWindowsAcl(parent, 'parent');
  let created = false;
  try { mkdirSync(selected, { mode: 0o700 }); created = true; }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  ordinaryDirectory(selected);
  try { checkWindowsAcl(selected, 'state'); }
  catch (error) {
    // Never repair an existing unsafe directory: another account could have
    // opened it before its ACL was tightened. Retry concurrent starts instead.
    if (!created) throw error;
    protectEmptyDirectory(selected);
  }
  assertPrivateStateFile(selected, 'pairing.json');
  assertPrivateStateFile(selected, 'history.json');
  return selected;
}

export function assertPrivateStateFile(directory, name) {
  const target = join(directory, name);
  let stat;
  try { stat = lstatSync(target); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Private tldr state must be an ordinary file.');
  if (process.platform === 'win32') checkWindowsAcl(target, 'file');
}
