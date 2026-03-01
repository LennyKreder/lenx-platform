'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';

const defaultPages = [
  {
    slug: 'home',
    pageType: 'home',
    translations: [
      {
        languageCode: 'en',
        title: 'Home',
        metaDescription: 'Layouts by Lenny - Beautiful digital planners designed with care',
        content: '<h1>Welcome to Layouts by Lenny</h1><p>Beautiful digital planners designed with care. Explore our collection of thoughtfully crafted planners for GoodNotes, Notability, and other note-taking apps.</p>',
      },
      {
        languageCode: 'nl',
        title: 'Home',
        metaDescription: 'Layouts by Lenny - Mooie digitale planners, met zorg ontworpen',
        content: '<h1>Welkom bij Layouts by Lenny</h1><p>Mooie digitale planners, met zorg ontworpen. Ontdek onze collectie van zorgvuldig gemaakte planners voor GoodNotes, Notability en andere notitie-apps.</p>',
      },
    ],
  },
  {
    slug: 'about',
    translations: [
      {
        languageCode: 'en',
        title: 'About',
        metaDescription: 'Learn about Layouts by Lenny and our digital planners',
        content: '<h1>About Layouts by Lenny</h1><p>Creating beautiful digital planners designed with care.</p><p>Layouts by Lenny was founded with a simple mission: to create digital planners that are both beautiful and functional. We believe that planning your life should be an enjoyable experience, not a chore.</p><h2>Our Mission</h2><p>To help people organize their lives with thoughtfully designed digital planning tools that work seamlessly across devices.</p><h2>Quality &amp; Care</h2><p>Every planner is meticulously crafted with attention to detail, ensuring optimal readability and ease of use in GoodNotes, Notability, and other note-taking apps.</p>',
      },
      {
        languageCode: 'nl',
        title: 'Over ons',
        metaDescription: 'Leer meer over Layouts by Lenny en onze digitale planners',
        content: '<h1>Over Layouts by Lenny</h1><p>Mooie digitale planners, met zorg ontworpen.</p><p>Layouts by Lenny is opgericht met een eenvoudige missie: het maken van digitale planners die zowel mooi als functioneel zijn. Wij geloven dat het plannen van je leven een leuke ervaring moet zijn, geen karwei.</p><h2>Onze Missie</h2><p>Mensen helpen hun leven te organiseren met doordacht ontworpen digitale planningstools die naadloos werken op alle apparaten.</p><h2>Kwaliteit &amp; Zorg</h2><p>Elke planner is zorgvuldig gemaakt met aandacht voor detail, voor optimale leesbaarheid en gebruiksgemak in GoodNotes, Notability en andere notitie-apps.</p>',
      },
    ],
  },
  {
    slug: 'contact',
    translations: [
      {
        languageCode: 'en',
        title: 'Contact',
        metaDescription: 'Get in touch with Layouts by Lenny',
        content: '<h1>Get in Touch</h1><p>Have questions about our digital planners? We\'d love to hear from you!</p><h2>Email</h2><p>hello@layoutsbylenny.com</p><h2>Etsy Shop</h2><p>Visit our Etsy store for purchases and messages.</p><p>We typically respond within 24-48 hours.</p>',
      },
      {
        languageCode: 'nl',
        title: 'Contact',
        metaDescription: 'Neem contact op met Layouts by Lenny',
        content: '<h1>Neem Contact Op</h1><p>Heb je vragen over onze digitale planners? We horen graag van je!</p><h2>E-mail</h2><p>hello@layoutsbylenny.com</p><h2>Etsy Winkel</h2><p>Bezoek onze Etsy winkel voor aankopen en berichten.</p><p>We reageren meestal binnen 24-48 uur.</p>',
      },
    ],
  },
  {
    slug: 'terms',
    translations: [
      {
        languageCode: 'en',
        title: 'Terms & Conditions',
        metaDescription: 'Terms and conditions for Layouts by Lenny products',
        content: '<h1>Terms &amp; Conditions</h1><p><em>Last updated: January 2026</em></p><h2>Digital Products</h2><p>All products sold by Layouts by Lenny are digital downloads. Once purchased, you will receive access to download your files immediately.</p><h2>License</h2><p>Your purchase grants you a personal, non-transferable license to use the digital planner for personal use only. You may not redistribute, resell, or share your purchased files.</p><h2>Refunds</h2><p>Due to the digital nature of our products, all sales are final. If you experience technical issues with your download, please contact us and we will work to resolve the issue.</p><h2>Copyright</h2><p>All designs, layouts, and content are the intellectual property of Layouts by Lenny. Unauthorized reproduction or distribution is prohibited.</p><h2>Questions?</h2><p>If you have any questions about these terms, please contact us.</p>',
      },
      {
        languageCode: 'nl',
        title: 'Algemene Voorwaarden',
        metaDescription: 'Algemene voorwaarden voor Layouts by Lenny producten',
        content: '<h1>Algemene Voorwaarden</h1><p><em>Laatst bijgewerkt: januari 2026</em></p><h2>Digitale Producten</h2><p>Alle producten die door Layouts by Lenny worden verkocht zijn digitale downloads. Na aankoop krijg je direct toegang om je bestanden te downloaden.</p><h2>Licentie</h2><p>Je aankoop geeft je een persoonlijke, niet-overdraagbare licentie om de digitale planner alleen voor persoonlijk gebruik te gebruiken. Je mag je gekochte bestanden niet herverdelen, doorverkopen of delen.</p><h2>Restitutie</h2><p>Vanwege de digitale aard van onze producten zijn alle verkopen definitief. Als je technische problemen ondervindt met je download, neem dan contact met ons op en we zullen het probleem oplossen.</p><h2>Auteursrecht</h2><p>Alle ontwerpen, lay-outs en inhoud zijn intellectueel eigendom van Layouts by Lenny. Ongeautoriseerde reproductie of distributie is verboden.</p><h2>Vragen?</h2><p>Als je vragen hebt over deze voorwaarden, neem dan contact met ons op.</p>',
      },
    ],
  },
  {
    slug: 'how-to-import',
    translations: [
      {
        languageCode: 'en',
        title: 'How to Import',
        metaDescription: 'Learn how to import digital planners into your favorite app',
        content: '<h1>How to Import Your Digital Planner</h1><p>Follow these steps to get started with your new digital planner.</p><h2>GoodNotes</h2><ol><li>Download the PDF file to your device</li><li>Open GoodNotes</li><li>Tap "New..." and select "Import"</li><li>Choose the downloaded PDF file</li></ol><h2>Notability</h2><ol><li>Download the PDF file to your device</li><li>Open Notability</li><li>Tap the import icon</li><li>Select the downloaded PDF file</li></ol><h2>Other Apps</h2><p>Most PDF-compatible note-taking apps support importing PDF files. Check your app\'s documentation for specific instructions.</p>',
      },
      {
        languageCode: 'nl',
        title: 'Hoe te importeren',
        metaDescription: 'Leer hoe je digitale planners importeert in je favoriete app',
        content: '<h1>Hoe importeer je jouw digitale planner</h1><p>Volg deze stappen om aan de slag te gaan met je nieuwe digitale planner.</p><h2>GoodNotes</h2><ol><li>Download het PDF-bestand naar je apparaat</li><li>Open GoodNotes</li><li>Tik op "Nieuw..." en selecteer "Importeren"</li><li>Kies het gedownloade PDF-bestand</li></ol><h2>Notability</h2><ol><li>Download het PDF-bestand naar je apparaat</li><li>Open Notability</li><li>Tik op het importicoon</li><li>Selecteer het gedownloade PDF-bestand</li></ol><h2>Andere Apps</h2><p>De meeste PDF-compatibele notitie-apps ondersteunen het importeren van PDF-bestanden. Raadpleeg de documentatie van je app voor specifieke instructies.</p>',
      },
    ],
  },
];

