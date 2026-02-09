import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('main.tsx: 开始执行')

const rootElement = document.getElementById('root')
if (rootElement) {
  console.log('main.tsx: 找到root元素，开始创建React根')
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  console.log('main.tsx: React应用渲染完成')
} else {
  console.error('main.tsx: 找不到root元素')
}
