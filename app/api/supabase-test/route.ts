import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      // If you're not logged in, `session` will be null, but
      // this still confirms Supabase is reachable and keys work.
      session: data.session ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown Supabase connection error';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