export default function InitializePagesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ slug: string; success: boolean; error?: string }[]>([]);

  const handleInitialize = async () => {
    setIsLoading(true);
    const newResults: typeof results = [];

    for (const page of defaultPages) {
      try {
        const response = await fetch('/api/admin/content-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(page),
        });

        if (response.ok) {
          newResults.push({ slug: page.slug, success: true });
        } else {
          const data = await response.json();
          newResults.push({ slug: page.slug, success: false, error: data.error });
        }
      } catch {
        newResults.push({ slug: page.slug, success: false, error: 'Network error' });
      }
    }

    setResults(newResults);
    setIsLoading(false);

    if (newResults.every((r) => r.success)) {
      setTimeout(() => {
        router.push('/en/admin/pages');
      }, 1500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Initialize Content Pages</CardTitle>
          <CardDescription>
            Create the default content pages with initial content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will create the following pages with both English and Dutch translations:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>home</strong> - Homepage with banner and content</li>
              <li><strong>about</strong> - About Layouts by Lenny</li>
              <li><strong>contact</strong> - Contact information</li>
              <li><strong>terms</strong> - Terms &amp; Conditions</li>
              <li><strong>how-to-import</strong> - How to import digital planners</li>
            </ul>
          </div>

          {results.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              {results.map((result) => (
                <div
                  key={result.slug}
                  className={`flex items-center gap-2 text-sm ${
                    result.success ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {result.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-red-600">&#10007;</span>
                  )}
                  <span className="font-mono">{result.slug}</span>
                  {result.error && (
                    <span className="text-muted-foreground">&mdash; {result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-4">
            <Button
              onClick={handleInitialize}
              disabled={isLoading || results.length > 0}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : results.length > 0 ? (
                'Done'
              ) : (
                'Initialize Pages'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
