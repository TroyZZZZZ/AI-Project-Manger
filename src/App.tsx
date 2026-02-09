import React, { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAppStore } from './stores/useAppStore'

console.log('App.tsx: 组件开始加载')

function App() {
  console.log('App.tsx: App组件渲染开始')
  const { initializeApp } = useAppStore()

  useEffect(() => {
    console.log('App.tsx: useEffect 触发，开始初始化应用')
    initializeApp()
  }, [initializeApp])

  console.log('App.tsx: 返回RouterProvider')
  return <RouterProvider router={router} />
}

export default App
