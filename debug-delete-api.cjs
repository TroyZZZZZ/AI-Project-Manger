const http = require('http');

// 测试删除API调用，模拟前端请求
function testDeleteAPI() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/projects/4/subprojects/11',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log('发送DELETE请求到:', `http://${options.hostname}:${options.port}${options.path}`);

  const req = http.request(options, (res) => {
    console.log('响应状态码:', res.statusCode);
    console.log('响应头:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('响应数据:', data);
      try {
        const jsonData = JSON.parse(data);
        console.log('解析后的响应:', JSON.stringify(jsonData, null, 2));
      } catch (e) {
        console.log('响应不是有效的JSON:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('请求错误:', error);
  });

  req.end();
}

testDeleteAPI();