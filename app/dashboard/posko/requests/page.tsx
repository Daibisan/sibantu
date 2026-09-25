"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AidItem = {
  id: number;
  code: string;
  name: string;
  unit: string;
  description?: string | null;
};

type EventLocation = {
  id: number;
  name: string;
  code?: string | null;
  location_type?: string | null;
  address?: string | null;
};

type DisasterEvent = {
  id: number;
  code: string;
  name: string;
  status: string;
};

type AidRequest = {
  id: number;
  request_code: string;
  disaster_event_id: number | string;
  event_code: string;
  event_name: string;
  requester_location_id: number | string;
  requester_location_name: string;
  submitted_by: number | string;
  submitted_by_name: string;
  status: string;
  reason: string;
  requested_at: string;
  approved_at: string | null;

  shipment_id: number | string | null;
  shipment_code: string | null;
  shipment_status: string | null;
};

type RequestItemForm = {
  aid_item_id: string;
  requested_qty: string;
};

type User = {
  id: number;
  name: string;
  role?: {
    code: string;
    name?: string;
  };
};

export default function PoskoRequestsPage() {
  const [user, setUser] = useState<User | null>(null);

  const [requests, setRequests] = useState<AidRequest[]>([]);
  const [aidItems, setAidItems] = useState<AidItem[]>([]);
  const [events, setEvents] = useState<DisasterEvent[]>([]);
  const [locations, setLocations] = useState<EventLocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [reason, setReason] = useState("");

  const [items, setItems] = useState<RequestItemForm[]>([
    {
      aid_item_id: "",
      requested_qty: "",
    },
  ]);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchJSON(url: string) {
    const response = await fetch(url, {
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Gagal mengambil data");
    }

    return data;
  }

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const [meData, requestData, aidItemData, eventData] =
        await Promise.all([
          fetchJSON("/api/auth/me"),
          fetchJSON("/api/aid-requests"),
          fetchJSON("/api/aid-items"),
          fetchJSON("/api/events"),
        ]);

      setUser(meData.user);
      setRequests(normalizeRequests(requestData.requests));
      setAidItems(normalizeAidItems(aidItemData.items));

      const activeEvents = normalizeEvents(eventData.events).filter(
        (event) => event.status === "ACTIVE",
      );

      setEvents(activeEvents);

      if (activeEvents.length > 0) {
        const activeEvent = activeEvents[0];

        setSelectedEventId(String(activeEvent.id));

        await loadEventLocations(activeEvent.id);
      }
    } catch (err) {
      console.error("Load posko requests page error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data halaman pengajuan",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadEventLocations(eventId: number | string) {
    try {
      setLoadingFormData(true);

      /*
       * Endpoint event detail diasumsikan mengembalikan:
       * {
       *   success: true,
       *   event: {
       *     ...
       *     locations: [...]
       *   }
       * }
       *
       * Jika endpoint /api/events/[id] kamu memiliki struktur berbeda,
       * bagian ini tinggal disesuaikan tanpa mengubah form submit.
       */

      const data = await fetchJSON(`/api/events/${eventId}`);

      const eventLocations = normalizeLocations(
        data.event?.locations ?? data.locations ?? [],
      );

      setLocations(eventLocations);

      if (eventLocations.length > 0) {
        setSelectedLocationId(String(eventLocations[0].id));
      } else {
        setSelectedLocationId("");
      }
    } catch (err) {
      console.error("Load event locations error:", err);

      setLocations([]);
      setSelectedLocationId("");

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil lokasi posko",
      );
    } finally {
      setLoadingFormData(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  function normalizeRequests(value: unknown): AidRequest[] {
    if (!Array.isArray(value)) return [];

    return value.map((request) => ({
      ...request,
      id: Number(request.id),
      disaster_event_id: Number(request.disaster_event_id),
      requester_location_id: Number(request.requester_location_id),
      submitted_by: Number(request.submitted_by),
      shipment_id:
        request.shipment_id === null
          ? null
          : Number(request.shipment_id),
    }));
  }

  function normalizeAidItems(value: unknown): AidItem[] {
    if (!Array.isArray(value)) return [];

    return value.map((item) => ({
      ...item,
      id: Number(item.id),
    }));
  }

  function normalizeEvents(value: unknown): DisasterEvent[] {
    if (!Array.isArray(value)) return [];

    return value.map((event) => ({
      ...event,
      id: Number(event.id),
    }));
  }

  function normalizeLocations(value: unknown): EventLocation[] {
    if (!Array.isArray(value)) return [];

    return value.map((location) => ({
      ...location,
      id: Number(location.id),
    }));
  }

  function openCreateModal() {
    setError("");
    setSuccessMessage("");

    const activeEvent = events[0];

    if (!activeEvent) {
      setError("Tidak ada event bencana aktif.");
      return;
    }

    setSelectedEventId(String(activeEvent.id));

    setReason("");

    setItems([
      {
        aid_item_id: "",
        requested_qty: "",
      },
    ]);

    setShowModal(true);

    loadEventLocations(activeEvent.id);
  }

  function closeModal() {
    if (submitting) return;

    setShowModal(false);
  }

  function addItemRow() {
    setItems((current) => [
      ...current,
      {
        aid_item_id: "",
        requested_qty: "",
      },
    ]);
  }

  function removeItemRow(index: number) {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function updateItem(
    index: number,
    field: keyof RequestItemForm,
    value: string,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function handleEventChange(value: string) {
    setSelectedEventId(value);

    const eventId = Number(value);

    if (Number.isInteger(eventId)) {
      loadEventLocations(eventId);
    } else {
      setLocations([]);
      setSelectedLocationId("");
    }
  }

  function validateForm() {
    if (!selectedEventId) {
      return "Event bencana wajib dipilih.";
    }

    if (!selectedLocationId) {
      return "Lokasi posko wajib dipilih.";
    }

    if (!reason.trim()) {
      return "Alasan permintaan wajib diisi.";
    }

    const cleanedItems = items
      .map((item) => ({
        aid_item_id: Number(item.aid_item_id),
        requested_qty: Number(item.requested_qty),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.aid_item_id) &&
          Number.isFinite(item.requested_qty) &&
          item.requested_qty > 0,
      );

    if (cleanedItems.length === 0) {
      return "Minimal satu barang bantuan harus diisi.";
    }

    const hasInvalidRow = items.some((item) => {
      const hasAidItem = item.aid_item_id !== "";
      const hasQuantity = item.requested_qty !== "";

      return (
        (hasAidItem && !hasQuantity) ||
        (!hasAidItem && hasQuantity) ||
        (hasAidItem &&
          (!Number.isInteger(Number(item.aid_item_id)) ||
            !Number.isFinite(Number(item.requested_qty)) ||
            Number(item.requested_qty) <= 0))
      );
    });

    if (hasInvalidRow) {
      return "Periksa kembali barang dan jumlah yang diminta.";
    }

    const itemIds = cleanedItems.map((item) => item.aid_item_id);

    if (new Set(itemIds).size !== itemIds.length) {
      return "Barang bantuan yang sama tidak boleh dipilih lebih dari satu kali.";
    }

    return null;
  }

  async function submitRequest() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const cleanedItems = items
      .map((item) => ({
        aid_item_id: Number(item.aid_item_id),
        requested_qty: Number(item.requested_qty),
      }))
      .filter(
        (item) =>
          Number.isInteger(item.aid_item_id) &&
          Number.isFinite(item.requested_qty) &&
          item.requested_qty > 0,
      );

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/aid-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          disaster_event_id: Number(selectedEventId),
          requester_location_id: Number(selectedLocationId),
          reason: reason.trim(),
          items: cleanedItems,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Gagal membuat permintaan bantuan",
        );
      }

      setShowModal(false);

      setReason("");

      setItems([
        {
          aid_item_id: "",
          requested_qty: "",
        },
      ]);

      setSuccessMessage(
        data.message || "Permintaan bantuan berhasil dibuat.",
      );

      await loadPage();
    } catch (err) {
      console.error("Submit aid request error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat permintaan bantuan",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((item) => item.status === "PENDING").length,
      approved: requests.filter((item) => item.status === "APPROVED").length,
      rejected: requests.filter((item) => item.status === "REJECTED").length,
    };
  }, [requests]);

  const activeEvent = events.find(
    (event) => String(event.id) === selectedEventId,
  );

  const selectedLocation = locations.find(
    (location) => String(location.id) === selectedLocationId,
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-lg bg-slate-200" />
            <div className="h-20 rounded-2xl bg-white shadow-sm" />
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-28 rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>
            <div className="h-96 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Link
                  href="/dashboard/posko"
                  className="transition hover:text-slate-900"
                >
                  Dashboard Posko
                </Link>

                <span>/</span>

                <span className="font-medium text-slate-700">
                  Pengajuan Bantuan
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Pengajuan Bantuan
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Ajukan kebutuhan bantuan dari posko kepada pemerintah.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <PlusIcon />
              Buat Pengajuan
            </button>
          </div>
        </section>

        {/* Alert */}
        {error && !showModal && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertIcon />
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircleIcon />
            <p>{successMessage}</p>
          </div>
        )}

        {/* Current Event */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <ShieldIcon />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Event Aktif
                </p>

                {activeEvent ? (
                  <>
                    <h2 className="mt-1 font-semibold text-slate-900">
                      {activeEvent.name}
                    </h2>

                    <p className="mt-0.5 text-sm text-slate-500">
                      {activeEvent.code}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    Tidak ada event aktif
                  </p>
                )}
              </div>
            </div>

            {selectedLocation && (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">
                  Lokasi Posko
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedLocation.name}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Pengajuan"
            value={stats.total}
            icon={<ClipboardIcon />}
          />

          <StatCard
            label="Menunggu Review"
            value={stats.pending}
            icon={<ClockIcon />}
          />

          <StatCard
            label="Disetujui"
            value={stats.approved}
            icon={<CheckCircleIcon />}
          />

          <StatCard
            label="Ditolak"
            value={stats.rejected}
            icon={<XCircleIcon />}
          />
        </section>

        {/* Request List */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Riwayat Pengajuan
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Daftar permintaan bantuan yang dibuat oleh posko.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {requests.length} pengajuan
              </span>
            </div>
          </div>

          {requests.length === 0 ? (
            <EmptyState onCreate={openCreateModal} />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pengajuan
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Lokasi
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Shipment
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Waktu
                      </th>

                      <th className="px-6 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {requests.map((request) => (
                      <RequestRow
                        key={request.id}
                        request={request}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-100 md:hidden">
                {requests.map((request) => (
                  <RequestMobileCard
                    key={request.id}
                    request={request}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pengajuan Baru
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Ajukan Kebutuhan Bantuan
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Lengkapi kebutuhan bantuan posko.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertIcon />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-5">
                {/* Event */}
                <Field label="Event Bencana" required>
                  <select
                    value={selectedEventId}
                    onChange={(event) =>
                      handleEventChange(event.target.value)
                    }
                    disabled={submitting}
                    className="form-select"
                  >
                    <option value="">Pilih event bencana</option>

                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.code} — {event.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Location */}
                <Field label="Lokasi Posko" required>
                  <select
                    value={selectedLocationId}
                    onChange={(event) =>
                      setSelectedLocationId(event.target.value)
                    }
                    disabled={
                      submitting ||
                      loadingFormData ||
                      !selectedEventId
                    }
                    className="form-select"
                  >
                    <option value="">
                      {loadingFormData
                        ? "Memuat lokasi..."
                        : "Pilih lokasi posko"}
                    </option>

                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>

                  {locations.length === 0 &&
                    !loadingFormData &&
                    selectedEventId && (
                      <p className="mt-2 text-xs text-amber-600">
                        Belum ada lokasi posko aktif untuk event ini.
                      </p>
                    )}
                </Field>

                {/* Reason */}
                <Field label="Alasan / Kebutuhan" required>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    disabled={submitting}
                    rows={4}
                    placeholder="Jelaskan kebutuhan bantuan secara singkat dan jelas..."
                    className="form-textarea"
                  />

                  <div className="mt-1.5 flex justify-between text-xs text-slate-400">
                    <span>
                      Jelaskan kondisi atau kebutuhan yang mendasari
                      permintaan.
                    </span>

                    <span>{reason.length}/1000</span>
                  </div>
                </Field>

                {/* Items */}
                <div>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-800">
                        Barang Bantuan
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <p className="mt-0.5 text-xs text-slate-400">
                        Tambahkan barang dan jumlah yang dibutuhkan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addItemRow}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <PlusSmallIcon />
                      Tambah Barang
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-500">
                              Barang
                            </label>

                            <select
                              value={item.aid_item_id}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "aid_item_id",
                                  event.target.value,
                                )
                              }
                              disabled={submitting}
                              className="form-select"
                            >
                              <option value="">
                                Pilih barang bantuan
                              </option>

                              {aidItems.map((aidItem) => {
                                const alreadySelected =
                                  items.some(
                                    (otherItem, otherIndex) =>
                                      otherIndex !== index &&
                                      otherItem.aid_item_id ===
                                        String(aidItem.id),
                                  );

                                return (
                                  <option
                                    key={aidItem.id}
                                    value={aidItem.id}
                                    disabled={alreadySelected}
                                  >
                                    {aidItem.name} ({aidItem.unit})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-500">
                              Jumlah
                            </label>

                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.requested_qty}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "requested_qty",
                                    event.target.value,
                                  )
                                }
                                disabled={submitting}
                                placeholder="0"
                                className="form-input pr-16"
                              />

                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                                {getAidItemUnit(
                                  aidItems,
                                  item.aid_item_id,
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              disabled={
                                submitting || items.length === 1
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Hapus barang"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <InfoIcon />

                    <div className="text-xs leading-5 text-slate-500">
                      <p className="font-semibold text-slate-700">
                        Setelah dikirim
                      </p>

                      <p className="mt-0.5">
                        Pengajuan akan berstatus{" "}
                        <span className="font-semibold text-slate-700">
                          PENDING
                        </span>{" "}
                        dan menunggu proses review/approval pemerintah.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={submitRequest}
                disabled={
                  submitting ||
                  loadingFormData ||
                  events.length === 0 ||
                  locations.length === 0 ||
                  aidItems.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <SpinnerIcon />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <SendIcon />
                    Kirim Pengajuan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function RequestRow({ request }: { request: AidRequest }) {
  return (
    <tr className="group transition hover:bg-slate-50/70">
      <td className="px-6 py-4">
        <div>
          <p className="font-semibold text-slate-900">
            {request.request_code}
          </p>

          <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
            {request.reason}
          </p>
        </div>
      </td>

      <td className="px-6 py-4">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {request.requester_location_name}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {request.event_code}
          </p>
        </div>
      </td>

      <td className="px-6 py-4">
        <StatusBadge status={request.status} />
      </td>

      <td className="px-6 py-4">
        {request.shipment_id ? (
          <div>
            <p className="text-sm font-medium text-slate-700">
              {request.shipment_code}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {formatShipmentStatus(request.shipment_status)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            Belum tersedia
          </span>
        )}
      </td>

      <td className="whitespace-nowrap px-6 py-4">
        <p className="text-sm text-slate-600">
          {formatDate(request.requested_at)}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          {formatTime(request.requested_at)}
        </p>
      </td>

      <td className="px-6 py-4 text-right">
        <Link
          href={`/dashboard/posko/requests/${request.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
        >
          Detail
          <ArrowRightIcon />
        </Link>
      </td>
    </tr>
  );
}

function RequestMobileCard({
  request,
}: {
  request: AidRequest;
}) {
  return (
    <Link
      href={`/dashboard/posko/requests/${request.id}`}
      className="block p-5 transition hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">
            {request.request_code}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatDate(request.requested_at)} ·{" "}
            {formatTime(request.requested_at)}
          </p>
        </div>

        <StatusBadge status={request.status} />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-slate-400">
            Lokasi
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {request.requester_location_name}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400">
            Alasan
          </p>

          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {request.reason}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs text-slate-400">Shipment</p>

            <p className="mt-0.5 text-sm font-medium text-slate-700">
              {request.shipment_code ?? "Belum tersedia"}
            </p>
          </div>

          <ArrowRightIcon />
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    PENDING: {
      label: "Menunggu Review",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    APPROVED: {
      label: "Disetujui",
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    REJECTED: {
      label: "Ditolak",
      className: "bg-red-50 text-red-700 ring-red-200",
    },
  };

  const current = config[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${current.className}`}
    >
      {current.label}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <ClipboardIcon size={26} />
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">
        Belum ada pengajuan
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Buat pengajuan kebutuhan bantuan pertama untuk posko
        kamu.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <PlusIcon size={16} />
        Buat Pengajuan
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function getAidItemUnit(
  aidItems: AidItem[],
  aidItemId: string,
) {
  const item = aidItems.find(
    (aidItem) => String(aidItem.id) === aidItemId,
  );

  return item?.unit ?? "";
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShipmentStatus(status: string | null) {
  if (!status) return "-";

  const labels: Record<string, string> = {
    PREPARING: "Menyiapkan",
    READY: "Siap Dikirim",
    IN_TRANSIT: "Dalam Perjalanan",
    DELIVERED: "Diterima",
    CANCELLED: "Dibatalkan",
  };

  return labels[status] ?? status;
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusSmallIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ClipboardIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M9 18h3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0"
    >
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-slate-500"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="opacity-90"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}