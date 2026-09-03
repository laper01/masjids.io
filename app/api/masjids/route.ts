// app/api/masjids/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}masjids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await apiRes.json();
    console.log(data);
    

    if (!apiRes.ok) {
      return NextResponse.json(data, { status: apiRes.status });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('MASJID CREATE API ERROR:', error);
    return NextResponse.json(
      { message: 'Internal server error (Next.js Proxy).' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}masjids`;
    const fullUrl = `${baseUrl}?${searchParams.toString()}`;

    const apiResponse = await fetch(fullUrl, {
      method: "GET",
      cache: 'no-store',
    });

    const result = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(result, { status: apiResponse.status });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("MASJID LIST API ERROR:", error);
    return NextResponse.json(
      { message: 'Internal server error (Next.js Proxy).' },
      { status: 500 }
    );
  }
}