
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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
}

interface Incident {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  occurrence_count: number;
  started_at: string;
  resolved_at: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    healthy: "bg-emerald-100 text-emerald-700",
    degraded: "bg-red-100 text-red-700",
    inactive: "bg-gray-100 text-gray-700",
    maintenance: "bg-amber-100 text-amber-700",
    open: "bg-red-100 text-red-700",
    resolved: "bg-emerald-100 text-emerald-700",
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-blue-100 text-blue-700",
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

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

export default function Dashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    setError("");

    try {
      const [servicesResponse, incidentsResponse] = await Promise.all([
        fetch(`${API_URL}/services/`, { cache: "no-store" }),
        fetch(`${API_URL}/incidents/`, { cache: "no-store" }),
      ]);

      if (!servicesResponse.ok || !incidentsResponse.ok) {
        throw new Error("Unable to fetch dashboard data from the backend.");
      }

      const servicesData: Service[] = await servicesResponse.json();
      const incidentsData: Incident[] = await incidentsResponse.json();

      setServices(servicesData);
      setIncidents(incidentsData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();

    const interval = setInterval(() => {
      void refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const totalServices = services.length;
  const healthyServices = services.filter(
    (service) => service.status === "active"
  ).length;
  const degradedServices = services.filter(
    (service) => service.status === "degraded"
  ).length;
  const openIncidents = incidents.filter(
    (incident) => incident.status === "open"
  ).length;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading ForgeOps dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-5 py-8">

        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              ForgeOps
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Infrastructure Operations Dashboard
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Last updated</p>
              <p className="text-sm text-gray-600">
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString()
                  : "Not available"}
              </p>
            </div>

            <button
              onClick={() => void refreshData()}
              disabled={refreshing}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/services"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100"
            >
              Manage Services
            </Link>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={() => void refreshData()}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Services"
            value={totalServices}
            description="Registered services"
          />

          <SummaryCard
            title="Healthy Services"
            value={healthyServices}
            description="Currently active"
          />

          <SummaryCard
            title="Degraded Services"
            value={degradedServices}
            description="Require attention"
          />

          <SummaryCard
            title="Open Incidents"
            value={openIncidents}
            description="Unresolved incidents"
          />
        </section>

        {/* Services */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold">Service Inventory</h2>
              <p className="text-sm text-gray-500">
                Health status of registered services
              </p>
            </div>
            <span className="text-sm text-gray-500">
              {services.length} services
            </span>
          </div>

          {services.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No services registered yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Owner Team</th>
                    <th className="px-6 py-4">Environment</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/services/${service.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {service.name}
                        </Link>
                        <p className="mt-1 text-xs text-gray-400">
                          {service.description || "No description"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {service.owner_team}
                      </td>

                      <td className="px-6 py-4 capitalize text-gray-600">
                        {service.environment}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={service.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Incidents */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold">Incident Management</h2>
              <p className="text-sm text-gray-500">
                Recent incidents and their resolution status
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {incidents.length} incidents
            </span>
          </div>

          {incidents.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No incidents recorded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Incident</th>
                    <th className="px-6 py-4">Severity</th>
                    <th className="px-6 py-4">Occurrences</th>
                    <th className="px-6 py-4">Started At</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {incident.title}
                        </Link>
                        <p className="mt-1 text-xs text-gray-400">
                          {incident.description || "No description"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={incident.severity} />
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {incident.occurrence_count}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {formatDate(incident.started_at)}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={incident.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-gray-200 pt-5 text-center text-xs text-gray-400">
          ForgeOps Infrastructure Operations Platform
          <br />
          Automated monitoring · Incident management · Service reliability
        </footer>
      </div>
    </main>
  );
}
