import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    // Resolve Supabase session so we can associate chats with the
    // logged-in user in the FastAPI backend.
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // No-op: we don't need to modify cookies in this handler.
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const userId = session?.user?.id;

    // Call FastAPI backend
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${pythonBackendUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        session_id: sessionId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`FastAPI backend error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      sessionId: data.session_id,
      message: data.response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
