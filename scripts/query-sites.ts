import { prisma } from '../src/lib/prisma';
async function main() {
  const sites = await prisma.site.findMany();
  for (const s of sites) {
    console.log(`\n=== ${s.code} (${s.name}) ===`);
    console.log('logoUrl:', s.logoUrl);
    console.log('primaryColor:', s.primaryColor);
    console.log('accentColor:', s.accentColor);
    console.log('footerText:', s.footerText);
    console.log('companyInfo:', JSON.stringify(s.companyInfo));
    console.log('contactEmail:', s.contactEmail);
    console.log('domains:', JSON.stringify(s.domains));
  }
  const menus = await prisma.siteSetting.findMany({ where: { key: 'menus' } });
  console.log('\n=== MENUS ===');
  for (const m of menus) {
    console.log(`siteId: ${m.siteId}`);
    console.log('value:', JSON.stringify(m.value).substring(0, 500));
  }
}
main().catch(console.error);
