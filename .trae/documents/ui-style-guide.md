# 全系统 UI 样式规范（极简风格）

## 颜色方案
- 主背景：`#FFFFFF`
- 文字主色：`#000000`
- 边框主色：`#000000`
- 次要文字：`#6B7280`（灰）

CSS 变量（index.css）
- `--color-bg`: `#ffffff`
- `--color-text`: `#000000`
- `--color-border`: `#000000`
- `--color-muted`: `#6b7280`

## 间距系统
- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 12px
- `--spacing-lg`: 16px
- `--spacing-xl`: 24px

## 字体规范
- 字体族：系统字体栈（index.css 已设定）
- 行高：1.5
- 字重：常规 400；标题根据页面保持 600-700（Tailwind `font-semibold`）

## 组件样式

### 按钮（Button）
- 基础：透明背景、黑色文字、1px 黑色边框
- 交互：`hover:bg-black hover:text-white transition-colors`
- 类名（index.css @layer components）：
  - `.btn` 基础按钮
  - `.btn-xs`/`.btn-sm`/`.btn-md`/`.btn-lg` 尺寸
- UI 组件库（src/components/ui/button.tsx）统一默认变体：
  - `default`/`outline`/`secondary`：`border border-black bg-transparent text-black hover:bg-black hover:text-white`
  - `focus ring`：`focus-visible:ring-black`

示例：
```
<button class="btn btn-md">操作</button>
```

### 输入框（Input）
- 边框：1px 黑色
- 背景：白色
- 文字：黑色；占位符灰色
- 交互：`focus-visible:ring-black`
- 组件实现：`src/components/ui/input.tsx`

示例：
```
<Input className="field" />
```

### 卡片（Card）
- 边框：1px 黑色
- 背景：白色
- 内边距：`p-4`
- 类名：`.card`

### 标签与标题
- 标签（Label）：`text-sm font-medium`
- 标题（DialogTitle/页面标题）：`text-lg font-semibold`

## 布局规范
- 右侧内容区域使用 `w-full` 宽度容器，无 `max-w-*` 限制
- 保留最小安全边距：移动端 `px-2`，桌面端 `px-4`
- 位置：`src/components/Layout.tsx`

## 使用场景说明
- 列表页、详情页、对话框内操作统一使用 `.btn` 系列作为交互入口；删除、完成、编辑等操作只区分文案，不区分颜色，以交互反馈作为状态提示。
- 表单输入统一使用 `Input`（黑色边框），避免彩色边框或阴影。
- 信息展示统一使用卡片 `.card` 包裹（当需要逻辑分组时）。

## 代码示例
```
<div class="card">
  <div class="text-sm text-gray-700">跟进记录</div>
  <div class="mt-2">
    <button class="btn btn-xs">编辑</button>
    <button class="btn btn-xs">删除</button>
    <button class="btn btn-xs">标记完成</button>
  </div>
  <Input className="field" placeholder="请输入..." />
  <Label>事件发生时间</Label>
  <Input type="date" className="field" />
 </div>
```

