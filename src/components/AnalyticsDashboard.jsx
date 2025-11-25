import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Container, Row, Col, Button, Card, Spinner } from "react-bootstrap";

import VampAnalytics from "./analytics/VampAnalytics";
import OrdersAnalytics from "./analytics/OrdersAnalytics";
import LatencyAnalytics from "./analytics/LatencyAnalytics";
import RiskSummaryAnalytics from "./analytics/RiskSummaryAnalytics";
import ThreeDSAnalytics from "./analytics/ThreeDSAnalytics";
import { BinDistribution } from "./analytics/BinDistributionAnalytics";
import { RuleFrequency } from "./analytics/RuleFrequencyAnalytics";

const DEFAULT_API_BASE = "http://159.89.39.60:8080/analytics";
// const DEFAULT_API_BASE = "https://coral-app-2-4y6qg.ondigitalocean.app/analytics";
const DEFAULT_SUBSCRIBER_ID = 1;
const EXCLUDE_DEV = false;
const REFRESH_INTERVAL = 960000;

// 👇 Add this:
const SUBSCRIBER_LABEL = "CasinoKai • Fyntek";

// NEW Enterprise KPI Card
const KpiCard = ({ label, value, sublabel, icon, accent }) => (
  <div
    style={{
      background: "rgba(255,255,255,0.65)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      borderRadius: "14px",
      padding: "20px 24px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      border: "1px solid rgba(255,255,255,0.4)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      cursor: "default",
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = "translateY(-3px)";
      e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.12)";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = "translateY(0px)";
      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)";
    }}
  >
    {/* Top row: icon + label */}
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "10px",
          backgroundColor: accent || "#3B82F6",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#FFF",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: 13,
          color: "#475569",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>

    {/* Metric number */}
    <div
      style={{
        fontSize: 32,
        fontWeight: 700,
        marginTop: 10,
        marginBottom: 4,
        color: "#0F172A",
      }}
    >
      {value}
    </div>

    {/* Sublabel */}
    {sublabel && (
      <div style={{ fontSize: 12, color: "#64748B" }}>{sublabel}</div>
    )}
  </div>
);

// Convert minutes → nice string (ms / sec / min)
const formatLatencyFromMinutes = (valueInMinutes) => {
  const v = Number(valueInMinutes);
  if (!Number.isFinite(v)) return "-";

  const ms = v * 60_000; // minutes → ms

  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }

  const sec = ms / 1000;
  if (sec < 60) {
    return `${sec.toFixed(2)} sec`;
  }

  const min = sec / 60;
  return `${min.toFixed(2)} min`;
};

// Helper: map raw three_ds values into buckets
function bucketThreeDSLevel(raw) {
  if (raw === null || raw === undefined) return "NOT_ATTEMPTED";

  const value = raw.toString().trim();
  if (!value || value === "N/A" || value.toLowerCase() === "none") {
    return "NOT_ATTEMPTED";
  }

  const lower = value.toLowerCase();

  if (lower.includes("friction")) return "FRICTIONLESS";
  if (lower.includes("chall")) return "CHALLENGED"; // challenge, challenged, challenge_required, etc.
  if (
    lower.includes("fail") ||
    lower.includes("denied") ||
    lower.includes("declin")
  )
    return "FAILED";
  if (
    lower.includes("no_3ds") ||
    lower.includes("no-3ds") ||
    lower.includes("bypass")
  )
    return "NOT_ATTEMPTED";
  if (lower === "a" || lower.includes("attempt")) return "NOT_ATTEMPTED";

  return "OTHER";
}

// Generic normalizer: handle Grafana-style and object-list responses
export const normalizeLevelCountRows = (result, levelKeys, valueKeys) => {
  if (!result || !result.data) return [];

  return result.data.map((row) => {
    const level = row[levelKeys[0]] ?? row[levelKeys[1]] ?? null;

    const count = row[valueKeys[0]] ?? 0;

    // FIX: preserve backend percent field
    const percent =
      row[valueKeys[1]] !== undefined
        ? Number(row[valueKeys[1]])
        : row.percent !== undefined
        ? Number(row.percent)
        : null;

    return {
      level,
      count,
      percent,
    };
  });
};

