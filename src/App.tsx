import React, { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAppStore } from './stores/useAppStore'

function App() {
  const { theme, initializeApp } = useAppStore()

  useEffect(() => {
    // 初始化应用
    initializeApp()
    
    // 应用主题
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme, initializeApp])

  return (
    <div className={theme}>
      <RouterProvider router={router} />
    </div>
  )
}

export default App
