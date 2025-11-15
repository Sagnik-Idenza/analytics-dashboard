// BIN Distribution Component
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import ChartCard from "../ui/CardChart";

const BAR_COLOR = "#2072c4ff"; // Bootstrap blue

export function BinDistribution({ data, loading }) {
  if (!data || data.length === 0) return null;

  return (
    <ChartCard title="💳 BIN Distribution" loading={loading}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="bin" type="category" width={90} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill={BAR_COLOR} name="Count" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
