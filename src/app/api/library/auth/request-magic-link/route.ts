import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders } from '@/lib/site-context';
import { sendEmail } from '@/lib/email';
import { generateSessionToken } from '@/lib/customer-auth';
import { SESSION_MAX_AGE } from '@/lib/constants';

const CODE_EXPIRY_MINUTES = 10;

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, locale = 'en' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find or create customer
    const site = await getSiteFromHeaders();
    let customer = await prisma.customer.findFirst({
      where: { email: normalizedEmail, siteId: site.id },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { email: normalizedEmail, siteId: site.id },
      });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    // Delete any existing codes for this customer
    await prisma.verificationCode.deleteMany({
      where: { customerId: customer.id },
    });

    // Store the verification code
    await prisma.verificationCode.create({
      data: {
        customerId: customer.id,
        code,
        expiresAt,
      },
    });

    // Also create a pre-authenticated session for magic link login
    const sessionToken = generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    await prisma.customerSession.create({
      data: {
        customerId: customer.id,
        token: sessionToken,
        expiresAt: sessionExpiresAt,
      },
    });

    // Build the magic link URL
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;
    const magicLink = `${baseUrl}/api/auth/callback?token=${sessionToken}&returnTo=/${locale}/account`;

    // Send verification email
    const isNL = locale === 'nl';
    const subject = isNL
      ? 'Je verificatiecode voor Layouts by Lenny'
      : 'Your verification code for Layouts by Lenny';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Layouts by Lenny</h1>
  </div>

  <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px; text-align: center;">
    <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 15px 0;">
      ${isNL ? 'Je verificatiecode' : 'Your verification code'}
    </h2>
    <p style="margin: 0 0 20px 0; color: #666;">
      ${isNL
        ? 'Gebruik de onderstaande code om in te loggen. De code is 10 minuten geldig.'
        : 'Use the code below to log in. This code is valid for 10 minutes.'}
    </p>
    <div style="background: #1a1a1a; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block;">
      ${code}
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
      ${isNL ? 'Of klik op de knop om direct in te loggen:' : 'Or click the button to log in directly:'}
    </p>
    <a href="${magicLink}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
      ${isNL ? 'Direct inloggen' : 'Log in directly'}
    </a>
  </div>

  <p style="color: #999; font-size: 14px; margin: 0 0 10px 0;">
    ${isNL
      ? 'Als je deze code niet hebt aangevraagd, kun je deze e-mail veilig negeren.'
      : "If you didn't request this code, you can safely ignore this email."}
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
    &copy; ${new Date().getFullYear()} Layouts by Lenny
  </p>
</body>
</html>
    `.trim();

    const text = isNL
      ? `Je verificatiecode: ${code}\n\nDeze code is 10 minuten geldig.\n\nOf log direct in via deze link:\n${magicLink}\n\nAls je deze code niet hebt aangevraagd, kun je deze e-mail veilig negeren.`
      : `Your verification code: ${code}\n\nThis code is valid for 10 minutes.\n\nOr log in directly via this link:\n${magicLink}\n\nIf you didn't request this code, you can safely ignore this email.`;

    const result = await sendEmail({
      to: normalizedEmail,
      subject,
      html,
      text,
    });

    if (!result.success) {
      // Clean up the code and pre-created session if email failed
      await prisma.verificationCode.deleteMany({
        where: { customerId: customer.id },
      });
      await prisma.customerSession.delete({
        where: { token: sessionToken },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error requesting verification code:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
