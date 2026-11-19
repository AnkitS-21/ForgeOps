
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

interface Service {
  id: string;
  name: string;
  description: string | null;
  owner_team: string;
  environment: string;
  status: string;
  endpoint_url: string | null;
  created_at: string;
  updated_at: string;
}

interface HealthCheck {
  id: string;
  service_id: string;
  status: string;
  response_time_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  checked_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    healthy: "bg-emerald-100 text-emerald-700",
    degraded: "bg-red-100 text-red-700",
    unhealthy: "bg-red-100 text-red-700",
    inactive: "bg-gray-100 text-gray-700",
    maintenance: "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        styles[status.toLowerCase()] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function ServiceDetailsPage() {
  const params = useParams<{ id: string }>();
  const serviceId = params.id;

  const [service, setService] = useState<Service | null>(null);
  const [history, setHistory] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchServiceData = useCallback(async () => {
    setRefreshing(true);
    setError("");

    try {
      const [serviceResponse, historyResponse] = await Promise.all([
        fetch(`${API_URL}/services/${serviceId}`, {
          cache: "no-store",
        }),
        fetch(`${API_URL}/services/${serviceId}/health-history`, {
          cache: "no-store",
        }),
      ]);

      if (!serviceResponse.ok) {
        throw new Error(
          serviceResponse.status === 404
            ? "Service not found."
            : "Unable to retrieve service details."
        );
      }

      if (!historyResponse.ok) {
        throw new Error("Unable to retrieve health history.");
      }

      const serviceData: Service = await serviceResponse.json();
      const historyData: HealthCheck[] = await historyResponse.json();

      setService(serviceData);
      setHistory(historyData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void fetchServiceData();

    const interval = setInterval(() => {
      void fetchServiceData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchServiceData]);

  const runHealthCheck = async () => {
    setChecking(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/services/${serviceId}/health-check`,
        { method: "POST" }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.detail || "Health check failed.");
      }

      const result: HealthCheck = await response.json();

      setMessage(
        `Health check completed: ${result.status}`
      );

      await fetchServiceData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run health check."
      );
    } finally {
      setChecking(false);
    }
  };

  const chartData = [...history]
    .reverse()
    .map((item) => ({
      time: new Date(item.checked_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      responseTime: item.response_time_ms,
      status: item.status,
    }));

  const totalChecks = history.length;

  const failedChecks = history.filter(
    (item) => item.status === "unhealthy"
  ).length;

  const latestCheck = history[0];

  const averageResponseTime = history.length
    ? history.reduce(
        (sum, item) => sum + (item.response_time_ms ?? 0),
        0
      ) / history.filter(
        (item) => item.response_time_ms !== null
      ).length
    : 0;

  const formatDate = (date: string) =>
    new Date(date).toLocaleString();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        Loading service details...
      </main>
    );
  }

  if (!service) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-red-600">
          {error || "Service not found."}
        </p>
        <Link href="/" className="mt-4 inline-block underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-5 py-8">

        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>

        {/* Header */}
        <header className="mb-8 mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3">
              <StatusBadge status={service.status} />
            </div>

            <h1 className="text-3xl font-bold">
              {service.name}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {service.description || "No description available"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => void fetchServiceData()}
              disabled={refreshing}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={runHealthCheck}
              disabled={checking || !service.endpoint_url}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {checking ? "Checking..." : "Run Health Check"}
            </button>
          </div>
        </header>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* Service information */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Environment",
              value: service.environment,
            },
            {
              title: "Owner Team",
              value: service.owner_team,
            },
            {
              title: "Latest Response",
              value: latestCheck?.response_time_ms != null
                ? `${latestCheck.response_time_ms} ms`
                : "N/A",
            },
            {
              title: "Average Response",
              value: averageResponseTime > 0
                ? `${averageResponseTime.toFixed(2)} ms`
                : "N/A",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">
                {item.title}
              </p>
              <p className="mt-2 text-xl font-bold capitalize">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Check statistics */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Health Checks
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalChecks}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Failed Health Checks
            </p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {failedChecks}
            </p>
          </div>
        </section>

        {/* Response time chart */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Response Time History
          </h2>

          <p className="mb-6 mt-1 text-sm text-gray-500">
            Historical response time in milliseconds
          </p>

          {chartData.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">
              No health-check data available yet.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Milliseconds",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />

                  <Tooltip
                    formatter={(value) => [
                      value == null ? "N/A" : `${value} ms`,
                      "Response Time",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    name="Response Time"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Health check history */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Health Check History
            </h2>

            <p className="text-sm text-gray-500">
              Most recent 50 health checks
            </p>
          </div>

          {history.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No health checks recorded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Checked At</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">HTTP Code</th>
                    <th className="px-6 py-4">Response Time</th>
                    <th className="px-6 py-4">Error</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                        {formatDate(item.checked_at)}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-6 py-4">
                        {item.status_code ?? "N/A"}
                      </td>

                      <td className="px-6 py-4">
                        {item.response_time_ms != null
                          ? `${item.response_time_ms} ms`
                          : "N/A"}
                      </td>

                      <td className="max-w-xs truncate px-6 py-4 text-red-600">
                        {item.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-gray-200 pt-5 text-center text-xs text-gray-400">
          ForgeOps Service Monitoring
        </footer>
      </div>
    </main>
  );
}
