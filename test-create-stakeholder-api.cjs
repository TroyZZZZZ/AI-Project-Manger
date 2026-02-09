const fetch = require("node-fetch");

async function testCreateStakeholderAPI() {
  try {
    console.log("测试创建干系人API...");
    
    const stakeholderData = {
      name: "测试用户API",
      role: "developer",
      company: "测试公司API"
    };
    
    console.log("发送的数据:", JSON.stringify(stakeholderData, null, 2));
    
    const response = await fetch("http://localhost:3001/api/projects/4/stakeholders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stakeholderData),
    });
    
    console.log("响应状态:", response.status);
    
    const result = await response.json();
    console.log("响应结果:", JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log("✅ 创建干系人成功!");
    } else {
      console.log("❌ 创建干系人失败!");
    }
    
  } catch (error) {
    console.error("测试失败:", error.message);
  }
}

testCreateStakeholderAPI();
