import { NextResponse } from 'next/server';
import { getActiveLocales } from '@/lib/settings';

export async function GET() {
  const activeLocales = await getActiveLocales();
  return NextResponse.json({ locales: activeLocales });
}
