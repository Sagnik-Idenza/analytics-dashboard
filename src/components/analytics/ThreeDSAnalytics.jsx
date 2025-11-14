import React from "react";
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts";
import ChartCard from "../ui/CardChart";

const COLORS = ["#2072c4ff", "#ffb300", "#e53935"]; 
// BYPASS = blue, ATTEMPT = yellow, FORCE = red

export default function ThreeDSAnalytics({ data, loading }) {
  if (!data) return null;

  return (
    <ChartCard title="3DS Authentication Summary" loading={loading}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            label
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
