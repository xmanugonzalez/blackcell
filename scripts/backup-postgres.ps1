param(
  [string]$SshTarget = "root@74.208.118.199",
  [string]$ContainerName = "blackcell-postgres-1",
  [string]$DatabaseName = "blackcell",
  [string]$DatabaseUser = "blackcell",
  [string]$BackupDirectory = "$HOME\BlackCellBackups"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $BackupDirectory "blackcell-$timestamp.dump.gz"
$remoteBackupPath = "/tmp/blackcell-$timestamp.dump.gz"
$remoteCommand = "docker exec $ContainerName pg_dump -U $DatabaseUser -d $DatabaseName --format=custom --no-owner --no-privileges | gzip -c > $remoteBackupPath"

ssh $SshTarget $remoteCommand
scp "${SshTarget}:$remoteBackupPath" $backupPath
ssh $SshTarget "rm -f $remoteBackupPath"

if ((Get-Item $backupPath).Length -le 0) {
  Remove-Item -LiteralPath $backupPath -Force
  throw "El backup quedo vacio. Revisa la conexion SSH y el estado del contenedor PostgreSQL."
}

Write-Host "Backup creado: $backupPath"
