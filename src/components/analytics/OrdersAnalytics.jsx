import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Row, Col, Form } from "react-bootstrap";
import ChartCard from "../ui/CardChart";

const COLORS = ["#4facfe", "#667eea", "#764ba2", "#f093fb"];

const OrdersAnalytics = ({ data, loading }) => {
  // ✔ hooks must come first
  const currencyKeys = data?.currencies ? Object.keys(data.currencies) : [];
  const [selectedCurrency, setSelectedCurrency] = useState(
    currencyKeys[0] || ""
  );

  // ✔ safe check — no early return before hooks
  if (!data || !data.currencies) return null;

  const cdata = data.currencies[selectedCurrency];

  return (
    <>
      {/* ----------------------- */}
      {/*   DROPDOWN SELECTOR     */}
      {/* ----------------------- */}
      <Row className="mb-3 mx-0">
        <Col xs={12} className="px-1">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold">Currency:</span>

            <Form.Select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              style={{ width: "200px" }} // optional nice width
            >
              {currencyKeys.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </Form.Select>
          </div>
        </Col>
      </Row>

      {/* PIE CHART */}
      <Row className="mb-4 mx-0">
        <Col xs={12} className="px-1">
          <ChartCard
            title={`💰 ${selectedCurrency} Transaction Breakdown`}
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={cdata.chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={40}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(2)}`}
                >
                  {cdata.chartData.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v.toFixed(2)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* RECENT ORDERS TABLE */}
      <Row className="mx-0">
        <Col xs={12} className="px-1">
          <ChartCard
            title={`📋 Recent ${selectedCurrency} Orders`}
            loading={loading}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-3 py-2 text-left">Order</th>
                    <th className="px-3 py-2 text-right">Scoring</th>
                    <th className="px-3 py-2 text-right">Deposited</th>
                    <th className="px-3 py-2 text-right">Refunded</th>
                    <th className="px-3 py-2 text-right">Withdrawn</th>
                    <th className="px-3 py-2 text-left">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {cdata.recentOrders.map((order, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-left">
                        {order.order_key}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {order.scoring ? order.scoring.toFixed(2) : "0.00"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {order.deposited ? order.deposited.toFixed(2) : "0.00"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {order.refunded ? order.refunded.toFixed(2) : "0.00"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {order.withdrawn ? order.withdrawn.toFixed(2) : "0.00"}
                      </td>
                      <td className="px-3 py-2 text-left">{order.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </Col>
      </Row>
    </>
  );
};

export default OrdersAnalytics;
