Continue = 'Stop'
 = 'http://localhost:3001/api'
 = @{ 'Content-Type' = 'application/json' }

Write-Host 'Create project'
 = @{ name = '����������Ŀ'; description = '����ǰ�˸���ҳ����' } | ConvertTo-Json
 = Invoke-RestMethod -Uri ( + '/projects') -Method Post -Headers  -Body 
 = .data.id
Write-Host ('projectId: ' + )

Write-Host 'Create subproject'
 = @{ name = '��������Ŀ'; description = '����Ŀ' } | ConvertTo-Json
 = Invoke-RestMethod -Uri ( + '/projects/' +  + '/subprojects') -Method Post -Headers  -Body 
 = .data.id
Write-Host ('subId: ' + )

Write-Host 'Create story'
 = @{ subproject_id = ; story_name = '���Թ���A'; time = (Get-Date).ToString('s') + 'Z'; stakeholders = '����,����'; content = '�������ڸ������ԵĹ���' } | ConvertTo-Json
 = Invoke-RestMethod -Uri ( + '/stories') -Method Post -Headers  -Body 
 = .data.id
Write-Host ('storyId: ' + )

Write-Host 'Set next reminder'
 = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
 = @{ next_reminder_date =  } | ConvertTo-Json
 = Invoke-RestMethod -Uri ( + '/stories/' +  + '/next-reminder-date') -Method Put -Headers  -Body 
Write-Host ( | ConvertTo-Json -Depth 5)

Write-Host 'Create follow-up record'
 = @{ content = '�״ε绰����'; follow_up_type = 'phone'; contact_person = '����'; contact_method = '�绰'; result = '�ѹ�ͨ'; next_action = '�����ط�' } | ConvertTo-Json
 = Invoke-RestMethod -Uri ( + '/stories/' +  + '/follow-up-records') -Method Post -Headers  -Body 
Write-Host ( | ConvertTo-Json -Depth 5)

Write-Host 'List following stories'
 = Invoke-RestMethod -Uri ( + '/stories/following') -Method Get
Write-Host ( | ConvertTo-Json -Depth 5)
