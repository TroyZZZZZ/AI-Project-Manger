# 样式迁移检查清单（极简统一）

## 范围
- 全系统页面与组件（按钮、输入框、卡片、对话框、标签）

## 清单
- 布局
  - [x] 右侧内容区域 `w-full`，移除 `max-w-*` 与多余外边距
  - [x] 最小安全边距：移动 `px-2`，桌面 `px-4`
  - 位置：`src/components/Layout.tsx`

- 按钮
  - [x] UI 组件库 `button.tsx` 默认样式统一为黑边框透明背景
  - [x] 交互反馈统一：`hover:bg-black hover:text-white`
  - [x] 页面内自定义按钮类名替换为统一风格（StoryDetailPage）

- 输入框
  - [x] 黑色边框、白色背景、黑色文字、灰色占位符
  - [x] 聚焦 `ring-black`
  - 位置：`src/components/ui/input.tsx`

- 卡片
  - [x] 使用 `.card`（`@layer components`）统一边框与背景
  - [ ] 将分散的 `border p-* bg-white` 替换为 `.card`（逐页推进）

- 对话框
  - [x] 内容卡片保持白色背景与边框（按需）

- 图标
  - [x] 移除详情页图标（保持纯文本）
  - [ ] 其他页面图标按需逐步移除（统一规范）

- 记录操作区
  - [x] 按钮顺序：编辑 → 删除 → 标记完成（未完成）/ 修改备注（已完成）

## 统一类名与变量
- 变量：`index.css :root`
- 组件层：`index.css @layer components`
- 类名：`.btn`, `.btn-xs`, `.btn-sm`, `.btn-md`, `.btn-lg`, `.card`, `.field`

## 验证
- [x] 编译检查（TypeScript）
- [x] 运行检查（Vite HMR）
- [x] 样式回归：按钮样式统一、交互一致、布局全宽

## 备注
- 保守迁移策略：优先统一 Button/Input，其余组件按页面推进；避免一次性大改影响功能逻辑。

