.PHONY: dev
dev:
	pnpm dev

.PHONY: start
start: supabase.start

.PHONY: stop
stop: supabase.stop

# ---------------------

.PHONY: supabase.start
supabase.start:
	pnpm dlx env-cmd -f .env.local supabase start

.PHONY: supabase.status
supabase.status:
	pnpm exec supabase status

.PHONY: supabase.stop
supabase.stop:
	pnpm exec supabase stop

# DBをリセット(ローカルDBのデータを全て削除して初期状態に戻す)
.PHONY: supabase.db.reset
supabase.db.reset:
	pnpm exec supabase db reset

# 型定義を生成(ローカルDBのスキーマからTypescriptの型定義を生成する)
# .PHONY: gen
# gen:
# 	pnpm exec supabase gen types typescript --local > src/types/supabase.ts
