const { StakeholderService } = require("./api/services/stakeholderService.cjs");

async function testCreateStakeholder() {
  try {
    console.log("测试创建干系人...");
    
    // 模拟前端发送的数据
    const stakeholderData = {
      project_id: "4",
      name: "测试用户",
      role: "developer",
      company: "测试公司"
    };
    
    console.log("发送的数据:", JSON.stringify(stakeholderData, null, 2));
    
    const result = await StakeholderService.createStakeholder("4", stakeholderData);
    console.log("创建成功:", result);
    
  } catch (error) {
    console.error("创建失败:", error.message);
    console.error("错误详情:", error);
  }
}

testCreateStakeholder();
