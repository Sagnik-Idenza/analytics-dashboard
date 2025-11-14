import React from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import StatCard from '../ui/StatCard';
import ChartCard from '../ui/CardChart';
const VampAnalytics = ({ data, loading }) => {
  if (!data) return null;

  return (
    <>
      {/* VAMP Stat */}
      <StatCard
        icon={TrendingUp}
        title="Total Transactions"
        value={data.denom_txn_count}
        subtitle={`Refund Rate: ${data.refund_rate.toFixed(1)}%`}
        color="from-purple-500 to-purple-600"
      />

      {/* VAMP Chart */}
      <ChartCard title="💳 VAMP Transactions vs Refunds" loading={loading}>
        {data && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
};

export default VampAnalytics;
