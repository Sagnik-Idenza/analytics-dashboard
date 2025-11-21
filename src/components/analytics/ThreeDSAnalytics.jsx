import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "react-bootstrap";

// Map bucket names → consistent colors
const COLOR_MAP = {
  "Force 3DS": "#EF4444",   // red
  "Prefer 3DS": "#3B82F6",  // blue
  "Bypass 3DS": "#10B981",  // green
  "Other 3DS": "#9CA3AF",   // gray
};

const DEFAULT_COLORS = ["#3B82F6", "#10B981", "#F97316", "#6366F1", "#9CA3AF"];

// Label inside donut slices: "Force 3DS (25%)"
const renderLabel = (props) => {
  const { name, value, percent } = props;
  if (!value) return null;
  const pct = (percent * 100).toFixed(0);
  return `${name} (${pct}%)`;
};

const ThreeDSAnalytics = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="text-center py-4">
        <span style={{ fontSize: 12, color: "#6B7280" }}>Loading 3DS data…</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 0 }}>
            No 3DS policy data available for this period.
          </p>
        </Card.Body>
      </Card>
    );
  }

  // Total count for tooltips / percentages
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <div style={{ marginBottom: 8 }}>
          <h6 style={{ fontWeight: 600, marginBottom: 4 }}>
            3DS Outcomes &amp; Policy Levels
          </h6>
          <p
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginTop: 0,
              marginBottom: 0,
            }}
          >
            Force / Prefer / Bypass 3DS policy buckets plus other gateway 3DS
            results. Total events: <strong>{total}</strong>
          </p>
        </div>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="45%"   // donut effect
                outerRadius="80%"
                paddingAngle={2}
                labelLine={false}
                label={renderLabel}
              >
                {data.map((entry, index) => {
                  const name = entry.name || "";
                  const color =
                    COLOR_MAP[name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>

              <Tooltip
                formatter={(value, name) => [
                  `${value} events`,
                  name,
                ]}
                contentStyle={{
                  fontSize: 12,
                }}
              />

              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: "#374151" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ThreeDSAnalytics;
