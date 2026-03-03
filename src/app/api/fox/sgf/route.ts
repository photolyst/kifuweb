import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function loadTextMap(filename: string): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const filePath = path.join(process.cwd(), `src/lib/fox/${filename}`);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim();
      if (key && val) map.set(key, val);
    }
  } catch {
    // ファイルが読めない場合はマップ空で続行
  }
  return map;
}

const idNameMap = loadTextMap("id_name_map.txt");
const utf8SjisMap = loadTextMap("utf8_sjis_map.txt");

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

// utf8_sjis_map を使って文字を置換（SJIS変換時のみ適用）
function applyUtf8SjisMap(text: string): string {
  return [...text].map((c) => utf8SjisMap.get(c) ?? c).join("");
}

function transformSgf(sgf: string, sjis: boolean): string {
  const base = idToName(standardizeRanks(fixKomi(sgf)));
  return sjis ? applyUtf8SjisMap(base) : base;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chessid = searchParams.get("chessid");
  const sjis = searchParams.get("sjis") === "true";
  const rawFilename = searchParams.get("filename") ?? "";

  if (!chessid) {
    return NextResponse.json({ error: "chessid is required" }, { status: 400 });
  }

  const filename = sjis ? applyUtf8SjisMap(rawFilename) : rawFilename;

  const params = new URLSearchParams({ chessid });
  const url = `https://h5.foxwq.com/yehuDiamond/chessbook_local/YHWQFetchChess?${params}`;

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (data.chess) {
        return NextResponse.json({
          sgf: transformSgf(data.chess, sjis),
          filename,
        });
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
