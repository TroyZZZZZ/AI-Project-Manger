import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface ProjectStatsData {
  name: string
  total: number
  completed: number
  inProgress: number
  pending: number
}

export type { ProjectStatsData }

interface ProjectStatsChartProps {
  data: ProjectStatsData[]
  type?: 'bar' | 'pie'
  height?: number
}

const COLORS = {
  completed: '#10B981', // green-500
  inProgress: '#F59E0B', // amber-500
  pending: '#6B7280', // gray-500
  total: '#3B82F6' // blue-500
}

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

const ProjectStatsChart: React.FC<ProjectStatsChartProps> = ({
  data,
  type = 'bar',
  height = 300
}) => {
  // 为饼图准备数据
  const pieData = React.useMemo(() => {
    if (type !== 'pie' || !data.length) return []
    
    const totals = data.reduce(
      (acc, item) => ({
        completed: acc.completed + item.completed,
        inProgress: acc.inProgress + item.inProgress,
        pending: acc.pending + item.pending
      }),
      { completed: 0, inProgress: 0, pending: 0 }
    )
    
    return [
      { name: '已完成', value: totals.completed, color: COLORS.completed },
      { name: '进行中', value: totals.inProgress, color: COLORS.inProgress },
      { name: '待开始', value: totals.pending, color: COLORS.pending }
    ].filter(item => item.value > 0)
  }, [data, type])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const totalValue = pieData.reduce((sum, item) => sum + item.value, 0)
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium" style={{ color: data.payload.color }}>
            {data.name}: {data.value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            占比: {((data.value / totalValue) * 100).toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  if (type === 'pie') {
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              color: 'rgb(107, 114, 128)'
            }}
          />
          <Bar
            dataKey="completed"
            name="已完成"
            stackId="a"
            fill={COLORS.completed}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="inProgress"
            name="进行中"
            stackId="a"
            fill={COLORS.inProgress}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="pending"
            name="待开始"
            stackId="a"
            fill={COLORS.pending}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ProjectStatsChart