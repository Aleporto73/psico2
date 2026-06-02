import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isAppRoute = pathname.startsWith('/app');
  const isAdminRoute = pathname.startsWith('/admin');

  // Protect App and Admin routes
  if (isAppRoute || isAdminRoute) {
    if (!user) {
      // User is not authenticated, redirect to /login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Retrieve the user's profile from the database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // Profile does not exist yet, sign out and redirect to /login
      await supabase.auth.signOut();
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'no_profile');
      return NextResponse.redirect(loginUrl);
    }

    // Check status: blocked/inactive users cannot access private routes
    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'blocked');
      return NextResponse.redirect(loginUrl);
    }

    // Check role: customers cannot access /admin
    if (isAdminRoute && profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  }

  // Redirect authenticated active users away from login pages (but NOT /definir-senha, so they can reset their password)
  const isAuthRoute = ['/login', '/ativar-acesso', '/esqueci-senha'].includes(pathname);
  if (isAuthRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profile && profile.status === 'active') {
      const redirectTarget = profile.role === 'admin' ? '/admin' : '/app';
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
  }

  return supabaseResponse;
}
