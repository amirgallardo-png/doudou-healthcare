# ═══════════════════════════════════════════════════════════════
#  Doudou Healthcare — installe la sauvegarde automatique quotidienne
#  (chaque soir à 21:30, rattrapée au réveil si le PC était éteint).
#  Usage : clic droit > « Exécuter avec PowerShell », ou :  powershell -File tools\installer-sauvegarde.ps1
# ═══════════════════════════════════════════════════════════════
$projet = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$projet\tools\backup-daily.mjs`"" -WorkingDirectory $projet
$trigger = New-ScheduledTaskTrigger -Daily -At "21:30"
# StartWhenAvailable : si le PC était éteint à 21:30, la sauvegarde part au prochain démarrage.
$reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "Doudou - Sauvegarde" -Action $action -Trigger $trigger -Settings $reglages `
  -Description "Doudou Healthcare : copie quotidienne des données (Documents\Sauvegardes Doudou, 30 dernières). Voir $projet\README.md" -Force | Out-Null
Write-Host "Sauvegarde Doudou planifiée : chaque soir à 21:30."
