import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
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

    const { id } = await params;

    const requestResult = await db.query(
      `
      SELECT
        ar.id,
        ar.request_code,
        ar.disaster_event_id,
        de.code AS event_code,
        de.name AS event_name,

        ar.requester_location_id,
        pl.name AS requester_location_name,
        pl.address AS requester_location_address,

        ar.audit_location_id,

        ar.submitted_by,
        u.name AS submitted_by_name,

        ar.status,
        ar.reason,
        ar.requested_at,
        ar.approved_at

      FROM aid_requests ar

      JOIN disaster_events de
        ON de.id = ar.disaster_event_id

      JOIN event_locations el
        ON el.id = ar.requester_location_id

      JOIN physical_locations pl
        ON pl.id = el.physical_location_id

      JOIN users u
        ON u.id = ar.submitted_by

      WHERE ar.id = $1::bigint
      LIMIT 1
      `,
      [id]
    );

    if (requestResult.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Permintaan bantuan tidak ditemukan",
        },
        { status: 404 }
      );
    }

    const itemsResult = await db.query(
      `
      SELECT
        ari.id,
        ari.aid_item_id,

        ai.code AS item_code,
        ai.name AS item_name,
        ai.unit,
        ai.description,

        ari.requested_qty,
        ari.approved_qty,
        ari.status

      FROM aid_request_items ari

      JOIN aid_items ai
        ON ai.id = ari.aid_item_id

      WHERE ari.request_id = $1::bigint

      ORDER BY ari.id ASC
      `,
      [id]
    );

    const reviewsResult = await db.query(
      `
      SELECT
        rr.id,
        rr.reviewer_id,
        u.name AS reviewer_name,
        rr.review_type,
        rr.decision,
        rr.note,
        rr.reviewed_at

      FROM request_reviews rr

      JOIN users u
        ON u.id = rr.reviewer_id

      WHERE rr.request_id = $1::bigint

      ORDER BY rr.reviewed_at DESC
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
      request: requestResult.rows[0],
      items: itemsResult.rows,
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    console.error("Get aid request detail error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil detail permintaan bantuan",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  const client = await db.connect();

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

    if (user.role?.code !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Hanya ADMIN yang dapat melakukan review",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();

    const {
      decision,
      note,
      items,
    } = body;

    const allowedDecisions = [
      "APPROVED",
      "REJECTED",
      "NEEDS_REVISION",
    ];

    if (!allowedDecisions.includes(decision)) {
      return NextResponse.json(
        {
          success: false,
          message: "Decision tidak valid",
        },
        { status: 400 }
      );
    }

    if (!note || !note.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Catatan review wajib diisi",
        },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // =========================================================
    // 1. Ambil request dan lock row
    // =========================================================

    const requestResult = await client.query(
      `
      SELECT
        id,
        status
      FROM aid_requests
      WHERE id = $1::bigint
      FOR UPDATE
      `,
      [id]
    );

    if (requestResult.rowCount === 0) {
      throw new Error("Permintaan bantuan tidak ditemukan");
    }

    const aidRequest = requestResult.rows[0];

    if (
      aidRequest.status !== "PENDING" &&
      aidRequest.status !== "UNDER_REVIEW"
    ) {
      throw new Error(
        `Request dengan status ${aidRequest.status} tidak dapat direview`
      );
    }

    // =========================================================
    // 2. Tentukan status request
    // =========================================================

    let requestStatus: string;

    if (decision === "APPROVED") {
      requestStatus = "APPROVED";
    } else if (decision === "REJECTED") {
      requestStatus = "REJECTED";
    } else {
      requestStatus = "UNDER_REVIEW";
    }

    // =========================================================
    // 3. Jika APPROVED, update approved_qty setiap item
    // =========================================================

    if (decision === "APPROVED") {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error(
          "Items approval wajib dikirim ketika request disetujui"
        );
      }

      for (const item of items) {
        const aidItemId = Number(item.aid_item_id);
        const approvedQty = Number(item.approved_qty);

        if (
          !Number.isInteger(aidItemId) ||
          !Number.isFinite(approvedQty) ||
          approvedQty < 0
        ) {
          throw new Error("Data approval item tidak valid");
        }

        const itemResult = await client.query(
          `
          SELECT
            id,
            requested_qty
          FROM aid_request_items
          WHERE request_id = $1::bigint
            AND aid_item_id = $2::bigint
          FOR UPDATE
          `,
          [id, aidItemId]
        );

        if (itemResult.rowCount === 0) {
          throw new Error(
            `Item bantuan ${aidItemId} tidak ditemukan dalam request`
          );
        }

        const requestItem = itemResult.rows[0];

        const requestedQty = Number(requestItem.requested_qty);

        if (approvedQty > requestedQty) {
          throw new Error(
            `Approved quantity item ${aidItemId} melebihi jumlah yang diminta`
          );
        }

        let itemStatus = "REJECTED";

        if (
          approvedQty > 0 &&
          approvedQty < requestedQty
        ) {
          itemStatus = "PARTIALLY_APPROVED";
        } else if (
          approvedQty === requestedQty
        ) {
          itemStatus = "APPROVED";
        }

        await client.query(
          `
          UPDATE aid_request_items
          SET
            approved_qty = $1::numeric,
            status = $2::varchar
          WHERE id = $3::bigint
          `,
          [
            approvedQty,
            itemStatus,
            requestItem.id,
          ]
        );
      }
    }

    // =========================================================
    // 4. Jika REJECTED, semua item ditolak
    // =========================================================

    if (decision === "REJECTED") {
      await client.query(
        `
        UPDATE aid_request_items
        SET
          approved_qty = 0,
          status = 'REJECTED'
        WHERE request_id = $1::bigint
        `,
        [id]
      );
    }

    // =========================================================
    // 5. Simpan review
    // =========================================================

    await client.query(
      `
      INSERT INTO request_reviews (
        request_id,
        reviewer_id,
        review_type,
        decision,
        note
      )
      VALUES (
        $1::bigint,
        $2::bigint,
        $3::varchar,
        $4::varchar,
        $5::text
      )
      `,
      [
        id,
        user.id,
        "BPBD_REVIEW",
        decision,
        note.trim(),
      ]
    );

    // =========================================================
    // 6. Update status request
    // =========================================================

    await client.query(
      `
      UPDATE aid_requests
      SET
        status = $1::varchar,
        approved_at = CASE
          WHEN $2::varchar = 'APPROVED' THEN NOW()
          ELSE approved_at
        END
      WHERE id = $3::bigint
      `,
      [
        requestStatus,
        decision,
        id,
      ]
    );

    // =========================================================
    // 7. Commit
    // =========================================================

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Review request berhasil disimpan",
      request: {
        id: Number(id),
        status: requestStatus,
        decision,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Review aid request error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal melakukan review request",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}