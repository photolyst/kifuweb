import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");

  if (!uid) {
    return NextResponse.json({ error: "uid is required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    type: "4",
    uid,
  });

  const url = `https://h5.foxwq.com/yehuDiamond/chessbook_local/YHWQFetchChessList?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Fox API error: ${response.status}` },
        { status: response.status },
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
