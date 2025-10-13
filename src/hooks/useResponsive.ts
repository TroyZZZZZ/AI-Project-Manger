import { useState, useEffect } from 'react'

// 定义断点
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

type Breakpoint = keyof typeof breakpoints

interface ResponsiveState {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  breakpoint: Breakpoint | 'xs'
}

/**
 * 响应式Hook，提供屏幕尺寸和断点信息
 */
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        breakpoint: 'lg' as const
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight

    return {
      width,
      height,
      isMobile: width < breakpoints.md,
      isTablet: width >= breakpoints.md && width < breakpoints.lg,
      isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
      isLargeDesktop: width >= breakpoints.xl,
      breakpoint: getBreakpoint(width)
    }
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setState({
        width,
        height,
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
        isLargeDesktop: width >= breakpoints.xl,
        breakpoint: getBreakpoint(width)
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return state
}

/**
 * 获取当前断点
 */
function getBreakpoint(width: number): Breakpoint | 'xs' {
  if (width >= breakpoints['2xl']) return '2xl'
  if (width >= breakpoints.xl) return 'xl'
  if (width >= breakpoints.lg) return 'lg'
  if (width >= breakpoints.md) return 'md'
  if (width >= breakpoints.sm) return 'sm'
  return 'xs'
}

/**
 * 检查是否匹配指定断点
 */
export const useBreakpoint = (breakpoint: Breakpoint | 'xs'): boolean => {
  const { breakpoint: current } = useResponsive()
  
  const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
  const currentIndex = breakpointOrder.indexOf(current)
  const targetIndex = breakpointOrder.indexOf(breakpoint)
  
  return currentIndex >= targetIndex
}

/**
 * 响应式值Hook，根据断点返回不同的值
 */
export const useResponsiveValue = <T>(
  values: Partial<Record<Breakpoint | 'xs', T>>
): T | undefined => {
  const { breakpoint } = useResponsive()
  
  // 按优先级查找值
  const breakpointOrder: (Breakpoint | 'xs')[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = breakpointOrder.indexOf(breakpoint)
  
  // 从当前断点开始，向下查找可用的值
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i]
    if (values[bp] !== undefined) {
      return values[bp]
    }
  }
  
  return undefined
}

/**
 * 媒体查询Hook
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

/**
 * 预定义的媒体查询
 */
export const usePresetMediaQueries = () => {
  return {
    isMobile: useMediaQuery(`(max-width: ${breakpoints.md - 1}px)`),
    isTablet: useMediaQuery(`(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`),
    isDesktop: useMediaQuery(`(min-width: ${breakpoints.lg}px)`),
    isLargeScreen: useMediaQuery(`(min-width: ${breakpoints.xl}px)`),
    isPortrait: useMediaQuery('(orientation: portrait)'),
    isLandscape: useMediaQuery('(orientation: landscape)'),
    prefersReducedMotion: useMediaQuery('(prefers-reduced-motion: reduce)'),
    prefersDarkMode: useMediaQuery('(prefers-color-scheme: dark)')
  }
}

/**
 * 容器查询Hook（实验性功能）
 */
export const useContainerQuery = (containerRef: React.RefObject<HTMLElement>, query: string) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        
        // 简单的容器查询解析（可以扩展）
        if (query.includes('min-width')) {
          const minWidth = parseInt(query.match(/min-width:\s*(\d+)px/)?.[1] || '0')
          setMatches(width >= minWidth)
        } else if (query.includes('max-width')) {
          const maxWidth = parseInt(query.match(/max-width:\s*(\d+)px/)?.[1] || '0')
          setMatches(width <= maxWidth)
        }
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, query])

  return matches
}

export default useResponsive