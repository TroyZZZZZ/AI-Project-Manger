const http = require('http');

async function testActualDelete() {
  return new Promise((resolve, reject) => {
    console.log('=== 测试实际删除API ===');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/projects/4/subprojects/11',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    console.log('请求URL: http://localhost:3001/api/projects/4/subprojects/11');
    console.log('请求方法: DELETE');
    
    const req = http.request(options, (res) => {
      console.log('响应状态码:', res.statusCode);
      console.log('响应状态文本:', res.statusMessage);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('响应数据:', data);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ 删除成功');
        } else {
          console.log('❌ 删除失败');
          
          // 尝试解析JSON响应
          try {
            const jsonData = JSON.parse(data);
            console.log('解析后的错误信息:', jsonData);
          } catch (e) {
            console.log('无法解析响应为JSON');
          }
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('测试失败:', error);
      reject(error);
    });
    
    req.end();
  });
}

testActualDelete();