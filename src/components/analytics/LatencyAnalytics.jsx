import React from "react";
import { Card } from "react-bootstrap";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Format ms nicely for axis/tooltip
const formatLatencyMs = (ms) => {
  const v = Number(ms);
  if (!Number.isFinite(v)) return "-";

  if (v < 1000) return `${v.toFixed(0)} ms`;

  const sec = v / 1000;
  if (sec < 60) return `${sec.toFixed(2)} sec`;

  const min = sec / 60;
  return `${min.toFixed(2)} min`;
};

const LatencyAnalytics = ({ data, loading }) => {
  if (loading) {
    return null; // outer card shows a spinner already
  }

  if (!data || !data.chartData || data.chartData.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#6B7280" }}>
        No latency data available.
      </div>
    );
  }

  const { stats, chartData } = data;

  return (
    <div>
      {/* Small stat row inside card */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          fontSize: 12,
          marginBottom: 8,
          color: "#4B5563",
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong>Avg:</strong>{" "}
          {formatLatencyMs(stats.average * 60_000 /* min → ms */)}
        </div>
        <div>
          <strong>Min:</strong>{" "}
          {formatLatencyMs(stats.minimum * 60_000 /* min → ms */)}
        </div>
        <div>
          <strong>Max:</strong>{" "}
          {formatLatencyMs(stats.maximum * 60_000 /* min → ms */)}
        </div>
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="index"
              tickFormatter={(i) => `#${i + 1}`}
              fontSize={11}
            />
            <YAxis
              tickFormatter={formatLatencyMs}
              fontSize={11}
            />
            <Tooltip
              formatter={(value) => formatLatencyMs(value)}
              labelFormatter={(label, payload) => {
                const p = payload && payload[0];
                return p && p.payload && p.payload.order_key
                  ? `Order ${p.payload.order_key}`
                  : `Point #${label + 1}`;
              }}
            />
            <Line
              type="monotone"
              dataKey="valueMs"
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LatencyAnalytics;