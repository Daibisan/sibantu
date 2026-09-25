import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  getUserById,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get("sibantu_session")?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Belum login",
        },
        { status: 401 }
      );
    }

    const userId = verifySession(session);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Session tidak valid atau sudah expired",
        },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User tidak ditemukan atau tidak aktif",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server",
      },
      { status: 500 }
    );
  }
}