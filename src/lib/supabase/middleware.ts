import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  // CSP nonce生成（本番環境のみ）
  const nonce = isProd ? Buffer.from(crypto.randomUUID()).toString('base64') : '';

  // CSPヘッダーを構築
  // ローカルSupabaseはhttpのため、画像の直接アップロード等ブラウザからの接続を明示的に許可する
  const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self'${isProd ? ` 'nonce-${nonce}'` : " 'unsafe-eval' 'unsafe-inline'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https: wss: ${supabaseOrigin}${isProd ? '' : ' ws:'}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://confirmed-giant-27d.notion.site",
    "frame-src 'self' https://confirmed-giant-27d.notion.site/ebd/1c69f17f06688007995fc3497043f841",
    ...(isProd ? ["block-all-mixed-content", "upgrade-insecure-requests"] : []),
  ].join("; ");

  // nonce と CSP はリクエストヘッダーにも載せる。layout.tsx の headers() や
  // Next.js のインラインスクリプトへの nonce 自動付与はリクエストヘッダーを参照するため、
  // レスポンスヘッダーだけでは nonce ベースの CSP が機能しない
  const requestHeaders = new Headers(request.headers)
  if (isProd && nonce) {
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', cspHeader)
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() はJWT署名を検証しないため、認可判定には getUser() を使う (Supabase推奨)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/signin'
      return NextResponse.redirect(url)
    }

    // Check if user has admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)

  return supabaseResponse
}

const protectedPaths = [
  "/private",
  "/settings/profile",
  "/settings/account",
  "/settings/cats",
  "/plants/new",
  "/posts/new",
];
