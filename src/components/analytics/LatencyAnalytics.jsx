import React from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';
import StatCard from '../ui/StatCard';
import ChartCard from '../ui/CardChart';

const LatencyAnalytics = ({ data, loading }) => {
  if (!data) return null;

  return (
    <>
      <StatCard
        icon={Clock}
        title="Avg Latency"
        value={`${data.stats.average.toFixed(4)}`}
        subtitle="minutes"
        color="from-indigo-500 to-indigo-600"
      />

      <ChartCard title="⏱️ Scoring → Deposit Latency" loading={loading}>
        <div className="mb-4">
          <div className="flex gap-6 text-sm text-gray-600 mb-4">
            <span>Min: {data.stats.minimum.toFixed(4)} min</span>
            <span>Avg: {data.stats.average.toFixed(4)} min</span>
            <span>Max: {data.stats.maximum.toFixed(4)} min</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="order_key" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="#667eea"
                strokeWidth={2}
                dot={{ fill: '#667eea', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </>
  );
};

export default LatencyAnalytics;
