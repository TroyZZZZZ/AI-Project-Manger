const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'admin123';
  const hash = '$2b$12$u2zH8DJO7UFR2tr1C9g0suJAWiHvSWepR5hZDV.wetZ6zulsIjHma';
  
  console.log('测试密码:', password);
  console.log('数据库哈希:', hash);
  
  try {
    const isValid = await bcrypt.compare(password, hash);
    console.log('密码验证结果:', isValid);
    
    if (!isValid) {
      console.log('尝试其他可能的密码...');
      const passwords = ['Admin123', 'admin', 'password', '123456'];
      
      for (const pwd of passwords) {
        const result = await bcrypt.compare(pwd, hash);
        console.log(`密码 "${pwd}":`, result);
        if (result) {
          console.log(`✅ 正确密码是: ${pwd}`);
          break;
        }
      }
    } else {
      console.log('✅ 密码验证成功');
    }
  } catch (error) {
    console.error('密码验证失败:', error);
  }
}

testPassword();