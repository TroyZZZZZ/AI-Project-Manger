// 测试前端API调用
const http = require('http');

async function testFrontendAPI() {
  try {
    const projectId = '4';
    const subprojectId = '16';
    
    console.log('测试前端API调用:');
    console.log('URL:', `http://localhost:3001/api/projects/${projectId}/subprojects/${subprojectId}`);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/projects/${projectId}/subprojects/${subprojectId}`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('响应状态码:', res.statusCode);
        console.log('响应数据:', data);
        
        if (res.statusCode === 200) {
          console.log('删除成功!');
        } else {
          console.log('删除失败!');
        }
      });
    });

    req.on('error', (error) => {
      console.error('请求错误:', error.message);
    });

    req.end();
    
  } catch (error) {
    console.error('删除失败:', error.message);
  }
}

testFrontendAPI();
