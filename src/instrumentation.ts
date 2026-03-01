export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateEnv();
  }
}

function validateEnv() {
  const required = [
    'DATABASE_URL',
    'ADMIN_PASSWORD',
  ];

  const recommended = [
    'NEXT_PUBLIC_APP_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  const missingRecommended = recommended.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    console.warn(
      `[env] Missing recommended environment variables: ${missingRecommended.join(', ')}. Some features will be unavailable.`
    );
  }
}
