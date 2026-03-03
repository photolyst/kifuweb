import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// id_name_map.txt を読み込んでマップを構築（サーバー起動時に1回だけ）
function loadIdNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const filePath = path.join(process.cwd(), "src/lib/fox/id_name_map.txt");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const id = trimmed.slice(0, eqIndex).trim();
      const name = trimmed.slice(eqIndex + 1).trim();
      if (id && name) map.set(id, name);
    }
  } catch {
    // ファイルが読めない場合はマップ空で続行
  }
  return map;
}

const idNameMap = loadIdNameMap();

// PB[id] / PW[id] を名前に置換
function idToName(sgf: string): string {
  return sgf.replace(/P[BW]\[([^\]]+)\]/g, (match, id) => {
    const tag = match.slice(0, 2);
    const name = idNameMap.get(id);
    return name ? `${tag}[${name}]` : match;
  });
}

// KM修正
function fixKomi(sgf: string): string {
  return sgf.replace(/KM\[([1-9][0-9]*)\]/g, (match, val) => {
    if (val === "375") return "KM[7.5]";
    if (val === "650") return "KM[6.5]";
    return match;
  });
}

// 段・级の標準化
function standardizeRanks(sgf: string): string {
  return sgf.replace(/级/g, "k*").replace(/段/g, "d*");
}

function transformSgf(sgf: string): string {
  return idToName(standardizeRanks(fixKomi(sgf)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chessid = searchParams.get("chessid");

  if (!chessid) {
    return NextResponse.json({ error: "chessid is required" }, { status: 400 });
  }

  const params = new URLSearchParams({ chessid });
  const url = `https://h5.foxwq.com/yehuDiamond/chessbook_local/YHWQFetchChess?${params}`;

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (data.chess) {
        return NextResponse.json({ sgf: transformSgf(data.chess) });
      }
    } catch {
      if (i === 9) {
        return NextResponse.json(
          { error: "Failed to fetch SGF after 10 retries" },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ error: "SGF not found" }, { status: 404 });
}
