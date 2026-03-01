import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'hello@layoutsbylenny.com';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 submissions per hour per IP

// In-memory rate limit store (resets on server restart)
const rateLimitStore = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Get existing timestamps for this IP
  const timestamps = rateLimitStore.get(ip) || [];

  // Filter to only keep timestamps within the window
  const recentTimestamps = timestamps.filter((t) => t > windowStart);

  // Check if rate limited
  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  // Add current timestamp and update store
  recentTimestamps.push(now);
  rateLimitStore.set(ip, recentTimestamps);

  // Cleanup old entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupRateLimitStore();
  }

  return false;
}

function cleanupRateLimitStore() {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const recentTimestamps = timestamps.filter((t) => t > windowStart);
    if (recentTimestamps.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, recentTimestamps);
    }
  }
}

function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP (behind proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback
  return 'unknown';
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string; // Honeypot field
  locale?: string;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const body = (await request.json()) as ContactFormData;
    const { name, email, subject, message, website, locale = 'en' } = body;

    // Honeypot check - if filled, silently "succeed" to not tip off bots
    if (website && website.length > 0) {
      console.log(`Honeypot triggered from IP: ${clientIp}`);
      return NextResponse.json({ success: true });
    }

    // Rate limiting check
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        {
          error:
            locale === 'nl'
              ? 'Te veel verzoeken. Probeer het later opnieuw.'
              : 'Too many requests. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: locale === 'nl' ? 'Alle velden zijn verplicht' : 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: locale === 'nl' ? 'Ongeldig e-mailadres' : 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (name.length > 100) {
      return NextResponse.json(
        { error: locale === 'nl' ? 'Naam is te lang' : 'Name is too long' },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: locale === 'nl' ? 'Onderwerp is te lang' : 'Subject is too long' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: locale === 'nl' ? 'Bericht is te lang' : 'Message is too long' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const safeName = sanitizeInput(name);
    const safeSubject = sanitizeInput(subject);
    const safeMessage = sanitizeInput(message).replace(/\n/g, '<br>');

    // Build email content
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Form Submission</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Contact Form Submission</h1>
  </div>

  <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <table style="width: 100%;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 100px;">From:</td>
        <td style="padding: 8px 0;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Email:</td>
        <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #1a1a1a;">${email}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
        <td style="padding: 8px 0;">${safeSubject}</td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

    <div style="padding: 10px 0;">
      <strong>Message:</strong>
      <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${safeMessage}</p>
    </div>
  </div>

  <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
    This message was sent via the Layouts by Lenny contact form.
  </p>
</body>
</html>
    `.trim();

    const text = `Contact Form Submission\n\nFrom: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;

    // Send email
    const result = await sendEmail({
      to: CONTACT_EMAIL,
      subject: `[Contact] ${subject}`,
      html,
      text,
    });

    if (!result.success) {
      console.error('Failed to send contact form email:', result.error);
      return NextResponse.json(
        { error: locale === 'nl' ? 'Kon bericht niet verzenden. Probeer het later opnieuw.' : 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
