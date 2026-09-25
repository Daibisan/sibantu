import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const acceptHeader = request.headers.get("accept") || "";
  const isJson = acceptHeader.includes("application/json");

  const response = isJson
    ? NextResponse.json({
        success: true,
        message: "Logout berhasil",
      })
    : NextResponse.redirect(new URL("/login", request.url), 303);

  response.cookies.set({
    name: "sibantu_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}