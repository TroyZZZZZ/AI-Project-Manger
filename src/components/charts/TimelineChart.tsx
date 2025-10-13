import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TimelineData {
  date: string
  progress: number
  planned?: number
  milestone?: string
  tasks?: number
}

interface TimelineChartProps {
  data: TimelineData[]
  height?: number
  showPlanned?: boolean
  showMilestones?: boolean
  title?: string
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  data,
  height = 400,
  showPlanned = true,
  showMilestones = true,
  title
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {format(parseISO(label), 'yyyy年MM月dd日', { locale: zhCN })}
          </p>
          
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {entry.name === 'progress' ? '实际进度' : '计划进度'}: {entry.value}%
              </span>
            </div>
          ))}
          
          {data.milestone && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                🎯 {data.milestone}
              </p>
            </div>
          )}
          
          {data.tasks && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              完成任务: {data.tasks} 个
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    
    if (payload.milestone) {
      return (
        <Dot
          cx={cx}
          cy={cy}
          r={6}
          fill="#3B82F6"
          stroke="#ffffff"
          strokeWidth={2}
        />
      )
    }
    
    return null
  }

  const formatXAxisLabel = (tickItem: string) => {
    try {
      return format(parseISO(tickItem), 'MM/dd', { locale: zhCN })
    } catch {
      return tickItem
    }
  }

  const formatYAxisLabel = (value: number) => `${value}%`

  // 计算进度差异
  const dataWithDiff = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      diff: item.planned ? item.progress - item.planned : 0
    }))
  }, [data])

  // 获取当前日期线
  const today = new Date().toISOString().split('T')[0]
  const showTodayLine = data.some(item => item.date <= today)

  return (
    <div className="w-full" style={{ height }}>
      {title && (
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">
          {title}
        </h3>
      )}
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={dataWithDiff}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="opacity-30"
            stroke="#E5E7EB"
          />
          
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisLabel}
            tick={{ fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
            interval="preserveStartEnd"
          />
          
          <YAxis
            domain={[0, 100]}
            tickFormatter={formatYAxisLabel}
            tick={{ fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* 今日参考线 */}
          {showTodayLine && (
            <ReferenceLine
              x={today}
              stroke="#EF4444"
              strokeDasharray="5 5"
              label={{
                value: "今日",
                position: "top",
                style: { 
                  fontSize: '12px', 
                  fill: '#EF4444',
                  fontWeight: 'bold'
                }
              }}
            />
          )}
          
          {/* 100%参考线 */}
          <ReferenceLine
            y={100}
            stroke="#10B981"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          
          {/* 实际进度线 */}
          <Line
            type="monotone"
            dataKey="progress"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={showMilestones ? <CustomDot /> : { fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6, fill: '#3B82F6' }}
            name="progress"
          />
          
          {/* 计划进度线 */}
          {showPlanned && (
            <Line
              type="monotone"
              dataKey="planned"
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="planned"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {/* 图例和统计信息 */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">实际进度</span>
        </div>
        
        {showPlanned && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gray-400 border-dashed border-t-2 border-gray-400"></div>
            <span className="text-gray-600 dark:text-gray-400">计划进度</span>
          </div>
        )}
        
        {showMilestones && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
            <span className="text-gray-600 dark:text-gray-400">里程碑</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-500 border-dashed border-t-2 border-red-500"></div>
          <span className="text-gray-600 dark:text-gray-400">今日</span>
        </div>
      </div>
      
      {/* 进度摘要 */}
      {data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {data[data.length - 1]?.progress || 0}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">当前进度</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {data.filter(item => item.milestone).length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">里程碑</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {data.reduce((sum, item) => sum + (item.tasks || 0), 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">完成任务</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {data.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">记录天数</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimelineChart