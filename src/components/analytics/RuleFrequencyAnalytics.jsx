// Rule Frequency Component
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

const RULE_COLOR = "#10b981"; // Tailwind green

export function RuleFrequency({ data, loading }) {
  if (!data || data.length === 0) return null;

  return (
    <ChartCard title="🔎 Rule Hits Frequency" loading={loading}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="rule"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill={RULE_COLOR} name="Hits" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
