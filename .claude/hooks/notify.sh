#!/bin/bash
# notify.sh — Notificação Windows quando Claude precisa de atenção

powershell.exe -NonInteractive -WindowStyle Hidden -Command '
  Add-Type -AssemblyName System.Windows.Forms
  $n = New-Object System.Windows.Forms.NotifyIcon
  $n.Icon = [System.Drawing.SystemIcons]::Information
  $n.Visible = $true
  $n.ShowBalloonTip(8000, "Claude Code", "Precisa da sua atencao!", [System.Windows.Forms.ToolTipIcon]::Info)
  Start-Sleep 2
  $n.Dispose()
' &

exit 0