export default function AnalyticsDashboard({
  apiBase = DEFAULT_API_BASE,
  subscriberId = DEFAULT_SUBSCRIBER_ID,
} = {}) {
  const [vampData, setVampData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [latencyData, setLatencyData] = useState(null);
  const [riskSummaryData, setRiskSummaryData] = useState([]); // default to []
  const [threeDSData, setThreeDSData] = useState([]); // default to []

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [timeRange, setTimeRange] = useState("24h");
  const [environment, setEnvironment] = useState("All");

  const [binData, setBinData] = useState([]);
  const [ruleData, setRuleData] = useState([]);

  const [timingTotalStats, setTimingTotalStats] = useState(null);
  const [timingEvaluateStats, setTimingEvaluateStats] = useState(null);

  const fetchJSON = async (url) => {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (err) {
      console.error(`Fetch failed: ${url}`, err);
      return null;
    }
  };

  const fetchData = (endpoint) => {
    const url = `${apiBase}/${endpoint}?subscriber_id=${subscriberId}&exclude_dev=${EXCLUDE_DEV}`;
    return fetchJSON(url);
  };

  const fetchRiskSummary = () => {
    const url = `${apiBase}/case-risk-summary?subscriber_id=${subscriberId}&exclude_dev=${EXCLUDE_DEV}`;
    return fetchJSON(url);
  };

  const fetch3dsSummary = () => {
    const url = `${apiBase}/3ds-summary?subscriber_id=${subscriberId}&exclude_dev=${EXCLUDE_DEV}`;
    console.log("FETCH 3DS URL:", url);
    return fetchJSON(url);
  };

  const fetchBinDistribution = () => {
    const url = `${apiBase}/bin-distribution?subscriber_id=${subscriberId}&exclude_dev=${EXCLUDE_DEV}`;
    return fetchJSON(url);
  };

  const fetchRuleFrequency = () => {
    const url = `${apiBase}/rule-frequency?subscriber_id=${subscriberId}&exclude_dev=${EXCLUDE_DEV}`;
    return fetchJSON(url);
  };

  const fetchTimingTotalStats = () => {
    const url = `${apiBase}/timing-total-stats?subscriber_id=${subscriberId}&exclude_dev=${EXCLUDE_DEV}`;
    return fetchJSON(url);
  };

  const fetchTimingEvaluateStats = () => {
    const url = `${apiBase}/timing-evaluate-stats?subscriber_id=${subscriberId}&exclude_dev=${EXCLUDE_DEV}`;
    return fetchJSON(url);
  };

  // ------------------------------
  // PROCESSORS
  // ------------------------------

  // risk_level_counts
  const processRiskSummary = (result) => {
    // normalize: include percent!
    const rows = normalizeLevelCountRows(
      result,
      ["risk_level", "label", "level"], // support multiple possible keys
      ["count", "percent"]
    );

    if (!rows.length) return [];

    return rows.map(({ level, count, percent }) => ({
      name: (level || "UNKNOWN").toString().toUpperCase(),
      value: count,
      percent: percent != null ? Number(percent.toFixed(2)) : 0,
    }));
  };

  const processBinDistribution = (raw) => {
    if (!raw?.data) return [];
    return raw.data.map((row) => ({
      bin: row.bin,
      count: Number(row.count || 0),
    }));
  };

  const processRuleFrequency = (raw) => {
    if (!raw?.data) return [];
    return raw.data.map((row) => ({
      rule: row.rule,
      count: Number(row.count || 0),
    }));
  };

  const processTimingStats = (raw) => {
    if (!raw) return null;

    return {
      mean: Number(raw.mean || 0),
      low: Number(raw.low || 0),
      high: Number(raw.high || 0),
    };
  };

  const process3dsSummary = (result) => {
    console.log("PROCESSING 3DS RAW:", result);

    // Normalize raw data → include percent!
    const rows = normalizeLevelCountRows(
      result,
      ["level", "three_ds"],
      ["count", "percent"]
    );

    if (!rows.length) {
      console.warn("No 3DS rows after normalization");
      return [];
    }

    const buckets = {
      "Force 3DS": { value: 0, percent: 0 },
      "Prefer 3DS": { value: 0, percent: 0 },
      "Bypass 3DS": { value: 0, percent: 0 },
      "Other 3DS": { value: 0, percent: 0 },
    };

    rows.forEach(({ level, count, percent }) => {
      const lvl = (level || "").toUpperCase();
      const val = Number(count) || 0;
      const pct = Number(percent) || 0;

      let key;

      if (lvl === "FORCE" || lvl === "FORCE_ON") key = "Force 3DS";
      else if (lvl === "PREFER_ON" || lvl === "ATTEMPT") key = "Prefer 3DS";
      else if (lvl === "BYPASS" || lvl === "BYPASS_ON") key = "Bypass 3DS";
      else key = "Other 3DS";

      buckets[key].value += val;
      buckets[key].percent += pct;
    });

    return Object.entries(buckets)
      .filter(([_, obj]) => obj.value > 0)
      .map(([name, obj]) => ({
        name,
        value: obj.value,
        percent: Number(obj.percent.toFixed(2)), // KEEP PERCENT
      }));
  };

  const processVampData = (data) => {
    if (!data?.data?.data?.[0]) return null;
    const row = data.data.data[0];
    return {
      month: row[1]?.split(",")[1]?.trim().substring(0, 7) || "N/A",
      denom_txn_count: row[2] || 0,
      refund_count: row[3] || 0,
      refund_rate: parseFloat(row[4] || 0) * 100,
      chartData: [
        { name: "Transactions", value: row[2] || 0 },
        { name: "Refunds", value: row[3] || 0 },
      ],
    };
  };

  const processOrdersData = (apiResponse) => {
    if (!apiResponse?.data) return null;

    return {
      currencies: apiResponse.data,
    };
  };

  const processLatencyData = (data) => {
    if (!data?.data?.data) return null;

    const rows = data.data.data;

    // row[4] is in MINUTES from your analytics query
    const latenciesMinutes = rows.map((row) => parseFloat(row[4] || 0));

    const stats = {
      average:
        latenciesMinutes.reduce((a, b) => a + b, 0) / latenciesMinutes.length,
      maximum: Math.max(...latenciesMinutes),
      minimum: Math.min(...latenciesMinutes),
    };

    const chartData = rows.slice(0, 15).map((row, index) => {
      const minutes = parseFloat(row[4] || 0);
      const ms = minutes * 60_000;
      return {
        index,
        order_key: row[1].slice(-8),
        valueMs: ms,
      };
    });

    return { stats, chartData };
  };

  // ------------------------------
  // LOAD ALL DATA
  // ------------------------------
  const refreshMaterializedView = async () => {
    try {
      const url = `${apiBase}/refresh-view`;
      const res = await fetch(url, { method: "GET" });

      if (!res.ok) {
        console.error("Refresh view failed:", res.status);
        return false;
      }

      console.log("📨 Refresh response:", res.status);
      return true;
    } catch (err) {
      console.error("Refresh MV request failed:", err);
      return false;
    }
  };

  const manualRefresh = async () => {
    console.log("🔄 Manual refresh triggered");

    try {
      await refreshMaterializedView(); // refresh materialized view
      await loadAllData(); // reload dashboard
      console.log("✅ Manual refresh complete");
    } catch (err) {
      console.error("❌ Manual refresh failed:", err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);

    const [
      vamp,
      orders,
      latency,
      riskSummary,
      threeDS,
      binDist,
      ruleFreq,
      timingTotal,
      timingEval,
    ] = await Promise.all([
      fetchData("vamp"),
      fetchData("orders"),
      fetchData("latency"),
      fetchRiskSummary(),
      fetch3dsSummary(),
      fetchBinDistribution(),
      fetchRuleFrequency(),
      fetchTimingTotalStats(),
      fetchTimingEvaluateStats(),
    ]);

    setVampData(processVampData(vamp));
    setOrdersData(processOrdersData(orders));
    setLatencyData(processLatencyData(latency));
    setRiskSummaryData(processRiskSummary(riskSummary) || []);
    setThreeDSData(process3dsSummary(threeDS) || []);

    setBinData(processBinDistribution(binDist));
    setRuleData(processRuleFrequency(ruleFreq));

    setTimingTotalStats(processTimingStats(timingTotal));
    setTimingEvaluateStats(processTimingStats(timingEval));

    setLastUpdated(new Date());
    setLoading(false);
  };

  // ------------------------------
  // EFFECT HOOKS
  // ------------------------------
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    let isRunning = false;

    const runRefresh = async () => {
      if (isRunning) return;
      isRunning = true;

      console.log("🔥 Auto refresh triggered");

      try {
        console.log("📡 Calling refresh MV endpoint...");
        await refreshMaterializedView();
        await loadAllData();
        console.log("✅ Auto refresh complete");
      } catch (err) {
        console.error("❌ Auto refresh error:", err);
      }

      isRunning = false;
    };

    // ❌ DO NOT run immediately — causes double-loading with initial load
    // runRefresh();

    const interval = setInterval(runRefresh, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [autoRefresh, REFRESH_INTERVAL]);

  const SpinnerWrapper = () => (
    <div className="text-center py-4">
      <Spinner animation="border" variant="primary" />
    </div>
  );

  // ------------------------------
  // DERIVED KPI VALUES
  // ------------------------------
  let highRiskRate = "-";
  if (riskSummaryData && riskSummaryData.length > 0) {
    const total = riskSummaryData.reduce((sum, r) => sum + (r.value || 0), 0);
    const high =
      riskSummaryData.find((r) => r.name === "HIGH")?.value ||
      riskSummaryData.find((r) => r.name === "HIGH_RISK")?.value ||
      0;
    if (total > 0) {
      highRiskRate = `${((high / total) * 100).toFixed(1)}%`;
    }
  }

  const refundRate =
    vampData && Number.isFinite(vampData.refund_rate)
      ? `${vampData.refund_rate.toFixed(1)}%`
      : "-";

  // Force 3DS Rate: FORCE_ON / all 3DS policy/outcome rows
  // Force 3DS Rate: "Force 3DS" / all 3DS policy/outcome rows
  let force3dsRate = "-";
  if (threeDSData && threeDSData.length > 0) {
    const total = threeDSData.reduce((sum, d) => sum + (d.value || 0), 0);
    const force = threeDSData
      .filter((d) => d.name === "Force 3DS")
      .reduce((sum, d) => sum + (d.value || 0), 0);

    if (total > 0) {
      force3dsRate = `${((force / total) * 100).toFixed(1)}%`;
    }
  }

  const avgLatency =
    latencyData &&
    latencyData.stats &&
    Number.isFinite(latencyData.stats.average)
      ? formatLatencyFromMinutes(latencyData.stats.average)
      : "-";

  const totalVolume =
    ordersData && ordersData.totals
      ? `${ordersData.totals.deposited.toFixed(2)}`
      : "-";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F3F4F6",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* ===== Top Header ===== */}
      <header
        style={{
          background: "linear-gradient(90deg, #3B82F6, #60A5FA)", // clean bright blue
          padding: "16px 24px",
          color: "#FFF",
          marginBottom: "16px",
          borderRadius: "10px",
          boxShadow: "0 3px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
        }}
      >
        {/* Left: Logo + Title + Tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Idenza logo */}
            <img
              src="/assets/idenza_logo.png"
              alt="Idenza Logo"
              style={{
                width: 40,
                height: 40,
                objectFit: "contain",
                borderRadius: "6px",
              }}
            />

            <h2
              style={{
                margin: 0,
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: "0.01em",
              }}
            >
              Idenza Risk &amp; Payments Command Center
            </h2>
          </div>

          {/* Subheading */}
          <p
            style={{
              margin: "6px 0 0 52px",
              fontSize: 13,
              opacity: 0.92,
              fontWeight: 400,
            }}
          >
            Unified intelligence across approvals, fraud risk, 3DS policy, and
            VAMP-aligned performance.
          </p>
        </div>

        {/* Right: Tenant + status */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
            fontSize: 12,
          }}
        >
          {/* Tenant / subscriber pill */}
          <div
            style={{
              padding: "5px 12px",
              borderRadius: "999px",
              backgroundColor: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "999px",
                backgroundColor: "#22C55E", // green indicator
              }}
            />
            <span style={{ fontWeight: 500, color: "#F8FAFC" }}>
              {SUBSCRIBER_LABEL}
            </span>
          </div>

          {/* Last updated + auto-refresh */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#E0E7FF",
            }}
          >
            <span>
              Last updated:{" "}
              <strong>
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "Loading…"}
              </strong>
            </span>

            <span
              style={{
                padding: "2px 9px",
                borderRadius: "999px",
                backgroundColor: autoRefresh
                  ? "rgba(34,197,94,0.20)"
                  : "rgba(148,163,184,0.25)",
                border: `1px solid ${
                  autoRefresh ? "rgba(34,197,94,0.7)" : "rgba(148,163,184,0.6)"
                }`,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Auto-refresh:{" "}
              <span style={{ fontWeight: 700 }}>
                {autoRefresh ? "ON" : "OFF"}
              </span>
            </span>
          </div>
        </div>
      </header>

      <Container fluid>
        {/* Controls row */}
        <Row className="mb-3">
          <Col
            className="d-flex justify-content-between align-items-center flex-wrap gap-3"
            style={{ rowGap: "8px" }}
          >
            <div style={{ fontSize: 12, color: "#4B5563" }}>
              {lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                : "Loading..."}
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="btn-group" role="group" aria-label="Time range">
                {["24h", "7d", "30d"].map((range) => (
                  <Button
                    key={range}
                    variant={
                      timeRange === range ? "primary" : "outline-primary"
                    }
                    size="sm"
                    onClick={() => setTimeRange(range)}
                  >
                    Last {range}
                  </Button>
                ))}
              </div>

              <div className="btn-group" role="group" aria-label="Environment">
                {["All", "Prod", "Sandbox"].map((env) => (
                  <Button
                    key={env}
                    variant={
                      environment === env ? "primary" : "outline-primary"
                    }
                    size="sm"
                    onClick={() => setEnvironment(env)}
                  >
                    {env}
                  </Button>
                ))}
              </div>

              <Button
                variant={autoRefresh ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                Auto-refresh: {autoRefresh ? "ON" : "OFF"}
              </Button>

              <Button variant="primary" size="sm" onClick={manualRefresh}>
                <RefreshCw size={18} />
              </Button>
            </div>
          </Col>
        </Row>

        {/* KPI Strip */}
        {/* ===== KPI Strip ===== */}
        <Row className="mb-4" style={{ gap: "14px 0" }}>
          <Col lg={3} md={6} sm={6}>
            <KpiCard
              label="High Risk Rate"
              value={highRiskRate}
              sublabel="Traffic classified as HIGH"
              icon="⚠️"
              accent="#EF4444"
            />
          </Col>

          <Col lg={3} md={6} sm={6}>
            <KpiCard
              label="Refund / Dispute Rate"
              value={refundRate}
              sublabel="From VAMP analytics"
              icon="💸"
              accent="#F97316"
            />
          </Col>

          <Col lg={3} md={6} sm={6}>
            <KpiCard
              label="Force 3DS Rate"
              value={force3dsRate}
              sublabel="Policy: FORCE_ON"
              icon="🔐"
              accent="#3B82F6"
            />
          </Col>

          <Col lg={3} md={6} sm={6}>
            <KpiCard
              label="Scoring → Deposit"
              value={avgLatency}
              sublabel="Mean scoring-to-deposit latency"
              icon="⏱️"
              accent="#10B981"
            />
          </Col>
        </Row>

        {/* SECOND ROW OF KPIs */}
        <Row className="mb-4" style={{ gap: "14px 0" }}>
          <Col lg={3} md={6} sm={6}>
            <KpiCard
              label="Scoring Time"
              value={
                timingTotalStats
                  ? `${timingTotalStats.mean.toFixed(2)} ms`
                  : "-"
              }
              sublabel="Average scoring evaluation time"
              icon="🧠"
              accent="#8B5CF6"
            />
          </Col>
        </Row>

        {/* MAIN GRID LAYOUT */}
        <Row>
          <Col>
            <Card
              className="shadow-sm border-0"
              style={{ borderRadius: 12, transition: "box-shadow 0.2s" }}
            >
              <Card.Body>
                {/* FIRST: RISK SUMMARY + 3DS */}
                <Row className="mb-4">
                  <Col lg={6}>
                    <h6 style={{ fontWeight: 600, marginBottom: 8 }}>
                      Risk Mix
                    </h6>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: -4,
                        marginBottom: 8,
                      }}
                    >
                      Distribution of Low / Medium / High risk decisions
                    </p>
                    <RiskSummaryAnalytics
                      data={riskSummaryData}
                      loading={loading}
                    />
                  </Col>
                  <Col lg={6}>
                    <h6 style={{ fontWeight: 600, marginBottom: 8 }}>
                      3DS Outcomes &amp; Policy Levels
                    </h6>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: -4,
                        marginBottom: 8,
                      }}
                    >
                      Mix of actual 3DS gateway results (e.g. ATTEMPT / BYPASS)
                      and Idenza&apos;s Force / Prefer / Bypass 3DS policy
                      recommendations based on risk and rule hits.
                    </p>

                    <ThreeDSAnalytics data={threeDSData} loading={loading} />
                  </Col>
                </Row>

                {/* BIN Distribution + Rule Frequency */}
                <Row className="mb-4">
                  <Col lg={6}>
                    <h6 style={{ fontWeight: 600, marginBottom: 8 }}>
                      BIN Distribution
                    </h6>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: -4,
                        marginBottom: 8,
                      }}
                    >
                      Top most frequently used card BINs
                    </p>

                    <BinDistribution data={binData} loading={loading} />
                  </Col>

                  <Col lg={6}>
                    <h6 style={{ fontWeight: 600, marginBottom: 8 }}>
                      Rule Hits Frequency
                    </h6>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: -4,
                        marginBottom: 8,
                      }}
                    >
                      Most frequently triggered fraud rules
                    </p>

                    <RuleFrequency data={ruleData} loading={loading} />
                  </Col>
                </Row>

                {/* SECOND: VAMP + LATENCY */}
                <Row className="mb-4">
                  <Col lg={6}>
                    <h6 style={{ fontWeight: 600, marginBottom: 8 }}>
                      VAMP & Refunds
                    </h6>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: -4,
                        marginBottom: 8,
                      }}
                    >
                      Transaction vs refund counts and refund rate
                    </p>
                    {loading ? (
                      <SpinnerWrapper />
                    ) : (
                      <VampAnalytics data={vampData} loading={loading} />
                    )}
                  </Col>
                  <Col lg={6}>
                    <h6 style={{ fontWeight: 600, marginBottom: 8 }}>
                      Scoring - Deposit Latency
                    </h6>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: -4,
                        marginBottom: 8,
                      }}
                    >
                      Time between the first SCORING event and the first DEPOSIT
                      for each order
                    </p>
                    {loading ? (
                      <SpinnerWrapper />
                    ) : (
                      <LatencyAnalytics data={latencyData} loading={loading} />
                    )}
                  </Col>
                </Row>

                {/* THIRD: ORDERS / VOLUME */}
                <Row className="mx-0">
                  <Col xs={12} className="px-0">
                    <h6 style={{ fontWeight: 600, marginBottom: 8 }}>
                      Volume & Orders
                    </h6>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: -4,
                        marginBottom: 8,
                      }}
                    >
                      Deposits, refunds, and withdrawals across orders
                    </p>

                    {loading ? (
                      <SpinnerWrapper />
                    ) : (
                      <OrdersAnalytics data={ordersData} loading={loading} />
                    )}

                    <div
                      style={{
                        fontSize: 12,
                        color: "#4B5563",
                        marginTop: 8,
                        textAlign: "right",
                      }}
                    >
                      Total deposited volume: <strong>{totalVolume}</strong>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* ===== Footer ===== */}
      <div
        style={{
          backgroundColor: "#007BFF",
          color: "#FFF",
          textAlign: "center",
          padding: "16px",
          marginTop: "20px",
          borderRadius: "6px",
        }}
      >
        <p style={{ margin: 0 }}>Idenza © 2025</p>
      </div>
    </div>
  );
}
