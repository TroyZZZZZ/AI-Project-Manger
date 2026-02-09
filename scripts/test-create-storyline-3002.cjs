#!/usr/bin/env node
'use strict';

// Simple POST to create a storyline against port 3002
async function main() {
  const url = 'http://localhost:3002/api/projects/18/storylines';
  const body = {
    title: '路由直插验证',
    content: '通过3002端口测试',
    event_time: '2025-11-11 10:55',
    stakeholder_ids: []
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log(text);
  } catch (err) {
    console.error('Request failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();