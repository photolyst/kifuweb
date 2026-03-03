import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";

export default function Home() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Button asChild>
          <Link href="/fox">野狐囲碁 棋譜ダウンロード</Link>
        </Button>
      </div>
    </div>
  );
}
