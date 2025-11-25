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

// Map risk level → consistent colors
const RISK_COLOR_MAP = {
  HIGH: "#EF4444",    // red
  MEDIUM: "#F59E0B",  // amber
  LOW: "#10B981",     // green
  UNKNOWN: "#9CA3AF", // gray
};

const DEFAULT_COLORS = ["#EF4444", "#F59E0B", "#10B981", "#9CA3AF"];

// Label using BACKEND percent, not Recharts' internal percent
const renderLabel = ({ name, payload }) => {
  const pct = payload?.percent;
  if (pct == null) return null;
  return `${name} (${pct.toFixed(2)}%)`;
};

// Custom tooltip
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0].payload;
  const pct = row.percent != null ? row.percent.toFixed(2) : "0.00";

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        padding: 8,
        fontSize: 12,
        borderRadius: 4,
        color: "#111827",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{row.name}</div>
      <div>{`${row.value} cases`}</div>
      <div style={{ color: "#6b7280" }}>{`${pct}%`}</div>
    </div>
  );
};

const RiskSummaryAnalytics = ({ data, loading }) => {
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="text-center py-4">
            <span style={{ fontSize: 12, color: "#6B7280" }}>
              Loading case risk summary…
            </span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 0 }}>
            No case risk data available for this period.
          </p>
        </Card.Body>
      </Card>
    );
  }

  // Normalize names + use backend percent + count
  const normalized = data.map((d) => {
    const raw = (d.name || "").toString().toUpperCase();
    const name =
      raw === "HIGH" || raw === "HIGH_RISK"
        ? "HIGH"
        : raw === "MEDIUM" || raw === "MED" || raw === "MEDIUM_RISK"
        ? "MEDIUM"
        : raw === "LOW" || raw === "LOW_RISK"
        ? "LOW"
        : "UNKNOWN";

    return {
      name,
      value: Number(d.value || 0),
      percent: d.percent != null ? Number(d.percent) : 0,
    };
  });

  const total = normalized.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <h6
            style={{
              fontWeight: 600,
              marginBottom: 0,
              fontSize: 14,
              color: "#111827",
            }}
          >
            Case Risk Summary
          </h6>
          <p
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginTop: 2,
              marginBottom: 0,
            }}
          >
            Distribution of cases classified as HIGH / MEDIUM / LOW. Total cases:{" "}
            <strong>{total}</strong>
          </p>
        </div>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={normalized}
                dataKey="value"
                nameKey="name"
                innerRadius="45%"
                outerRadius="80%"
                paddingAngle={2}
                labelLine={false}
                label={renderLabel}
              >
                {normalized.map((entry, index) => {
                  const color =
                    RISK_COLOR_MAP[entry.name] ||
                    DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: "#374151" }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RiskSummaryAnalytics;
