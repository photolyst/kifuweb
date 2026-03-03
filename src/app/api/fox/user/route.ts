import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "username is required" },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    srcuid: "0",
    dstuid: "0",
    dstuin: "0",
    username,
    accounttype: "0",
    clienttype: "0",
  });

  const url = `https://h5.foxwq.com/getFechInfo/wxnseed/txwq_fetch_personal_info?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Fox API error: ${response.status}` },
        { status: response.status },
      );
    }
    const data = await response.json();
    if (data.uid === 0 || data.uid == null) {
      return NextResponse.json(
        { error: "ユーザーが見つかりませんでした" },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
