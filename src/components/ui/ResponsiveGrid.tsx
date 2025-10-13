import React from 'react'
import { cn } from '../../utils/cn'
import { useResponsive } from '../../hooks/useResponsive'

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  // 响应式列数配置
  cols?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  // 响应式间距配置
  gap?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  // 最小列宽（auto-fit模式）
  minColWidth?: string
  // 是否使用auto-fit
  autoFit?: boolean
}

interface ResponsiveGridItemProps {
  children: React.ReactNode
  className?: string
  // 响应式跨列配置
  span?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  // 响应式跨行配置
  rowSpan?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
}

/**
 * 响应式网格容器
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
  gap = { xs: 4, sm: 4, md: 6, lg: 6, xl: 8, '2xl': 8 },
  minColWidth = '250px',
  autoFit = false
}) => {
  const { breakpoint } = useResponsive()

  // 获取当前断点的列数
  const getCurrentCols = () => {
    const breakpointOrder = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'] as const
    const currentIndex = breakpointOrder.indexOf(breakpoint === 'xs' ? 'xs' : breakpoint)
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i]
      if (cols[bp] !== undefined) {
        return cols[bp]
      }
    }
    return 1
  }

  // 获取当前断点的间距
  const getCurrentGap = () => {
    const breakpointOrder = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'] as const
    const currentIndex = breakpointOrder.indexOf(breakpoint === 'xs' ? 'xs' : breakpoint)
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i]
      if (gap[bp] !== undefined) {
        return gap[bp]
      }
    }
    return 4
  }

  const currentCols = getCurrentCols()
  const currentGap = getCurrentGap()

  const gridStyle: React.CSSProperties = autoFit
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}, 1fr))`,
        gap: `${currentGap * 0.25}rem`
      }
    : {
        display: 'grid',
        gridTemplateColumns: `repeat(${currentCols}, 1fr)`,
        gap: `${currentGap * 0.25}rem`
      }

  return (
    <div
      className={cn('w-full', className)}
      style={gridStyle}
    >
      {children}
    </div>
  )
}

/**
 * 响应式网格项
 */
export const ResponsiveGridItem: React.FC<ResponsiveGridItemProps> = ({
  children,
  className,
  span,
  rowSpan
}) => {
  const { breakpoint } = useResponsive()

  // 获取当前断点的跨列数
  const getCurrentSpan = () => {
    if (!span) return undefined
    
    const breakpointOrder = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'] as const
    const currentIndex = breakpointOrder.indexOf(breakpoint === 'xs' ? 'xs' : breakpoint)
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i]
      if (span[bp] !== undefined) {
        return span[bp]
      }
    }
    return undefined
  }

  // 获取当前断点的跨行数
  const getCurrentRowSpan = () => {
    if (!rowSpan) return undefined
    
    const breakpointOrder = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'] as const
    const currentIndex = breakpointOrder.indexOf(breakpoint === 'xs' ? 'xs' : breakpoint)
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i]
      if (rowSpan[bp] !== undefined) {
        return rowSpan[bp]
      }
    }
    return undefined
  }

  const currentSpan = getCurrentSpan()
  const currentRowSpan = getCurrentRowSpan()

  const itemStyle: React.CSSProperties = {
    gridColumn: currentSpan ? `span ${currentSpan}` : undefined,
    gridRow: currentRowSpan ? `span ${currentRowSpan}` : undefined
  }

  return (
    <div
      className={cn('w-full', className)}
      style={itemStyle}
    >
      {children}
    </div>
  )
}

/**
 * 响应式Flex容器
 */
interface ResponsiveFlexProps {
  children: React.ReactNode
  className?: string
  // 响应式方向配置
  direction?: {
    xs?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    sm?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    md?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    lg?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    xl?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    '2xl'?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  }
  // 响应式对齐配置
  justify?: {
    xs?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
    sm?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
    md?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
    lg?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
    xl?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
    '2xl'?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  }
  // 响应式项目对齐配置
  align?: {
    xs?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
    sm?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
    md?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
    lg?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
    xl?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
    '2xl'?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  }
  // 响应式间距配置
  gap?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  // 是否换行
  wrap?: boolean
}

export const ResponsiveFlex: React.FC<ResponsiveFlexProps> = ({
  children,
  className,
  direction = { xs: 'column', md: 'row' },
  justify = { xs: 'start' },
  align = { xs: 'stretch' },
  gap = { xs: 4 },
  wrap = false
}) => {
  const { breakpoint } = useResponsive()

  const getValue = <T,>(config: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', T>>) => {
    const breakpointOrder = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'] as const
    const currentIndex = breakpointOrder.indexOf(breakpoint === 'xs' ? 'xs' : breakpoint)
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i]
      if (config[bp] !== undefined) {
        return config[bp]
      }
    }
    return undefined
  }

  const currentDirection = getValue(direction) || 'row'
  const currentJustify = getValue(justify) || 'start'
  const currentAlign = getValue(align) || 'stretch'
  const currentGap = getValue(gap) || 4

  const flexClasses = cn(
    'flex',
    {
      'flex-row': currentDirection === 'row',
      'flex-col': currentDirection === 'column',
      'flex-row-reverse': currentDirection === 'row-reverse',
      'flex-col-reverse': currentDirection === 'column-reverse',
      'justify-start': currentJustify === 'start',
      'justify-end': currentJustify === 'end',
      'justify-center': currentJustify === 'center',
      'justify-between': currentJustify === 'between',
      'justify-around': currentJustify === 'around',
      'justify-evenly': currentJustify === 'evenly',
      'items-start': currentAlign === 'start',
      'items-end': currentAlign === 'end',
      'items-center': currentAlign === 'center',
      'items-baseline': currentAlign === 'baseline',
      'items-stretch': currentAlign === 'stretch',
      'flex-wrap': wrap
    },
    className
  )

  return (
    <div
      className={flexClasses}
      style={{ gap: `${currentGap * 0.25}rem` }}
    >
      {children}
    </div>
  )
}

export default ResponsiveGrid