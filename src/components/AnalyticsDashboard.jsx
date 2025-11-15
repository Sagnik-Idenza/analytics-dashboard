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

const DEFAULT_API_BASE = "http://localhost:8080/analytics";
// const DEFAULT_API_BASE = "https://coral-app-2-4y6qg.ondigitalocean.app/analytics";
const DEFAULT_SUBSCRIBER_ID = 1;
const EXCLUDE_DEV = false;
const REFRESH_INTERVAL = 120000;
// Simple KPI card component
const KpiCard = ({ label, value, sublabel, accent = "#10B981" }) => (
  <Card className="shadow-sm border-0" style={{ borderRadius: 12 }}>
    <Card.Body>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      {sublabel && (
        <div style={{ fontSize: 12, color: accent, marginTop: 4 }}>
          {sublabel}
        </div>
      )}
    </Card.Body>
  </Card>
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
function normalizeLevelCountRows(
  raw,
  levelFieldCandidates,
  countFieldCandidates
) {
  if (!raw) return [];

  // Case 1: object list — { data: [ { level: "Frictionless", count: 10 }, ... ] }
  if (
    Array.isArray(raw.data) &&
    raw.data.length > 0 &&
    typeof raw.data[0] === "object"
  ) {
    return raw.data.map((entry) => {
      const levelField = levelFieldCandidates.find((k) => k in entry);
      const countField = countFieldCandidates.find((k) => k in entry);
      return {
        level: levelField ? entry[levelField] : null,
        count: Number(countField ? entry[countField] : 0),
      };
    });
  }

  // Case 2: Grafana-style at root — { columns: [...], data: [[...], ...] }
  if (
    Array.isArray(raw.columns) &&
    Array.isArray(raw.data) &&
    raw.data.length > 0 &&
    Array.isArray(raw.data[0])
  ) {
    const cols = raw.columns;
    const rows = raw.data;
    const levelIdx = levelFieldCandidates
      .map((k) => cols.indexOf(k))
      .find((idx) => idx !== -1);
    const countIdx = countFieldCandidates
      .map((k) => cols.indexOf(k))
      .find((idx) => idx !== -1);

    if (levelIdx == null || countIdx == null) return [];

    return rows.map((row) => ({
      level: row[levelIdx],
      count: Number(row[countIdx] || 0),
    }));
  }

  // Case 3: Grafana-style nested — { data: { columns: [...], data: [[...], ...] } }
  if (
    raw.data &&
    Array.isArray(raw.data.columns) &&
    Array.isArray(raw.data.data) &&
    raw.data.data.length > 0 &&
    Array.isArray(raw.data.data[0])
  ) {
    const cols = raw.data.columns;
    const rows = raw.data.data;
    const levelIdx = levelFieldCandidates
      .map((k) => cols.indexOf(k))
      .find((idx) => idx !== -1);
    const countIdx = countFieldCandidates
      .map((k) => cols.indexOf(k))
      .find((idx) => idx !== -1);

    if (levelIdx == null || countIdx == null) return [];

    return rows.map((row) => ({
      level: row[levelIdx],
      count: Number(row[countIdx] || 0),
    }));
  }

  return [];
}

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
    const rows = normalizeLevelCountRows(
      result,
      ["risk_level", "level"],
      ["count"]
    );
    if (!rows.length) return [];

    return rows.map(({ level, count }) => ({
      name: (level || "UNKNOWN").toString().toUpperCase(),
      value: count,
    }));
  };

  // threed_secure_level_counts + bucketing
  // threed_secure_level_counts → "3DS used vs not used" view
  // const process3dsSummary = (result) => {
  //   console.log("PROCESSING 3DS RAW:", result);

  //   // Normalize different shapes into [{ level, count }, ...]
  //   const rows = normalizeLevelCountRows(result, ["level", "three_ds"], ["count"]);
  //   if (!rows.length) {
  //     console.warn("No 3DS rows after normalization");
  //     return [];
  //   }

  //   // Bucket raw values into high-level groups
  //   const bucketCounts = {};
  //   rows.forEach(({ level, count }) => {
  //     const bucket = bucketThreeDSLevel(level); // NOT_ATTEMPTED / OTHER / etc.
  //     bucketCounts[bucket] = (bucketCounts[bucket] || 0) + (count || 0);
  //   });

  //   const notAttempted = bucketCounts["NOT_ATTEMPTED"] || 0;

  //   // Treat anything that is *not* clearly "not attempted" as "3DS_USED"
  //   const attempted = Object.entries(bucketCounts)
  //     .filter(([bucket]) => bucket !== "NOT_ATTEMPTED")
  //     .reduce((sum, [, value]) => sum + (value || 0), 0);

  //   const resultBuckets = [
  //     { name: "3DS_USED", value: attempted },
  //     { name: "NO_3DS", value: notAttempted },
  //   ].filter((d) => d.value > 0);

  //   console.log("PROCESSING 3DS 3DS_USED vs NO_3DS:", resultBuckets);

  //   return resultBuckets;
  // };

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

    // Normalize result into [{ level, count }]
    const rows = normalizeLevelCountRows(
      result,
      ["level", "three_ds"], // fields that can contain 3DS level
      ["count"] // count field
    );

    if (!rows.length) {
      console.warn("No 3DS rows after normalization");
      return [];
    }

    // Simply map raw rows → pie chart format
    const clean = rows.map(({ level, count }) => ({
      name: (level || "UNKNOWN").toString().toUpperCase(),
      value: Number(count) || 0,
    }));

    console.log("PROCESSING 3DS (simple FORCE/ATTEMPT/BYPASS):", clean);

    return clean;
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

  const processOrdersData = (data) => {
    if (!data?.data?.data) return null;
    const rows = data.data.data;

    const totals = {
      deposited: rows.reduce((sum, row) => sum + parseFloat(row[3] || 0), 0),
      refunded: rows.reduce((sum, row) => sum + parseFloat(row[4] || 0), 0),
      withdrawn: rows.reduce((sum, row) => sum + parseFloat(row[5] || 0), 0),
    };

    const counts = {
      deposits: rows.reduce((sum, row) => sum + (row[6] || 0), 0),
      refunds: rows.reduce((sum, row) => sum + (row[7] || 0), 0),
      withdrawals: rows.reduce((sum, row) => sum + (row[8] || 0), 0),
    };

    const chartData = [
      { name: "Deposited", value: totals.deposited },
      { name: "Refunded", value: totals.refunded },
      { name: "Withdrawn", value: totals.withdrawn },
    ];

    const recentOrders = rows.slice(0, 10).map((row) => ({
      order_key: row[0],
      scoring: parseFloat(row[2] || 0),
      deposited: parseFloat(row[3] || 0),
      refunded: parseFloat(row[4] || 0),
      timestamp: row[9],
    }));

    return { totals, counts, chartData, recentOrders };
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
      if (isRunning) return; // prevent double triggers
      isRunning = true;

      console.log("🔥 Auto refresh triggered");

      try {
        console.log("📡 Calling refresh MV endpoint...");
        await refreshMaterializedView(); // refresh the MV
        await loadAllData(); // reload dashboard
        console.log("✅ Auto refresh complete");
      } catch (err) {
        console.error("❌ Auto refresh error:", err);
      }

      isRunning = false;
    };

    // Run once immediately when toggled ON
    runRefresh();

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

  // Challenge rate: CHALLENGED / (FRICTIONLESS + CHALLENGED + FAILED)
  let challengeRate = "-";
  if (threeDSData && threeDSData.length > 0) {
    const byName = Object.fromEntries(
      threeDSData.map((d) => [d.name, d.value || 0])
    );

    const attemptedTotal =
      (byName["FRICTIONLESS"] || 0) +
      (byName["CHALLENGED"] || 0) +
      (byName["FAILED"] || 0);

    const challenged = byName["CHALLENGED"] || 0;

    if (attemptedTotal > 0) {
      challengeRate = `${((challenged / attemptedTotal) * 100).toFixed(1)}%`;
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
          backgroundColor: "#007BFF",
          padding: "16px",
          color: "#FFF",
          textAlign: "center",
          marginBottom: "16px",
          borderRadius: "6px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ margin: 0 }}>Idenza Risk &amp; Payments Command Center</h2>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
          Live view of approvals, risk levels, 3DS, and VAMP-related performance
        </p>
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
        <Row className="mb-4">
          <Col lg={3} md={6} className="mb-3">
            <KpiCard
              label="High Risk Rate"
              value={highRiskRate}
              sublabel="Share of traffic marked HIGH"
              accent="#EF4444"
            />
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <KpiCard
              label="Refund / Dispute Rate"
              value={refundRate}
              sublabel="From VAMP analytics"
              accent="#F97316"
            />
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <KpiCard
              label="3DS Challenge Rate"
              value={challengeRate}
              sublabel="Of 3DS-authenticated flows"
              accent="#3B82F6"
            />
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <KpiCard
              label="Scoring - Deposit Latency"
              value={avgLatency}
              sublabel="Mean time from first scoring to first deposit"
              accent="#10B981"
            />
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <KpiCard
              label="Scoring Time"
              value={
                timingTotalStats
                  ? `${timingTotalStats.mean.toFixed(2)} ms`
                  : "-"
              }
              sublabel={`Response time of Scoring Requests`}
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
                      3DS Outcomes
                    </h6>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: -4,
                        marginBottom: 8,
                      }}
                    >
                      Frictionless vs challenged vs failed vs not attempted
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
                <Row>
                  <Col lg={12}>
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
