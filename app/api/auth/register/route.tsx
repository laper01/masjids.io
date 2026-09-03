import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Baca body dari request asli
    const body = await req.json();
    const { email, username, password, firstName, lastName, phoneNumber, gender } = body;

    // 2. Validasi required fields
    const missing: string[] = [];
    if (!email)     missing.push("email");
    if (!username)  missing.push("username");
    if (!password)  missing.push("password");
    if (!firstName) missing.push("firstName");
    if (!lastName)  missing.push("lastName");

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: Object.fromEntries(missing.map((f) => [f, [`${f} is required.`]])),
        },
        { status: 422 }
      );
    }

    // 3. Map camelCase → snake_case
    const backendPayload = {
      email,
      username,
      password,
      first_name:   firstName,
      last_name:    lastName,
      phone_number: phoneNumber,
      gender,
    };

    // 4. Buat Request baru pakai Web API standard (bukan NextRequest)
    const newHeaders = new Headers(req.headers);
    newHeaders.delete("content-length"); // hindari mismatch
    newHeaders.set("content-type", "application/json");

    const modifiedReq = new Request(req.url, {  // ✅ pakai Request biasa
      method: "POST",
      headers: newHeaders,
      body: JSON.stringify(backendPayload),
    });

    console.log("[AUTH-01] payload →", JSON.stringify(backendPayload, null, 2));

    // 5. Forward ke proxy
    return proxyPOST(modifiedReq, "/auth/register", undefined);

  } catch (error) {
    console.error("[AUTH-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}