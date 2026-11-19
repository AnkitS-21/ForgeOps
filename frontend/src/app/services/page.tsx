
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

interface ServiceForm {
  name: string;
  description: string;
  owner_team: string;
  environment: string;
  endpoint_url: string;
  status: string;
}

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  owner_team: "",
  environment: "development",
  endpoint_url: "",
  status: "active",
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    degraded: "bg-red-100 text-red-700",
    maintenance: "bg-amber-100 text-amber-700",
    inactive: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function ServiceManagementPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const fetchServices = useCallback(async () => {
    setError("");

    try {
      const response = await fetch(`${API_URL}/services/`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to retrieve services.");
      }

      const data: Service[] = await response.json();
      setServices(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const updateField = (
    field: keyof ServiceForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setShowForm(true);
  };

  const openEditForm = (service: Service) => {
    setEditingId(service.id);

    setForm({
      name: service.name,
      description: service.description || "",
      owner_team: service.owner_team,
      environment: service.environment,
      endpoint_url: service.endpoint_url || "",
      status: service.status,
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveService = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      owner_team: form.owner_team.trim(),
      environment: form.environment,
      endpoint_url: form.endpoint_url.trim() || null,
      ...(editingId ? { status: form.status } : {}),
    };

    try {
      const response = await fetch(
        editingId
          ? `${API_URL}/services/${editingId}`
          : `${API_URL}/services/`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const result = await response.json();

        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Unable to save service. Check the supplied fields."
        );
      }

      closeForm();

      setMessage(
        editingId
          ? "Service updated successfully."
          : "Service registered successfully."
      );

      await fetchServices();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save service."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (service: Service) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${service.name}? Its associated health history and incidents may also be deleted because of the database cascade.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/services/${service.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Unable to delete service.");
      }

      setMessage(`${service.name} deleted successfully.`);
      await fetchServices();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Delete operation failed."
      );
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = [
      service.name,
      service.owner_team,
      service.environment,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || service.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        Loading services...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-5 py-8">

        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to dashboard
        </Link>

        <header className="mb-8 mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Service Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Register, configure and manage infrastructure services.
            </p>
          </div>

          <button
            onClick={openCreateForm}
            className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-700"
          >
            + Register Service
          </button>
        </header>

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

        {/* Create / Edit Form */}
        {showForm && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold">
              {editingId ? "Edit Service" : "Register New Service"}
            </h2>

            <form onSubmit={saveService}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Service Name *
                  </label>
                  <input
                    required
                    minLength={3}
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Payment API"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Owner Team *
                  </label>
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.owner_team}
                    onChange={(e) =>
                      updateField("owner_team", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Platform Engineering"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Environment *
                  </label>
                  <select
                    value={form.environment}
                    onChange={(e) =>
                      updateField("environment", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                {editingId && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Operational Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateField("status", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      A subsequent health check may update this status.
                    </p>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Health Check Endpoint
                  </label>
                  <input
                    type="url"
                    maxLength={500}
                    value={form.endpoint_url}
                    onChange={(e) =>
                      updateField("endpoint_url", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="https://example.com/health"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Describe the purpose of this service..."
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Service"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Filters */}
        <section className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, owner or environment..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="degraded">Degraded</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </section>

        {/* Service Table */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-semibold">Registered Services</h2>
            <p className="mt-1 text-xs text-gray-500">
              Showing {filteredServices.length} of {services.length} services
            </p>
          </div>

          {filteredServices.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-500">
              No matching services found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Owner</th>
                    <th className="px-6 py-4">Environment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/services/${service.id}`}
                          className="font-semibold text-blue-600 hover:underline"
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

                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => openEditForm(service)}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => void deleteService(service)}
                            className="font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-gray-200 pt-5 text-center text-xs text-gray-400">
          ForgeOps Service Management
        </footer>
      </div>
    </main>
  );
}
