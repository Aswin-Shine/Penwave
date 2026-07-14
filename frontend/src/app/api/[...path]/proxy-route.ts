import { type NextRequest, NextResponse } from 'next/server';

// BACKEND_URL is a server-side env var — never baked into the client bundle.
// Set it in docker-compose.yml as BACKEND_URL=http://backend:4000/api
// Falls back to localhost for local development without Docker.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000/api';

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');

  // Reconstruct query string
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/${pathStr}${searchParams ? `?${searchParams}` : ''}`;

  // Forward all headers except host (which would confuse the backend)
  const headers = new Headers(request.headers);
  headers.delete('host');

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      // Required for streaming request bodies
      duplex: 'half',
    } as RequestInit);

    // Forward response headers (especially Set-Cookie for auth)
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('set-cookie');
    for (const cookie of response.headers.getSetCookie()) {
      responseHeaders.append('set-cookie', cookie);
    }

    //  FIX: Return the actual response back to the client!
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error(`[API Proxy] Failed to reach backend at ${url}:`, err);
    return NextResponse.json(
      { success: false, message: 'Backend unreachable' },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;

// Disable body size limit — let backend handle its own limits
export const config = {
  api: {
    bodyParser: false,
  },
};