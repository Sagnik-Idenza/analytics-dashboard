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

// Correct label that uses BACKEND percent, not Recharts internal percent
const renderLabel = ({ name, payload }) => {
  const pct = payload?.percent;
  if (pct == null) return null;
  return `${name} (${pct.toFixed(2)}%)`;
};

// Custom tooltip showing backend counts + percent
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data) return null;

  const value = data.value || 0;
  const pct = data.percent != null ? data.percent.toFixed(2) : "0.00";

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        padding: 8,
        fontSize: 12,
        color: "#111827",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        borderRadius: 4,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.name}</div>
      <div>{`${value} events`}</div>
      <div style={{ color: "#6b7280" }}>{`${pct}%`}</div>
    </div>
  );
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

              <Tooltip content={<CustomTooltip />} />

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
