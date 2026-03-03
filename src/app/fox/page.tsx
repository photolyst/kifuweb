"use client";

import { useState } from "react";
import Encoding from "encoding-japanese";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FoxUserInfo = {
  uid?: number;
  [key: string]: unknown;
};

type ChessGame = {
  chessid: string;
  starttime: string;
  blackenname: string;
  whiteenname: string;
  [key: string]: unknown;
};

// 段・级の表記を標準化（ファイル名用）
function sanitizeFilename(name: string): string {
  return name.replace(/级/g, "k*").replace(/段/g, "d*");
}

function gameLabel(game: ChessGame): string {
  const date = game.starttime.split(" ")[0].replace(/-/g, ".");
  const id = game.chessid.slice(10);
  return `${date} ${id} ${game.blackenname} VS ${game.whiteenname}`;
}

function downloadFile(filename: string, content: string, sjis: boolean) {
  let blob: Blob;
  if (sjis) {
    const sjisArray = Encoding.convert(Encoding.stringToCode(content), {
      to: "SJIS",
      from: "UNICODE",
    });
    // ファイル名もSJISエンコード可能な文字に変換
    const safeFilename = sanitizeFilename(filename);
    blob = new Blob([new Uint8Array(sjisArray)], {
      type: "text/plain;charset=shift_jis",
    });
    filename = safeFilename;
  } else {
    blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.sgf`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FoxPage() {
  const [username, setUsername] = useState("");
  const [userInfo, setUserInfo] = useState<FoxUserInfo | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);

  const [games, setGames] = useState<ChessGame[] | null>(null);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [isGamesLoading, setIsGamesLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [useSjis, setUseSjis] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  // ユーザー情報取得
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsUserLoading(true);
    setUserError(null);
    setUserInfo(null);
    setIsUserInfoOpen(false);
    setGames(null);
    setGamesError(null);
    setSelectedIds(new Set());

    try {
      const res = await fetch(
        `/api/fox/user?username=${encodeURIComponent(username.trim())}`,
      );
      const data = await res.json();
      if (!res.ok || data.uid == null) {
        setUserError(data.error ?? "ユーザーが見つかりませんでした");
        return;
      }
      setUserInfo(data);
    } catch {
      setUserError("通信エラーが発生しました");
    } finally {
      setIsUserLoading(false);
    }
  };

  // 棋譜一覧取得
  const handleFetchGames = async () => {
    if (!userInfo?.uid) return;

    setIsGamesLoading(true);
    setGamesError(null);
    setGames(null);
    setSelectedIds(new Set());

    try {
      const res = await fetch(`/api/fox/games?uid=${userInfo.uid}`);
      const data = await res.json();
      if (!res.ok) {
        setGamesError(data.error ?? "エラーが発生しました");
        return;
      }
      const chesslist: ChessGame[] = data.chesslist ?? [];
      if (chesslist.length === 0) {
        setGamesError("棋譜が見つかりませんでした");
        return;
      }
      setGames(chesslist);
    } catch {
      setGamesError("通信エラーが発生しました");
    } finally {
      setIsGamesLoading(false);
    }
  };

  // チェックボックス操作
  const toggleGame = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!games) return;
    if (selectedIds.size === games.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(games.map((g) => g.chessid)));
    }
  };

  // 選択した棋譜をダウンロード
  const handleDownload = async () => {
    if (!games || selectedIds.size === 0) return;

    setIsDownloading(true);
    const targets = games.filter((g) => selectedIds.has(g.chessid));

    for (let i = 0; i < targets.length; i++) {
      const game = targets[i];
      setDownloadProgress(`ダウンロード中... (${i + 1}/${targets.length})`);

      try {
        const rawFilename = gameLabel(game);
        const params = new URLSearchParams({
          chessid: game.chessid,
          sjis: String(useSjis),
          filename: rawFilename,
        });
        const res = await fetch(`/api/fox/sgf?${params}`);
        const data = await res.json();
        if (!res.ok || !data.sgf) continue;

        const filename = data.filename || rawFilename;
        downloadFile(filename, data.sgf, useSjis);

        // 連続ダウンロードの間隔
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        // 1件失敗しても継続
      }
    }

    setIsDownloading(false);
    setDownloadProgress("");
  };

  const allChecked = !!games && selectedIds.size === games.length;
  const someChecked = selectedIds.size > 0 && !allChecked;

  return (
    <div className="flex min-h-svh w-full items-start justify-center p-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-bold">Fox囲碁 棋譜ダウンロード</h1>

        {/* ユーザー検索 */}
        <Card>
          <CardHeader>
            <CardTitle>ユーザー名を入力</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUserSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Fox IDを入力してください"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isUserLoading}
              />
              <Button
                type="submit"
                disabled={isUserLoading || !username.trim()}
              >
                {isUserLoading ? "検索中..." : "ユーザー情報を取得"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {userError && <p className="text-sm text-destructive">{userError}</p>}

        {/* ユーザー情報（折りたたみ） */}
        {userInfo && (
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setIsUserInfoOpen((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <CardTitle>ユーザー情報</CardTitle>
                <span className="text-muted-foreground text-sm">
                  {isUserInfoOpen ? "▲ 閉じる" : "▼ 開く"}
                </span>
              </button>
            </CardHeader>
            {isUserInfoOpen && (
              <CardContent>
                <dl className="flex flex-col gap-2 text-sm">
                  {Object.entries(userInfo).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <dt className="w-32 shrink-0 font-medium text-muted-foreground">
                        {key}
                      </dt>
                      <dd className="break-all">{String(value ?? "—")}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            )}
          </Card>
        )}

        {/* 棋譜一覧を取得ボタン */}
        {userInfo && (
          <Button
            onClick={handleFetchGames}
            disabled={isGamesLoading}
            variant="outline"
          >
            {isGamesLoading ? "取得中..." : "棋譜一覧を取得"}
          </Button>
        )}

        {gamesError && <p className="text-sm text-destructive">{gamesError}</p>}

        {/* 棋譜一覧 */}
        {games && (
          <Card>
            <CardHeader>
              <CardTitle>棋譜一覧（{games.length}件）</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* 全選択 */}
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4"
                />
                すべて選択
              </label>

              <ul className="flex flex-col divide-y text-sm">
                {games.map((game) => {
                  const date = game.starttime.split(" ")[0].replace(/-/g, ".");
                  const id = game.chessid.slice(10);
                  return (
                    <li key={game.chessid} className="py-2">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(game.chessid)}
                          onChange={() => toggleGame(game.chessid)}
                          className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {game.blackenname} vs {game.whiteenname}
                          </span>
                          <span className="text-muted-foreground">
                            {date}　{id}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {/* SJISオプションとダウンロードボタン */}
              <div className="flex flex-col gap-3 border-t pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useSjis}
                    onChange={(e) => setUseSjis(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Shift_JIS形式でダウンロード
                </label>

                <Button
                  onClick={handleDownload}
                  disabled={isDownloading || selectedIds.size === 0}
                >
                  {isDownloading
                    ? downloadProgress
                    : `選択した棋譜をダウンロード（${selectedIds.size}件）`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
