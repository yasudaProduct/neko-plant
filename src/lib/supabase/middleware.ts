import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";

  // CSP nonce生成（本番環境のみ）
  const nonce = isProd ? Buffer.from(crypto.randomUUID()).toString('base64') : '';

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (
    !session &&
    protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = '/signin'
      return NextResponse.redirect(url)
    }

    // Check if user has admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // CSPヘッダーを設定
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self'${isProd ? ` 'nonce-${nonce}'` : " 'unsafe-eval' 'unsafe-inline'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https: wss:${isProd ? '' : ' ws:'}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://confirmed-giant-27d.notion.site",
    "frame-src 'self' https://confirmed-giant-27d.notion.site/ebd/1c69f17f06688007995fc3497043f841",
    ...(isProd ? ["block-all-mixed-content", "upgrade-insecure-requests"] : []),
  ].join("; ");

  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)

  // nonceをリクエストヘッダーに追加
  if (isProd && nonce) {
    supabaseResponse.headers.set('x-nonce', nonce)
  }

  return supabaseResponse
}

const protectedPaths = [
  "/private",
  "/settings/profile",
  "/settings/account",
  "/plants/new",
];
