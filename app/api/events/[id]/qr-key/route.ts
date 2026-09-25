import { NextResponse } from "next/server";
import crypto from "crypto";

import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function getEventQRKey(eventId: string) {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET belum tersedia.");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`sibantu-qr-event:${eventId}`)
    .digest("base64");
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Belum login",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const eventResult = await db.query(
      `
      SELECT
        id,
        code,
        name,
        status
      FROM disaster_events
      WHERE id = $1::bigint
      `,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Event tidak ditemukan",
        },
        { status: 404 }
      );
    }

    const event = eventResult.rows[0];

    const key = getEventQRKey(String(event.id));

    return NextResponse.json({
      success: true,
      event: {
        id: String(event.id),
        code: event.code,
        name: event.name,
        status: event.status,
      },
      key,
    });
  } catch (error) {
    console.error("Get QR key error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil QR key",
      },
      { status: 500 }
    );
  }
}