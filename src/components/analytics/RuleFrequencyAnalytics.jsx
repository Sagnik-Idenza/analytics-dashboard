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
} from "recharts";
import ChartCard from "../ui/CardChart";

const RULE_COLOR = "#10B981"; // Tailwind green

// Truncate long rule names for axis labels
const truncateRuleName = (name, max = 24) => {
  if (!name) return "";
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
};

export function RuleFrequency({ data, loading }) {
  if (loading) {
    return (
      <ChartCard title="Rule Hits Frequency" loading={true}>
        <div className="text-center py-4">
          <span style={{ fontSize: 12, color: "#6B7280" }}>
            Loading rule frequency…
          </span>
        </div>
      </ChartCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartCard title="Rule Hits Frequency" loading={false}>
        <div className="text-center py-3">
          <span style={{ fontSize: 12, color: "#6B7280" }}>
            No rule hit data available for this period.
          </span>
        </div>
      </ChartCard>
    );
  }

  // Sort by count desc and take top 10
  const sorted = [...data]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10);

  // Attach truncated labels for the axis while keeping full names in tooltip
  const chartData = sorted.map((d) => ({
    ...d,
    label: truncateRuleName(d.rule),
  }));

  return (
    <ChartCard
      title="Rule Hits Frequency"
      subtitle="Top rules by number of hits in the selected period"
      loading={false}
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 16, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="label"
            angle={-35}
            textAnchor="end"
            height={70}
            interval={0}
            tick={{ fontSize: 11, fill: "#4B5563" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#4B5563" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value, name, props) => [
              `${value} hits`,
              props?.payload?.rule || "Rule",
            ]}
            labelFormatter={() => ""}
          />
          <Bar
            dataKey="count"
            fill={RULE_COLOR}
            name="Hits"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
