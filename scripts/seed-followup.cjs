#!/usr/bin/env node

const API = 'http://localhost:3001/api';
const headers = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const url = `${API}${path}`
  const res = await fetch(url, { headers, ...options })
  let data
  try { data = await res.json() } catch { data = null }
  if (!res.ok || (data && data.success === false)) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`
    throw new Error(`${options.method || 'GET'} failed: ${msg}`)
  }
  return data
}

async function main() {
  console.log('Seeding follow-up demo data...');

  // 1) Create project
  const projectResp = await request('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: '����������Ŀ',
      description: '����ǰ�˸���ҳ����'
    })
  });
  const projectId = projectResp.data.id;
  console.log('Project created:', projectId);

  // 2) Create subproject
  const subResp = await request(`/projects/${projectId}/subprojects`, {
    method: 'POST',
    body: JSON.stringify({
      name: '��������Ŀ',
      description: '����Ŀ'
    })
  });
  const subprojectId = subResp.data.id;
  console.log('Subproject created:', subprojectId);

  // 3) Create story
  const storyResp = await request('/stories', {
    method: 'POST',
    body: JSON.stringify({
      subproject_id: subprojectId,
      story_name: '���Թ���A',
      time: new Date().toISOString(),
      stakeholders: '����,����',
      content: '�������ڸ������ԵĹ���'
    })
  });
  const storyId = storyResp.data.id;
  console.log('Story created:', storyId);

  // 4) Set next reminder date (tomorrow)
  const dateStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dateResp = await request(`/stories/${storyId}/next-reminder-date`, {
    method: 'PUT',
    body: JSON.stringify({ next_reminder_date: dateStr })
  });
  console.log('Next reminder set:', dateResp.data);

  // 5) Create a follow-up record
  const recResp = await request(`/stories/${storyId}/follow-up-records`, {
    method: 'POST',
    body: JSON.stringify({
      content: '�״ε绰����',
      follow_up_type: 'phone',
      contact_person: '����',
      contact_method: '�绰',
      result: '�ѹ�ͨ',
      next_action: '�����ط�'
    })
  });
  console.log('Follow-up record created:', recResp.data);

  // 6) List following stories
  const listResp = await request('/stories/following');
  console.log('Following stories count:', listResp.count);
  console.log('First row sample:', listResp.data?.[0]);

  console.log('Seed complete.');
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
