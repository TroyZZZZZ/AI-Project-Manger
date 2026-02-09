const http = require('http');

// 测试干系人API HTTP接口
const testStakeholderHTTP = () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/projects/4/stakeholders',
    method: 'GET',
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
      console.log('状态码:', res.statusCode);
      
      try {
        const result = JSON.parse(data);
        console.log('API响应结构:', JSON.stringify(result, null, 2));
        
        if (result.success && result.data && Array.isArray(result.data)) {
          console.log(`\n✅ 成功获取 ${result.data.length} 个干系人:`);
          result.data.forEach((stakeholder, index) => {
            console.log(`${index + 1}. ${stakeholder.name} (${stakeholder.role || '无角色'}) - ${stakeholder.company || '无公司'}`);
          });
          
          // 检查是否有杨鹏
          const yangpeng = result.data.find(s => s.name === '杨鹏');
          if (yangpeng) {
            console.log('\n✅ 找到杨鹏:', JSON.stringify(yangpeng, null, 2));
          } else {
            console.log('\n❌ 未找到杨鹏，但API工作正常');
          }
        } else {
          console.log('❌ 响应数据格式不正确');
          console.log('完整响应:', result);
        }
      } catch (error) {
        console.error('解析JSON失败:', error);
        console.log('原始响应:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('请求失败:', error);
  });

  req.end();
};

console.log('测试干系人HTTP API...');
testStakeholderHTTP();