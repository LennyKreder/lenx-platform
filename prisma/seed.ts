import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// Deterministic UUID for LBL site (matches migration)
const LBL_SITE_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  // Seed supported languages
  const languages = [
    { id: 'en', name: 'English', nativeName: 'English', sortOrder: 0 },
    { id: 'nl', name: 'Dutch', nativeName: 'Nederlands', sortOrder: 1 },
    { id: 'de', name: 'German', nativeName: 'Deutsch', sortOrder: 2 },
    { id: 'fr', name: 'French', nativeName: 'Français', sortOrder: 3 },
    { id: 'es', name: 'Spanish', nativeName: 'Español', sortOrder: 4 },
    { id: 'it', name: 'Italian', nativeName: 'Italiano', sortOrder: 5 },
  ];

  console.log('Seeding languages...');
  for (const lang of languages) {
    await prisma.language.upsert({
      where: { id: lang.id },
      update: {
        name: lang.name,
        nativeName: lang.nativeName,
        sortOrder: lang.sortOrder,
      },
      create: {
        id: lang.id,
        name: lang.name,
        nativeName: lang.nativeName,
        sortOrder: lang.sortOrder,
        isActive: true,
      },
    });
    console.log(`  Created/updated language: ${lang.id} (${lang.name})`);
  }

  // Seed sites
  const sites = [
    {
      id: LBL_SITE_ID,
      code: 'lbl',
      name: 'Layouts by Lenny',
      domains: ['layoutsbylenny.com'],
      defaultLocale: 'en',
      locales: ['en', 'nl'],
      siteType: 'digital',
      hasDigitalDelivery: true,
      hasMultilingual: true,
      hasBundles: true,
      hasTemplates: true,
      hasBlog: true,
      hasReviews: true,
      contactEmail: 'hello@layoutsbylenny.com',
      fromEmail: 'Layouts by Lenny <noreply@mail.lenxlabs.com>',
      companyInfo: { name: 'LenxLabs', cocNumber: '72665890', vatNumber: 'NL001571974B48' },
      gaTrackingId: 'G-7XB8QB5N9X',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      code: 'matcare',
      name: 'Mat Care',
      domains: ['matcare.nl', 'matcare.com'],
      defaultLocale: 'nl',
      locales: ['nl', 'en', 'de', 'fr'],
      siteType: 'physical',
      hasShipping: true,
      hasBolIntegration: true,
      hasMultilingual: true,
      hasReviews: true,
      contactEmail: 'info@matcare.nl',
      fromEmail: 'Mat Care <noreply@mail.lenxlabs.com>',
      companyInfo: { name: 'LenxLabs', cocNumber: '72665890', vatNumber: 'NL001571974B48' },
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      code: 'clariz',
      name: 'Clariz',
      domains: ['clariz.nl'],
      defaultLocale: 'nl',
      locales: ['nl'],
      siteType: 'physical',
      hasShipping: true,
      hasBolIntegration: true,
      hasReviews: true,
      contactEmail: 'info@clariz.nl',
      fromEmail: 'Clariz <noreply@mail.lenxlabs.com>',
      companyInfo: { name: 'LenxLabs', cocNumber: '72665890', vatNumber: 'NL001571974B48' },
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      code: 'jellybean',
      name: 'Jelly Bean',
      domains: ['jellybeanbeauty.nl'],
      defaultLocale: 'nl',
      locales: ['nl'],
      siteType: 'physical',
      hasShipping: true,
      hasBolIntegration: true,
      hasReviews: true,
      contactEmail: 'info@jellybeanbeauty.nl',
      fromEmail: 'Jelly Bean <noreply@mail.lenxlabs.com>',
      companyInfo: { name: 'LenxLabs', cocNumber: '72665890', vatNumber: 'NL001571974B48' },
    },
  ];

  console.log('\nSeeding sites...');
  for (const site of sites) {
    await prisma.site.upsert({
      where: { id: site.id },
      update: {
        name: site.name,
        domains: site.domains,
        defaultLocale: site.defaultLocale,
        locales: site.locales,
        siteType: site.siteType ?? 'digital',
        hasShipping: site.hasShipping ?? false,
        hasDigitalDelivery: site.hasDigitalDelivery ?? false,
        hasMultilingual: site.hasMultilingual ?? false,
        hasBolIntegration: site.hasBolIntegration ?? false,
        hasBundles: site.hasBundles ?? false,
        hasTemplates: site.hasTemplates ?? false,
        hasBlog: site.hasBlog ?? true,
        hasReviews: site.hasReviews ?? true,
        contactEmail: site.contactEmail ?? null,
        fromEmail: site.fromEmail ?? null,
        companyInfo: site.companyInfo ?? undefined,
        gaTrackingId: site.gaTrackingId ?? null,
      },
      create: {
        id: site.id,
        code: site.code,
        name: site.name,
        domains: site.domains,
        defaultLocale: site.defaultLocale,
        locales: site.locales,
        siteType: site.siteType ?? 'digital',
        hasShipping: site.hasShipping ?? false,
        hasDigitalDelivery: site.hasDigitalDelivery ?? false,
        hasMultilingual: site.hasMultilingual ?? false,
        hasBolIntegration: site.hasBolIntegration ?? false,
        hasBundles: site.hasBundles ?? false,
        hasTemplates: site.hasTemplates ?? false,
        hasBlog: site.hasBlog ?? true,
        hasReviews: site.hasReviews ?? true,
        contactEmail: site.contactEmail ?? null,
        fromEmail: site.fromEmail ?? null,
        companyInfo: site.companyInfo ?? undefined,
        gaTrackingId: site.gaTrackingId ?? null,
      },
    });
    console.log(`  Created/updated site: ${site.code} (${site.name})`);
  }

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'lenny@lenx.nl';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const passwordHash = hashSync(adminPassword, 10);

  console.log('\nSeeding admin user...');
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Lenny',
      role: 'super_admin',
      siteAccess: ['*'],
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Lenny',
      role: 'super_admin',
      siteAccess: ['*'],
      isActive: true,
    },
  });
  console.log(`  Created/updated admin: ${adminEmail} (super_admin)`);

  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
