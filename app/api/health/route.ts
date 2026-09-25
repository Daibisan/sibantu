import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query("SELECT NOW() AS time");

    return NextResponse.json({
      success: true,
      message: "API is running",
      database: "connected",
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}