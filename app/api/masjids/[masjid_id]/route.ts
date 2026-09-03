import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";

type RouteParams = { params: Promise<{ masjid_id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { masjid_id } = await params;
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}masjids/${masjid_id}`;
    const apiResponse = await fetch(apiUrl, { method: "GET", cache: 'no-store' });
    const result = await apiResponse.json();
    if (!apiResponse.ok) return NextResponse.json(result, { status: apiResponse.status });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(`GET MASJID ${masjid_id} API ERROR:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { masjid_id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}masjids/${masjid_id}`;
    const apiResponse = await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.accessToken}` },
      body: JSON.stringify(body),
    });
    const result = await apiResponse.json();
    if (!apiResponse.ok) return NextResponse.json(result, { status: apiResponse.status });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(`PATCH MASJID ${masjid_id} API ERROR:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { masjid_id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}masjids/${masjid_id}`;
    const apiResponse = await fetch(apiUrl, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${session.accessToken}` },
    });
    if (apiResponse.status === 204) return new NextResponse(null, { status: 204 });
    const text = await apiResponse.text();
    const result = text ? JSON.parse(text) : {};
    if (!apiResponse.ok) return NextResponse.json(result, { status: apiResponse.status });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(`DELETE MASJID ${masjid_id} API ERROR:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}