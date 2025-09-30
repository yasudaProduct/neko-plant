import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabaseの認証コールバック
 * @param request - リクエスト
 * @returns リダイレクト
 * @description このルートは、クライアントで認証トークンが取得されたときに呼び出されます。
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    // 許可するリダイレクト先はアプリ内部パスのみ
    const isSafeInternalPath = (value: string) => {
        return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    }

    const getSafeOrigin = (): string => {
        const base = process.env.NEXT_PUBLIC_APP_BASE_URL
        try {
            if (base) {
                return new URL(base).origin
            }
        } catch {
        }
        return new URL(request.url).origin
    }

    const safeOrigin = getSafeOrigin()
    const safeNextPath = isSafeInternalPath(next) ? next : '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const destination = new URL(safeNextPath, safeOrigin).toString()
            return NextResponse.redirect(destination)
        }
    }

    return NextResponse.redirect(new URL('/auth/auth-code-error', safeOrigin).toString())
}