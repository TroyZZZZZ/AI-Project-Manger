import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

interface TaskDistributionData {
  name: string
  value: number
  color?: string
}

interface TaskDistributionChartProps {
  data: TaskDistributionData[]
  type?: 'pie' | 'donut' | 'bar'
  height?: number
  title?: string
}

const DEFAULT_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // purple-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#EC4899', // pink-500
  '#6B7280'  // gray-500
]

const STATUS_COLORS = {
  '待开始': '#6B7280',
  '进行中': '#F59E0B',
  '已完成': '#10B981',
  '已取消': '#EF4444',
  '暂停': '#8B5CF6'
}

const PRIORITY_COLORS = {
  '低': '#10B981',
  '中': '#F59E0B',
  '高': '#EF4444',
  '紧急': '#DC2626'
}

const TaskDistributionChart: React.FC<TaskDistributionChartProps> = ({
  data,
  type = 'pie',
  height = 300,
  title
}) => {
  // 为数据添加颜色
  const chartData = React.useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: item.color || 
             STATUS_COLORS[item.name as keyof typeof STATUS_COLORS] ||
             PRIORITY_COLORS[item.name as keyof typeof PRIORITY_COLORS] ||
             DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    }))
  }, [data])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const total = chartData.reduce((sum, item) => sum + item.value, 0)
      const percentage = ((data.value / total) * 100).toFixed(1)
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            数量: {data.value}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            占比: {percentage}%
          </p>
        </div>
      )
    }
    return null
  }

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {label}
          </p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            数量: {payload[0].value}
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null // 不显示小于5%的标签
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (type === 'bar') {
    return (
      <div className="w-full" style={{ height }}>
        {title && (
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">
            {title}
          </h3>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={<CustomBarTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const innerRadius = type === 'donut' ? 60 : 0

  return (
    <div className="w-full" style={{ height }}>
      {title && (
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={Math.min(height * 0.35, 120)}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{
              fontSize: '12px',
              color: 'rgb(107, 114, 128)'
            }}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {value} ({entry.payload.value})
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* 中心显示总数（仅环形图） */}
      {type === 'donut' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {chartData.reduce((sum, item) => sum + item.value, 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              总计
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskDistributionChart