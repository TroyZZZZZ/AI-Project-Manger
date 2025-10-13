const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

class JWTService {
  constructor() {
    this.secret = JWT_SECRET;
    this.expiresIn = JWT_EXPIRES_IN;
    this.refreshExpiresIn = JWT_REFRESH_EXPIRES_IN;
  }

  // 生成访问令牌
  generateAccessToken(payload) {
    try {
      return jwt.sign(
        {
          ...payload,
          type: 'access'
        },
        this.secret,
        {
          expiresIn: this.expiresIn,
          issuer: 'project-management-system',
          audience: 'project-management-users'
        }
      );
    } catch (error) {
      console.error('生成访问令牌错误:', error);
      throw new Error('生成访问令牌失败');
    }
  }

  // 生成刷新令牌
  generateRefreshToken(payload) {
    try {
      return jwt.sign(
        {
          userId: payload.userId,
          type: 'refresh'
        },
        this.secret,
        {
          expiresIn: this.refreshExpiresIn,
          issuer: 'project-management-system',
          audience: 'project-management-users'
        }
      );
    } catch (error) {
      console.error('生成刷新令牌错误:', error);
      throw new Error('生成刷新令牌失败');
    }
  }

  // 生成令牌对
  generateTokenPair(payload) {
    try {
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);
      
      return {
        accessToken,
        refreshToken,
        expiresIn: this.expiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      console.error('生成令牌对错误:', error);
      throw new Error('生成令牌对失败');
    }
  }

  // 验证令牌
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'project-management-system',
        audience: 'project-management-users'
      });
      
      return {
        success: true,
        payload: decoded
      };
    } catch (error) {
      console.error('验证令牌错误:', error);
      
      let message = '令牌验证失败';
      if (error.name === 'TokenExpiredError') {
        message = '令牌已过期';
      } else if (error.name === 'JsonWebTokenError') {
        message = '无效的令牌';
      } else if (error.name === 'NotBeforeError') {
        message = '令牌尚未生效';
      }
      
      return {
        success: false,
        error: error.name,
        message
      };
    }
  }

  // 解码令牌（不验证）
  decodeToken(token) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      return {
        success: true,
        payload: decoded
      };
    } catch (error) {
      console.error('解码令牌错误:', error);
      return {
        success: false,
        message: '令牌解码失败'
      };
    }
  }

  // 刷新访问令牌
  refreshAccessToken(refreshToken) {
    try {
      const verifyResult = this.verifyToken(refreshToken);
      
      if (!verifyResult.success) {
        return verifyResult;
      }
      
      const { payload } = verifyResult;
      
      // 检查是否为刷新令牌
      if (payload.type !== 'refresh') {
        return {
          success: false,
          message: '无效的刷新令牌'
        };
      }
      
      // 生成新的访问令牌
      const newAccessToken = this.generateAccessToken({
        userId: payload.userId
      });
      
      return {
        success: true,
        accessToken: newAccessToken,
        expiresIn: this.expiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      console.error('刷新访问令牌错误:', error);
      return {
        success: false,
        message: '刷新令牌失败'
      };
    }
  }

  // 获取令牌剩余时间
  getTokenRemainingTime(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return {
          success: false,
          message: '无效的令牌'
        };
      }
      
      const now = Math.floor(Date.now() / 1000);
      const remainingTime = decoded.exp - now;
      
      return {
        success: true,
        remainingTime: Math.max(0, remainingTime),
        expired: remainingTime <= 0
      };
    } catch (error) {
      console.error('获取令牌剩余时间错误:', error);
      return {
        success: false,
        message: '获取令牌剩余时间失败'
      };
    }
  }

  // 检查令牌是否即将过期
  isTokenExpiringSoon(token, thresholdMinutes = 30) {
    try {
      const result = this.getTokenRemainingTime(token);
      if (!result.success) {
        return result;
      }
      
      const thresholdSeconds = thresholdMinutes * 60;
      const isExpiringSoon = result.remainingTime <= thresholdSeconds;
      
      return {
        success: true,
        isExpiringSoon,
        remainingTime: result.remainingTime
      };
    } catch (error) {
      console.error('检查令牌过期时间错误:', error);
      return {
        success: false,
        message: '检查令牌过期时间失败'
      };
    }
  }

  // 生成密码重置令牌
  generatePasswordResetToken(userId, email) {
    try {
      return jwt.sign(
        {
          userId,
          email,
          type: 'password_reset'
        },
        this.secret,
        {
          expiresIn: '1h', // 密码重置令牌1小时过期
          issuer: 'project-management-system',
          audience: 'project-management-users'
        }
      );
    } catch (error) {
      console.error('生成密码重置令牌错误:', error);
      throw new Error('生成密码重置令牌失败');
    }
  }

  // 验证密码重置令牌
  verifyPasswordResetToken(token) {
    try {
      const verifyResult = this.verifyToken(token);
      
      if (!verifyResult.success) {
        return verifyResult;
      }
      
      const { payload } = verifyResult;
      
      // 检查是否为密码重置令牌
      if (payload.type !== 'password_reset') {
        return {
          success: false,
          message: '无效的密码重置令牌'
        };
      }
      
      return {
        success: true,
        userId: payload.userId,
        email: payload.email
      };
    } catch (error) {
      console.error('验证密码重置令牌错误:', error);
      return {
        success: false,
        message: '验证密码重置令牌失败'
      };
    }
  }
}

// 创建JWT服务实例
const jwtService = new JWTService();

module.exports = { jwtService, JWTService };