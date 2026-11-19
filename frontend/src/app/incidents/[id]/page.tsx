
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

interface Incident {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  occurrence_count: number;
  started_at: string;
  last_seen_at: string;
  resolved_at: string | null;
}

interface Service {
  id: string;
  name: string;
  owner_team: string;
  environment: string;
  status: string;
  endpoint_url: string | null;
}

interface HealthCheck {
  id: string;
  status: string;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
}

function Badge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    resolved: "bg-emerald-100 text-emerald-700",
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-blue-100 text-blue-700",
    active: "bg-emerald-100 text-emerald-700",
    degraded: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        styles[value.toLowerCase()] || "bg-gray-100 text-gray-700"
      }`}
    >
      {value}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function IncidentDetailsPage() {
  const params = useParams<{ id: string }>();
  const incidentId = params.id;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [history, setHistory] = useState<HealthCheck[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError("");

    try {
      const incidentResponse = await fetch(
        `${API_URL}/incidents/${incidentId}`,
        { cache: "no-store" }
      );

      if (!incidentResponse.ok) {
        throw new Error(
          incidentResponse.status === 404
            ? "Incident not found."
            : "Unable to retrieve incident."
        );
      }

      const incidentData: Incident =
        await incidentResponse.json();

      const [serviceResponse, historyResponse] =
        await Promise.all([
          fetch(
            `${API_URL}/services/${incidentData.service_id}`,
            { cache: "no-store" }
          ),
          fetch(
            `${API_URL}/services/${incidentData.service_id}/health-history`,
            { cache: "no-store" }
          ),
        ]);

      if (!serviceResponse.ok || !historyResponse.ok) {
        throw new Error(
          "Unable to retrieve related service information."
        );
      }

      const serviceData: Service =
        await serviceResponse.json();

      const historyData: HealthCheck[] =
        await historyResponse.json();

      setIncident(incidentData);
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
  }, [incidentId]);

  useEffect(() => {
    void loadData();

    const interval = setInterval(() => {
      void loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadData]);

  const runHealthCheck = async () => {
    if (!incident || incident.status !== "open") return;

    setChecking(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/services/${incident.service_id}/health-check`,
        { method: "POST" }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.detail || "Health check failed."
        );
      }

      const result: HealthCheck = await response.json();

      setMessage(
        result.status === "healthy"
          ? "Service recovered. The incident should now be resolved."
          : "Service is still unhealthy. The incident remains open."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to execute health check."
      );
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        Loading incident details...
      </main>
    );
  }

  if (!incident) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-red-600">
          {error || "Incident not found."}
        </p>
        <Link href="/" className="mt-4 inline-block underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  const timeline = [
    {
      title: "Incident detected",
      date: incident.started_at,
      description: "The first failure was recorded.",
    },
    {
      title: "Latest failure observed",
      date: incident.last_seen_at,
      description:
        `${incident.occurrence_count} failure occurrence(s) recorded.`,
    },
    ...(incident.resolved_at
      ? [
          {
            title: "Incident resolved",
            date: incident.resolved_at,
            description:
              "A successful health check confirmed recovery.",
          },
        ]
      : []),
  ];

  const recentHistory = history.slice(0, 10);

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
        <header className="mb-8 mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 flex gap-2">
              <Badge value={incident.status} />
              <Badge value={incident.severity} />
            </div>

            <h1 className="text-3xl font-bold">
              {incident.title}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Incident ID: {incident.id}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => void loadData()}
              disabled={refreshing}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={runHealthCheck}
              disabled={
                checking ||
                incident.status !== "open" ||
                !service?.endpoint_url
              }
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {checking ? "Checking..." : "Verify Recovery"}
            </button>
          </div>
        </header>

        {/* Feedback */}
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

        {/* Summary */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Severity",
              value: incident.severity,
            },
            {
              title: "Status",
              value: incident.status,
            },
            {
              title: "Occurrences",
              value: String(incident.occurrence_count),
            },
            {
              title: "Started At",
              value: new Date(
                incident.started_at
              ).toLocaleDateString(),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">
                {item.title}
              </p>
              <p className="mt-2 text-2xl font-bold capitalize">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Description */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">
            Incident Description
          </h2>

          <p className="text-sm text-gray-600">
            {incident.description || "No description available."}
          </p>
        </section>

        {/* Related service */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Related Service
          </h2>

          {service && (
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <Link
                  href={`/services/${service.id}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {service.name}
                </Link>

                <p className="mt-1 text-sm text-gray-500">
                  {service.owner_team} · {service.environment}
                </p>
              </div>

              <Badge value={service.status} />
            </div>
          )}
        </section>

        {/* Timeline */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold">
            Incident Timeline
          </h2>

          <div className="space-y-6">
            {timeline.map((event, index) => (
              <div key={event.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      index === timeline.length - 1 &&
                      incident.status === "resolved"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                  />

                  {index !== timeline.length - 1 && (
                    <div className="mt-2 h-12 w-px bg-gray-200" />
                  )}
                </div>

                <div className="-mt-1">
                  <p className="font-medium">
                    {event.title}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(event.date)}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Health activity */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Recent Service Health Activity
            </h2>

            <p className="text-sm text-gray-500">
              Latest 10 health checks for this service
            </p>
          </div>

          {recentHistory.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No health-check records available.
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
                  {recentHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                        {formatDate(item.checked_at)}
                      </td>

                      <td className="px-6 py-4">
                        <Badge value={item.status} />
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
          ForgeOps Incident Management
        </footer>
      </div>
    </main>
  );
}
