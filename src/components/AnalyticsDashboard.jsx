import React, { useState, useEffect } from "react";
import { RefreshCw, Activity } from "lucide-react";
import { Container, Row, Col, Button, Card, Spinner } from "react-bootstrap";
import VampAnalytics from "./analytics/VampAnalytics";
import OrdersAnalytics from "./analytics/OrdersAnalytics";
import LatencyAnalytics from "./analytics/LatencyAnalytics";
import RiskSummaryAnalytics from "./analytics/RiskSummaryAnalytics";
import ThreeDSAnalytics from "./analytics/ThreeDSAnalytics";

import { Header } from "./Header";
import { Footer } from "./Footer";

const API_BASE = "http://localhost:8080/analytics";
const SUBSCRIBER_ID = 1;
const EXCLUDE_DEV = false;

export default function AnalyticsDashboard() {
  const [vampData, setVampData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [latencyData, setLatencyData] = useState(null);
  const [riskSummaryData, setRiskSummaryData] = useState(null);
  const [threeDSData, setThreeDSData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ------------------------------
  // UNIVERSAL JSON FETCHER
  // ------------------------------
  const fetchJSON = async (url) => {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (err) {
      console.error(`Fetch failed: ${url}`, err);
      return null;
    }
  };

  // ------------------------------
  // FETCHERS
  // ------------------------------
  const fetchData = (endpoint) => {
    const url = `${API_BASE}/${endpoint}?subscriber_id=${SUBSCRIBER_ID}&exclude_dev=${EXCLUDE_DEV}`;
    return fetchJSON(url);
  };

  const fetchRiskSummary = () => {
    const url = `${API_BASE}/case-risk-summary?subscriber_id=${SUBSCRIBER_ID}&exclude_dev=${EXCLUDE_DEV}`;
    return fetchJSON(url);
  };

  const fetch3dsSummary = () => {
    const url = `${API_BASE}/3ds-summary?subscriber_id=${SUBSCRIBER_ID}&exclude_dev=${EXCLUDE_DEV}`;
    console.log("FETCH 3DS URL:", url);
    return fetchJSON(url);
  };

  // ------------------------------
  // UPDATED PROCESSORS (NO GRAFANA FORMAT)
  // ------------------------------
  const process3dsSummary = (data) => {
    console.log("PROCESSING 3DS:", data);

    if (!data?.data) {
      console.warn("3DS Summary missing data");
      return null;
    }

    return data.data.map((entry) => ({
      name: entry.level?.toUpperCase(),
      value: entry.count,
    }));
  };

  const processRiskSummary = (data) => {
    if (!data?.data) return null;

    return data.data.map((entry) => ({
      name: entry.risk_level?.toUpperCase(),
      value: entry.count,
    }));
  };

  // ------------------------------
  // EXISTING PROCESSORS
  // ------------------------------
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

    const latencies = rows.map((row) => parseFloat(row[4]));

    const stats = {
      average: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      maximum: Math.max(...latencies),
      minimum: Math.min(...latencies),
    };

    // FIX: add index for stable X-axis
    const chartData = rows.slice(0, 15).map((row, index) => ({
      index, // NEW
      order_key: row[1].slice(-8),
      minutes: parseFloat(row[4]),
    }));

    return { stats, chartData };
  };

  // ------------------------------
  // LOAD ALL DATA
  // ------------------------------
  const loadAllData = async () => {
    setLoading(true);

    const [vamp, orders, latency, riskSummary, threeDS] = await Promise.all([
      fetchData("vamp"),
      fetchData("orders"),
      fetchData("latency"),
      fetchRiskSummary(),
      fetch3dsSummary(),
    ]);

    setVampData(processVampData(vamp));
    setOrdersData(processOrdersData(orders));
    setLatencyData(processLatencyData(latency));
    setRiskSummaryData(processRiskSummary(riskSummary));
    setThreeDSData(process3dsSummary(threeDS));

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
    const interval = setInterval(loadAllData, 120000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // ------------------------------
  const SpinnerWrapper = () => (
    <div className="text-center py-4">
      <Spinner animation="border" variant="primary" />
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        padding: "2rem",
      }}
    >
      <Container fluid>
        {/* HEADER */}
        <Row className="text-center mb-4">
          <Col>
            <Row>
              <div
                className="px-5 py-3 mb-4 d-flex align-items-center"
                style={{
                  backgroundColor: "#022f91ff",
                  color: "white",
                  margin: "0px",
                  padding: "0px",
                }}
              >
                <Container fluid className="d-flex align-items-center">
                  <Header />
                  <h1>Dashboard</h1>
                </Container>
              </div>
            </Row>

            <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap">
              <span className="small text-secondary">
                {lastUpdated
                  ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                  : "Loading..."}
              </span>

              <Button
                variant={autoRefresh ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                Auto-refresh: {autoRefresh ? "ON" : "OFF"}
              </Button>

              <Button variant="primary" size="sm" onClick={loadAllData}>
                <RefreshCw size={18} />
              </Button>
            </div>
          </Col>
        </Row>

        {/* SINGLE PAGE GRID LAYOUT */}
        <Row>
          <Col>
            <Card className="shadow-sm border-0">
              <Card.Body>
                {/* FIRST: RISK SUMMARY */}
                <Row className="mb-4">
                  <Col lg={6}>
                    <RiskSummaryAnalytics
                      data={riskSummaryData}
                      loading={loading}
                    />
                  </Col>

                  <Col lg={6}>
                    <ThreeDSAnalytics data={threeDSData} loading={loading} />
                  </Col>
                </Row>

                {/* SECOND: VAMP + ORDERS */}
                <Row className="mb-4">
                  <Col lg={6}>
                    {loading ? (
                      <SpinnerWrapper />
                    ) : (
                      <VampAnalytics data={vampData} loading={loading} />
                    )}
                  </Col>
                  <Col lg={6}>
                    {loading ? (
                      <SpinnerWrapper />
                    ) : (
                      <LatencyAnalytics data={latencyData} loading={loading} />
                    )}
                  </Col>
                </Row>

                {/* THIRD: LATENCY */}
                <Row>
                  <Col lg={12}>
                    {loading ? (
                      <SpinnerWrapper />
                    ) : (
                      <OrdersAnalytics data={ordersData} loading={loading} />
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Footer />
    </div>
  );
}
