const express = require('express');
const { SubprojectService } = require('../services/subprojectService.cjs');
const {
  validateSubprojectCreation,
  validateSubprojectUpdate,
  validateId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation.cjs');

const router = express.Router();

// 获取子项目列表
router.get('/:projectId/subprojects', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    // 验证项目ID是否为有效数字
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        success: false,
        message: '无效的项目ID'
      });
    }

    const subprojects = await SubprojectService.getSubprojects(projectId, userId);

    res.json({
      success: true,
      data: subprojects
    });
  } catch (error) {
    console.error('获取子项目列表失败:', error);
    
    // 记录详细错误信息
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'api-errors.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] 获取子项目列表失败 - 项目ID: ${req.params.projectId}, 用户ID: 1, 错误: ${error.message}\n堆栈: ${error.stack}\n\n`;
    
    fs.appendFileSync(logFile, logEntry);
    
    res.status(500).json({
      success: false,
      message: error.message || '获取子项目列表失败'
    });
  }
});

// 创建子项目
router.post('/:projectId/subprojects', validateSubprojectCreation, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const subprojectData = req.body;

    const subproject = await SubprojectService.createSubproject(projectId, subprojectData, userId);

    res.status(201).json({
      success: true,
      data: subproject,
      message: '子项目创建成功'
    });
  } catch (error) {
    console.error('创建子项目失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '创建子项目失败'
    });
  }
});

// 获取子项目详情
router.get('/:projectId/subprojects/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    const subproject = await SubprojectService.getSubprojectById(id, projectId, userId);

    if (!subproject) {
      return res.status(404).json({
        success: false,
        message: '子项目不存在'
      });
    }

    res.json({
      success: true,
      data: subproject
    });
  } catch (error) {
    console.error('获取子项目详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取子项目详情失败'
    });
  }
});

// 更新子项目
router.put('/:projectId/subprojects/:id', validateSubprojectUpdate, async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const updateData = req.body;

    const subproject = await SubprojectService.updateSubproject(id, updateData, userId);

    res.json({
      success: true,
      data: subproject,
      message: '子项目更新成功'
    });
  } catch (error) {
    console.error('更新子项目失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新子项目失败'
    });
  }
});

// 删除子项目
router.delete('/:projectId/subprojects/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    // 验证参数
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        success: false,
        message: '无效的项目ID'
      });
    }

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的子项目ID'
      });
    }

    // 将字符串参数转换为整数
    const projectIdInt = parseInt(projectId);
    const idInt = parseInt(id);

    await SubprojectService.deleteSubproject(idInt, projectIdInt, userId);

    res.json({
      success: true,
      message: '子项目删除成功'
    });
  } catch (error) {
    console.error('删除子项目失败:', error);

    // 记录详细错误信息到日志文件，便于排查
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'api-errors.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] 删除子项目失败 - 项目ID: ${req.params.projectId}, 子项目ID: ${req.params.id}, 用户ID: 1, 错误: ${error.message}\n堆栈: ${error.stack}\n\n`;
    try {
      fs.appendFileSync(logFile, logEntry);
    } catch (logErr) {
      console.error('写入删除子项目错误日志失败:', logErr);
    }

    res.status(400).json({
      success: false,
      message: error.message || '删除子项目失败'
    });
  }
});

// 获取子项目统计信息
router.get('/:projectId/subprojects/stats', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    const stats = await SubprojectService.getSubprojectStats(projectId, userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取子项目统计失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取子项目统计失败'
    });
  }
});

// 获取项目树结构
router.get('/:projectId/tree', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    // 验证项目ID是否为有效数字
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        success: false,
        message: '无效的项目ID'
      });
    }

    const projectTree = await SubprojectService.getProjectTree(projectId, userId);

    res.json({
      success: true,
      data: projectTree
    });
  } catch (error) {
    console.error('获取项目树失败:', error);
    
    // 记录详细错误信息
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'api-errors.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] 获取项目树失败 - 项目ID: ${req.params.projectId}, 用户ID: 1, 错误: ${error.message}\n堆栈: ${error.stack}\n\n`;
    
    fs.appendFileSync(logFile, logEntry);
    
    res.status(500).json({
      success: false,
      message: error.message || '获取项目树失败'
    });
  }
});

module.exports = router;