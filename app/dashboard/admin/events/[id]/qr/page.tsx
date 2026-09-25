"use client";

import { useEffect, useState } from "react";

import { importEventQRKey } from "@/lib/qr-crypto";

type EventData = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export default function EventQRPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { id } = await params;

        const response = await fetch(
          `/api/events/${id}/qr-key`
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message);
        }

        await importEventQRKey(
          String(data.event.id),
          data.key
        );

        setEvent(data.event);

        setMessage(
          "Perangkat ini sudah terdaftar untuk membaca QR event ini secara offline."
        );
      } catch (error) {
        console.error(error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Gagal menyiapkan QR key."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params]);

  if (loading) {
    return (
      <main className="p-6">
        <p>Menyiapkan QR key...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold">
        QR Event
      </h1>

      {event && (
        <div className="mt-6 rounded-xl border p-5">
          <p className="text-sm text-gray-500">
            Event
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            {event.name}
          </h2>

          <p className="mt-2 text-sm">
            Code: {event.code}
          </p>

          <p className="mt-1 text-sm">
            Status: {event.status}
          </p>
        </div>
      )}

      {message && (
        <div className="mt-6 rounded-lg border bg-gray-50 p-4 text-sm">
          {message}
        </div>
      )}
    </main>
  );
}