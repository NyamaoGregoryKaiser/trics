$Action = New-ScheduledTaskAction -Execute "C:\Users\admin\Desktop\PROJECTS\my-project\ALARDS\gitpush\run_script.bat" -WorkingDirectory "C:\Users\admin\Desktop\PROJECTS\my-project\ALARDS\gitpush"
$Trigger = New-ScheduledTaskTrigger -Daily -At 9AM
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -RestartInterval (New-TimeSpan -Minutes 1) -RestartCount 3
$Principal = New-ScheduledTaskPrincipal -UserId "$env:COMPUTERNAME\$env:USERNAME" -LogonType S4U -RunLevel Highest
Register-ScheduledTask -TaskName "DailyGitHubPush" -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Automatically pushes code to GitHub daily" 