import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  const headerList = await headers();
  return NextResponse.json({
    'request.headers.x-site-id': request.headers.get('x-site-id'),
    'request.headers.x-site-code': request.headers.get('x-site-code'),
    'request.headers.host': request.headers.get('host'),
    'headers().x-site-id': headerList.get('x-site-id'),
    'headers().x-site-code': headerList.get('x-site-code'),
    'headers().host': headerList.get('host'),
  });
}
