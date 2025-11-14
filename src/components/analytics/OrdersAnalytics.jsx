import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign } from "lucide-react";
import StatCard from "../ui/StatCard";
import ChartCard from "../ui/CardChart";
import { Row , Col} from "react-bootstrap";
const COLORS = ["#667eea", "#764ba2", "#f093fb", "#4facfe"];

const OrdersAnalytics = ({ data, loading }) => {
  if (!data) return null;

  return (
    <>
      {/* Orders Stat Cards */}
      <Row className="mb-4">
        <Col md={6}>
          <StatCard
            icon={DollarSign}
            title="Total Deposited"
            value={`$${data.totals.deposited.toFixed(2)}`}
            subtitle={`${data.counts.deposits} deposits`}
            color="from-blue-500 to-blue-600"
          />
        </Col>

        <Col md={6}>
          <StatCard
            icon={DollarSign}
            title="Total Refunded"
            value={`$${data.totals.refunded.toFixed(2)}`}
            subtitle={`${data.counts.refunds} refunds`}
            color="from-pink-500 to-pink-600"
          />
        </Col>
      </Row>

      {/* Orders Pie Chart */}
      <ChartCard title="🧾 Order Distribution" loading={loading}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="📋 Recent Orders" loading={loading}>
        {/* Recent Orders Table */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Order Key
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
                    Scoring
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
                    Deposited
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
                    Refunded
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {order.order_key}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      ${order.scoring.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      ${order.deposited.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      ${order.refunded.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {order.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ChartCard>
    </>
  );
};

export default OrdersAnalytics;
