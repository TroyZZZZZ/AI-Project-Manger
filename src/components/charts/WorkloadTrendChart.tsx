import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface WorkloadTrendData {
  date: string
  planned: number
  actual: number
  completed: number
  efficiency?: number
}

interface WorkloadTrendChartProps {
  data: WorkloadTrendData[]
  type?: 'line' | 'area'
  height?: number
  showEfficiency?: boolean
}

const COLORS = {
  planned: '#3B82F6', // blue-500
  actual: '#F59E0B', // amber-500
  completed: '#10B981', // green-500
  efficiency: '#8B5CF6' // purple-500
}

const WorkloadTrendChart: React.FC<WorkloadTrendChartProps> = ({
  data,
  type = 'line',
  height = 300,
  showEfficiency = false
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => {
            const value = entry.dataKey === 'efficiency' 
              ? `${entry.value}%` 
              : `${entry.value}h`
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {value}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  const formatXAxisLabel = (tickItem: string) => {
    const date = new Date(tickItem)
    return date.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (type === 'area') {
    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
              dataKey="date"
              tickFormatter={formatXAxisLabel}
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              yAxisId="hours"
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              label={{ 
                value: '工时 (h)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            {showEfficiency && (
              <YAxis
                yAxisId="efficiency"
                orientation="right"
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                label={{ 
                  value: '效率 (%)', 
                  angle: 90, 
                  position: 'insideRight',
                  style: { textAnchor: 'middle' }
                }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                color: 'rgb(107, 114, 128)'
              }}
            />
            <Area
              yAxisId="hours"
              type="monotone"
              dataKey="planned"
              name="计划工时"
              stackId="1"
              stroke={COLORS.planned}
              fill={COLORS.planned}
              fillOpacity={0.3}
            />
            <Area
              yAxisId="hours"
              type="monotone"
              dataKey="actual"
              name="实际工时"
              stackId="2"
              stroke={COLORS.actual}
              fill={COLORS.actual}
              fillOpacity={0.3}
            />
            <Area
              yAxisId="hours"
              type="monotone"
              dataKey="completed"
              name="完成工时"
              stackId="3"
              stroke={COLORS.completed}
              fill={COLORS.completed}
              fillOpacity={0.3}
            />
            {showEfficiency && (
              <Line
                yAxisId="efficiency"
                type="monotone"
                dataKey="efficiency"
                name="工作效率"
                stroke={COLORS.efficiency}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
            dataKey="date"
            tickFormatter={formatXAxisLabel}
            tick={{ fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis
            yAxisId="hours"
            tick={{ fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
            label={{ 
              value: '工时 (h)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          {showEfficiency && (
            <YAxis
              yAxisId="efficiency"
              orientation="right"
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              label={{ 
                value: '效率 (%)', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle' }
              }}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              color: 'rgb(107, 114, 128)'
            }}
          />
          <Line
            yAxisId="hours"
            type="monotone"
            dataKey="planned"
            name="计划工时"
            stroke={COLORS.planned}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="hours"
            type="monotone"
            dataKey="actual"
            name="实际工时"
            stroke={COLORS.actual}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="hours"
            type="monotone"
            dataKey="completed"
            name="完成工时"
            stroke={COLORS.completed}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          {showEfficiency && (
            <Line
              yAxisId="efficiency"
              type="monotone"
              dataKey="efficiency"
              name="工作效率"
              stroke={COLORS.efficiency}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WorkloadTrendChart