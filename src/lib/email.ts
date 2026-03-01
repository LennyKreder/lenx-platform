import { Resend } from 'resend';
import crypto from 'crypto';
import { type Locale, getDateLocale } from './i18n';

const DEFAULT_FROM_EMAIL = 'Layouts by Lenny <noreply@mail.lenxlabs.com>';

export interface SiteEmailInfo {
  name: string;
  fromEmail?: string | null;
}

// Lazy initialization to avoid build-time errors when RESEND_API_KEY is not set
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Email translations for all supported locales
const emailTranslations = {
  en: {
    magicLink: {
      subject: 'Your login link for Layouts by Lenny',
      heading: 'Log in to your account',
      body: 'Click the button below to log in to your account. This link is valid for 24 hours.',
      button: 'Log in',
      ignore: "If you didn't request this link, you can safely ignore this email.",
      buttonFallback: "Button not working? Copy and paste this link into your browser:",
    },
    order: {
      subject: 'Order confirmation #{orderId}',
      heading: 'Thank you for your order!',
      body: "Your order #{orderId} has been confirmed. Below you'll find the download links for your purchases.",
      product: 'Product',
      action: 'Action',
      download: 'Download',
      total: 'Total',
      viewAccount: 'View My Account',
      findPurchases: 'You can always find your purchases in your account.',
    },
    newProduct: {
      subject: 'New product available: {productName}',
      heading: 'New product available!',
      body: 'A new product has been added to the shop: <strong>{productName}</strong>. As an all-access bundle customer, you have immediate access!',
      viewInShop: 'View in shop',
      reason: 'You are receiving this email because you purchased an all-access bundle.',
    },
    freeSample: {
      subject: 'Your free planner sample is ready!',
      heading: 'Your free sample is ready!',
      body: 'Click the button below to download your free planner sample. This link is valid for 7 days.',
      button: 'Download PDF',
      expiry: 'This download link expires in 7 days.',
      enjoy: 'Enjoy your planner! If you love it, check out the full year planner with 65+ templates and 17 color themes.',
      browseShop: 'Browse the shop',
    },
  },
  nl: {
    magicLink: {
      subject: 'Je inloglink voor Layouts by Lenny',
      heading: 'Log in op je account',
      body: 'Klik op de onderstaande knop om in te loggen op je account. Deze link is 24 uur geldig.',
      button: 'Inloggen',
      ignore: 'Als je deze link niet hebt aangevraagd, kun je deze e-mail veilig negeren.',
      buttonFallback: 'Werkt de knop niet? Kopieer en plak deze link in je browser:',
    },
    order: {
      subject: 'Bevestiging van je bestelling #{orderId}',
      heading: 'Bedankt voor je bestelling!',
      body: 'Je bestelling #{orderId} is bevestigd. Hieronder vind je de downloadlinks voor je aankopen.',
      product: 'Product',
      action: 'Actie',
      download: 'Downloaden',
      total: 'Totaal',
      viewAccount: 'Bekijk mijn account',
      findPurchases: 'Je kunt je aankopen altijd terugvinden in je account.',
    },
    newProduct: {
      subject: 'Nieuw product beschikbaar: {productName}',
      heading: 'Nieuw product beschikbaar!',
      body: 'Er is een nieuw product toegevoegd aan de shop: <strong>{productName}</strong>. Als all-access bundelklant heb je hier direct toegang toe!',
      viewInShop: 'Bekijk in de shop',
      reason: 'Je ontvangt deze e-mail omdat je een all-access bundel hebt gekocht.',
    },
    freeSample: {
      subject: 'Je gratis planner voorbeeld is klaar!',
      heading: 'Je gratis voorbeeld is klaar!',
      body: 'Klik op de knop hieronder om je gratis planner voorbeeld te downloaden. Deze link is 7 dagen geldig.',
      button: 'Download PDF',
      expiry: 'Deze downloadlink verloopt over 7 dagen.',
      enjoy: 'Veel plezier met je planner! Bevalt het? Bekijk dan de volledige jaarplanner met 65+ sjablonen en 17 kleurthema\'s.',
      browseShop: 'Bekijk de shop',
    },
  },
  de: {
    magicLink: {
      subject: 'Dein Login-Link für Layouts by Lenny',
      heading: 'In dein Konto einloggen',
      body: 'Klicke auf die Schaltfläche unten, um dich in dein Konto einzuloggen. Dieser Link ist 24 Stunden gültig.',
      button: 'Einloggen',
      ignore: 'Wenn du diesen Link nicht angefordert hast, kannst du diese E-Mail ignorieren.',
      buttonFallback: 'Funktioniert die Schaltfläche nicht? Kopiere diesen Link in deinen Browser:',
    },
    order: {
      subject: 'Bestellbestätigung #{orderId}',
      heading: 'Danke für deine Bestellung!',
      body: 'Deine Bestellung #{orderId} wurde bestätigt. Unten findest du die Download-Links für deine Einkäufe.',
      product: 'Produkt',
      action: 'Aktion',
      download: 'Herunterladen',
      total: 'Gesamt',
      viewAccount: 'Mein Konto anzeigen',
      findPurchases: 'Du findest deine Einkäufe jederzeit in deinem Konto.',
    },
    newProduct: {
      subject: 'Neues Produkt verfügbar: {productName}',
      heading: 'Neues Produkt verfügbar!',
      body: 'Ein neues Produkt wurde dem Shop hinzugefügt: <strong>{productName}</strong>. Als All-Access-Paket-Kunde hast du sofortigen Zugriff!',
      viewInShop: 'Im Shop ansehen',
      reason: 'Du erhältst diese E-Mail, weil du ein All-Access-Paket gekauft hast.',
    },
    freeSample: {
      subject: 'Dein kostenloses Planer-Muster ist fertig!',
      heading: 'Dein kostenloses Muster ist fertig!',
      body: 'Klicke auf die Schaltfläche unten, um dein kostenloses Planer-Muster herunterzuladen. Dieser Link ist 7 Tage gültig.',
      button: 'PDF herunterladen',
      expiry: 'Dieser Download-Link läuft in 7 Tagen ab.',
      enjoy: 'Viel Spaß mit deinem Planer! Wenn er dir gefällt, schau dir den kompletten Jahresplaner mit 65+ Vorlagen und 17 Farbthemen an.',
      browseShop: 'Shop ansehen',
    },
  },
  fr: {
    magicLink: {
      subject: 'Votre lien de connexion pour Layouts by Lenny',
      heading: 'Connectez-vous à votre compte',
      body: 'Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable 24 heures.',
      button: 'Se connecter',
      ignore: "Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet e-mail.",
      buttonFallback: 'Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :',
    },
    order: {
      subject: 'Confirmation de commande n°{orderId}',
      heading: 'Merci pour votre commande !',
      body: 'Votre commande n°{orderId} a été confirmée. Vous trouverez ci-dessous les liens de téléchargement.',
      product: 'Produit',
      action: 'Action',
      download: 'Télécharger',
      total: 'Total',
      viewAccount: 'Voir mon compte',
      findPurchases: 'Vous pouvez toujours retrouver vos achats dans votre compte.',
    },
    newProduct: {
      subject: 'Nouveau produit disponible : {productName}',
      heading: 'Nouveau produit disponible !',
      body: 'Un nouveau produit a été ajouté : <strong>{productName}</strong>. En tant que client du pack accès complet, vous y avez accès immédiatement !',
      viewInShop: 'Voir dans la boutique',
      reason: 'Vous recevez cet e-mail car vous avez acheté un pack accès complet.',
    },
    freeSample: {
      subject: 'Votre échantillon gratuit de planner est prêt !',
      heading: 'Votre échantillon gratuit est prêt !',
      body: 'Cliquez sur le bouton ci-dessous pour télécharger votre échantillon gratuit. Ce lien est valable 7 jours.',
      button: 'Télécharger le PDF',
      expiry: 'Ce lien de téléchargement expire dans 7 jours.',
      enjoy: 'Profitez bien de votre planner ! S\'il vous plaît, découvrez le planner annuel complet avec 65+ modèles et 17 thèmes de couleurs.',
      browseShop: 'Parcourir la boutique',
    },
  },
  es: {
    magicLink: {
      subject: 'Tu enlace de inicio de sesión para Layouts by Lenny',
      heading: 'Inicia sesión en tu cuenta',
      body: 'Haz clic en el botón de abajo para iniciar sesión. Este enlace es válido durante 24 horas.',
      button: 'Iniciar sesión',
      ignore: 'Si no solicitaste este enlace, puedes ignorar este correo.',
      buttonFallback: '¿El botón no funciona? Copia y pega este enlace en tu navegador:',
    },
    order: {
      subject: 'Confirmación de pedido #{orderId}',
      heading: '¡Gracias por tu pedido!',
      body: 'Tu pedido #{orderId} ha sido confirmado. A continuación encontrarás los enlaces de descarga.',
      product: 'Producto',
      action: 'Acción',
      download: 'Descargar',
      total: 'Total',
      viewAccount: 'Ver mi cuenta',
      findPurchases: 'Siempre puedes encontrar tus compras en tu cuenta.',
    },
    newProduct: {
      subject: 'Nuevo producto disponible: {productName}',
      heading: '¡Nuevo producto disponible!',
      body: 'Se ha añadido un nuevo producto: <strong>{productName}</strong>. ¡Como cliente del paquete acceso completo, tienes acceso inmediato!',
      viewInShop: 'Ver en la tienda',
      reason: 'Recibes este correo porque compraste un paquete de acceso completo.',
    },
    freeSample: {
      subject: '¡Tu muestra gratuita de planner está lista!',
      heading: '¡Tu muestra gratuita está lista!',
      body: 'Haz clic en el botón de abajo para descargar tu muestra gratuita. Este enlace es válido durante 7 días.',
      button: 'Descargar PDF',
      expiry: 'Este enlace de descarga caduca en 7 días.',
      enjoy: '¡Disfruta de tu planner! Si te gusta, echa un vistazo al planner anual completo con 65+ plantillas y 17 temas de color.',
      browseShop: 'Ver la tienda',
    },
  },
  it: {
    magicLink: {
      subject: 'Il tuo link di accesso per Layouts by Lenny',
      heading: 'Accedi al tuo account',
      body: 'Clicca il pulsante qui sotto per accedere. Questo link è valido per 24 ore.',
      button: 'Accedi',
      ignore: 'Se non hai richiesto questo link, puoi ignorare questa email.',
      buttonFallback: 'Il pulsante non funziona? Copia e incolla questo link nel tuo browser:',
    },
    order: {
      subject: "Conferma dell'ordine #{orderId}",
      heading: 'Grazie per il tuo ordine!',
      body: "Il tuo ordine #{orderId} è stato confermato. Di seguito troverai i link per il download.",
      product: 'Prodotto',
      action: 'Azione',
      download: 'Scarica',
      total: 'Totale',
      viewAccount: 'Visualizza il mio account',
      findPurchases: 'Puoi sempre trovare i tuoi acquisti nel tuo account.',
    },
    newProduct: {
      subject: 'Nuovo prodotto disponibile: {productName}',
      heading: 'Nuovo prodotto disponibile!',
      body: 'È stato aggiunto un nuovo prodotto: <strong>{productName}</strong>. Come cliente del pacchetto accesso completo, hai accesso immediato!',
      viewInShop: 'Vedi nel negozio',
      reason: 'Ricevi questa email perché hai acquistato un pacchetto accesso completo.',
    },
    freeSample: {
      subject: 'Il tuo campione gratuito di planner è pronto!',
      heading: 'Il tuo campione gratuito è pronto!',
      body: 'Clicca il pulsante qui sotto per scaricare il tuo campione gratuito. Questo link è valido per 7 giorni.',
      button: 'Scarica PDF',
      expiry: 'Questo link di download scade tra 7 giorni.',
      enjoy: 'Goditi il tuo planner! Se ti piace, dai un\'occhiata al planner annuale completo con 65+ modelli e 17 temi di colore.',
      browseShop: 'Visita il negozio',
    },
  },
} as const;

type EmailLocale = keyof typeof emailTranslations;
type EmailTranslations = typeof emailTranslations[EmailLocale];

function getEmailTranslations(locale: string): EmailTranslations {
  const validLocale = (locale in emailTranslations ? locale : 'en') as EmailLocale;
  return emailTranslations[validLocale];
}

// Dark mode CSS styles for email templates
const darkModeStyles = `
  :root {
    color-scheme: light dark;
    supported-color-schemes: light dark;
  }

  @media (prefers-color-scheme: dark) {
    body, .email-body {
      background-color: #1a1a1a !important;
      color: #e5e5e5 !important;
    }
    .email-container {
      background-color: #1a1a1a !important;
    }
    .content-block {
      background-color: #2d2d2d !important;
    }
    .header-text {
      color: #ffffff !important;
    }
    .body-text {
      color: #b3b3b3 !important;
    }
    .muted-text {
      color: #888888 !important;
    }
    .button {
      background-color: #ffffff !important;
      color: #1a1a1a !important;
    }
    .link {
      color: #60a5fa !important;
    }
    .table-header {
      background-color: #404040 !important;
    }
    .table-header-cell {
      color: #ffffff !important;
    }
    .table-row {
      border-bottom-color: #404040 !important;
    }
    .divider {
      border-top-color: #404040 !important;
    }
  }
`;

// Email wrapper with dark mode support
function getEmailWrapper(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style type="text/css">
    ${darkModeStyles}
  </style>
</head>
<body class="email-body" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 0;">
  <div class="email-container" style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    ${content}
  </div>
</body>
</html>
  `.trim();
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  from?: string;
}

export async function sendEmail({ to, subject, html, text, cc, from }: SendEmailOptions) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: from || DEFAULT_FROM_EMAIL,
      to,
      subject,
      html,
      text,
      ...(cc ? { cc } : {}),
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

interface MagicLinkEmailOptions {
  to: string;
  magicLink: string;
  locale?: string;
  site?: SiteEmailInfo;
}

export async function sendMagicLinkEmail({
  to,
  magicLink,
  locale = 'en',
  site,
}: MagicLinkEmailOptions) {
  const t = getEmailTranslations(locale).magicLink;
  const siteName = site?.name || 'Layouts by Lenny';

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 class="header-text" style="color: #1a1a1a; font-size: 24px; margin: 0;">${siteName}</h1>
    </div>

    <div class="content-block" style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
      <h2 class="header-text" style="color: #1a1a1a; font-size: 20px; margin: 0 0 15px 0;">
        ${t.heading}
      </h2>
      <p class="body-text" style="margin: 0 0 20px 0; color: #666666;">
        ${t.body}
      </p>
      <a href="${magicLink}" class="button" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
        ${t.button}
      </a>
    </div>

    <p class="muted-text" style="color: #999999; font-size: 14px; margin: 0 0 10px 0;">
      ${t.ignore}
    </p>

    <p class="muted-text" style="color: #999999; font-size: 12px; margin: 20px 0 0 0;">
      ${t.buttonFallback}
      <br>
      <a href="${magicLink}" class="link" style="color: #666666; word-break: break-all;">${magicLink}</a>
    </p>

    <hr class="divider" style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

    <p class="muted-text" style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
      &copy; ${new Date().getFullYear()} ${siteName}
    </p>
  `;

  const html = getEmailWrapper(t.subject, content);
  const text = `${t.heading}\n\n${t.body}\n\n${magicLink}\n\n${t.ignore}`;

  return sendEmail({ to, subject: t.subject, html, text, from: site?.fromEmail || undefined });
}

interface OrderItem {
  name: string;
  downloadCode?: string;
}

interface OrderConfirmationEmailOptions {
  to: string;
  orderNumber: string;
  items: OrderItem[];
  totalInCents: number;
  currency: string;
  locale?: string;
  site?: SiteEmailInfo;
}

export async function sendOrderConfirmationEmail({
  to,
  orderNumber,
  items,
  totalInCents,
  currency,
  locale = 'en',
  site,
}: OrderConfirmationEmailOptions) {
  const t = getEmailTranslations(locale).order;
  const siteName = site?.name || 'Layouts by Lenny';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_APP_URL is not set, email links will be broken');
    return { success: false, error: 'NEXT_PUBLIC_APP_URL is not configured' };
  }

  const dateLocale = getDateLocale(locale as Locale);
  const totalFormatted = new Intl.NumberFormat(dateLocale, {
    style: 'currency',
    currency,
  }).format(totalInCents / 100);

  const subject = t.subject.replace('{orderId}', String(orderNumber));
  const bodyText = t.body.replace('{orderId}', String(orderNumber));

  const itemsHtml = items
    .map(
      (item) => `
        <tr class="table-row" style="border-bottom: 1px solid #eeeeee;">
          <td class="body-text" style="padding: 12px; color: #333333;">${item.name}</td>
          <td style="padding: 12px; text-align: right;">
            <a href="${baseUrl}/${locale}/account/library" class="link" style="color: #1a1a1a; text-decoration: underline;">
              ${t.download}
            </a>
          </td>
        </tr>
      `
    )
    .join('');

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 class="header-text" style="color: #1a1a1a; font-size: 24px; margin: 0;">${siteName}</h1>
    </div>

    <div class="content-block" style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
      <h2 class="header-text" style="color: #1a1a1a; font-size: 20px; margin: 0 0 15px 0;">
        ${t.heading}
      </h2>
      <p class="body-text" style="margin: 0 0 20px 0; color: #666666;">
        ${bodyText}
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr class="table-header" style="background: #eeeeee;">
            <th class="table-header-cell" style="padding: 12px; text-align: left; color: #333333;">${t.product}</th>
            <th class="table-header-cell" style="padding: 12px; text-align: right; color: #333333;">${t.action}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td class="header-text" style="padding: 12px; font-weight: bold; color: #1a1a1a;">${t.total}</td>
            <td class="header-text" style="padding: 12px; font-weight: bold; text-align: right; color: #1a1a1a;">${totalFormatted}</td>
          </tr>
        </tfoot>
      </table>

      <a href="${baseUrl}/${locale}/account" class="button" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
        ${t.viewAccount}
      </a>
    </div>

    <p class="muted-text" style="color: #999999; font-size: 14px; margin: 0 0 10px 0;">
      ${t.findPurchases}
    </p>

    <hr class="divider" style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

    <p class="muted-text" style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
      &copy; ${new Date().getFullYear()} ${siteName}
    </p>
  `;

  const html = getEmailWrapper(subject, content);
  const text = `${t.heading}\n\n${bodyText}\n\n${t.total}: ${totalFormatted}\n\n${t.findPurchases}\n${baseUrl}/${locale}/account`;

  const cc = process.env.ORDER_CC_EMAIL || undefined;
  return sendEmail({ to, subject, html, text, cc, from: site?.fromEmail || undefined });
}

interface NewProductNotificationOptions {
  to: string;
  productName: string;
  productImage?: string;
  shopUrl: string;
  locale?: string;
  site?: SiteEmailInfo;
}

export async function sendNewProductNotificationEmail({
  to,
  productName,
  productImage,
  shopUrl,
  locale = 'en',
  site,
}: NewProductNotificationOptions) {
  const t = getEmailTranslations(locale).newProduct;
  const siteName = site?.name || 'Layouts by Lenny';

  const subject = t.subject.replace('{productName}', productName);
  const bodyText = t.body.replace('{productName}', productName);

  const imageHtml = productImage
    ? `<img src="${productImage}" alt="${productName}" style="width: 100%; max-width: 400px; border-radius: 8px; margin-bottom: 20px;" />`
    : '';

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 class="header-text" style="color: #1a1a1a; font-size: 24px; margin: 0;">${siteName}</h1>
    </div>

    <div class="content-block" style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px; text-align: center;">
      <h2 class="header-text" style="color: #1a1a1a; font-size: 20px; margin: 0 0 15px 0;">
        ${t.heading}
      </h2>
      <p class="body-text" style="margin: 0 0 20px 0; color: #666666;">
        ${bodyText}
      </p>
      ${imageHtml}
      <a href="${shopUrl}" class="button" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
        ${t.viewInShop}
      </a>
    </div>

    <p class="muted-text" style="color: #999999; font-size: 14px; margin: 0 0 10px 0;">
      ${t.reason}
    </p>

    <hr class="divider" style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

    <p class="muted-text" style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
      &copy; ${new Date().getFullYear()} ${siteName}
    </p>
  `;

  const html = getEmailWrapper(subject, content);
  const text = `${t.heading}\n\n${bodyText.replace(/<\/?strong>/g, '')}\n\n${t.viewInShop}: ${shopUrl}\n\n${t.reason}`;

  return sendEmail({ to, subject, html, text, from: site?.fromEmail || undefined });
}

// --- Sample download token utilities ---

function getSampleTokenSecret(): string {
  const secret = process.env.SAMPLE_TOKEN_SECRET;
  if (!secret) {
    throw new Error('SAMPLE_TOKEN_SECRET environment variable is not set');
  }
  return secret;
}

export function createSampleDownloadToken(params: {
  email: string;
  theme: string;
  language: string;
  month: number;
  year: number;
}): string {
  const payload = {
    ...params,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSampleTokenSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySampleDownloadToken(token: string): {
  valid: boolean;
  email?: string;
  theme?: string;
  language?: string;
  month?: number;
  year?: number;
} {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSampleTokenSecret())
    .update(payloadB64)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) return { valid: false };
    return {
      valid: true,
      email: payload.email,
      theme: payload.theme,
      language: payload.language,
      month: payload.month,
      year: payload.year,
    };
  } catch {
    return { valid: false };
  }
}

// --- Free sample email ---

interface FreeSampleEmailOptions {
  to: string;
  downloadUrl: string;
  locale?: string;
  site?: SiteEmailInfo;
}

export async function sendFreeSampleEmail({
  to,
  downloadUrl,
  locale = 'en',
  site,
}: FreeSampleEmailOptions) {
  const t = getEmailTranslations(locale).freeSample;
  const siteName = site?.name || 'Layouts by Lenny';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const shopUrl = `${baseUrl}/${locale}/shop/planners`;

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 class="header-text" style="color: #1a1a1a; font-size: 24px; margin: 0;">${siteName}</h1>
    </div>

    <div class="content-block" style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px; text-align: center;">
      <h2 class="header-text" style="color: #1a1a1a; font-size: 20px; margin: 0 0 15px 0;">
        ${t.heading}
      </h2>
      <p class="body-text" style="margin: 0 0 20px 0; color: #666666;">
        ${t.body}
      </p>
      <a href="${downloadUrl}" class="button" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">
        ${t.button}
      </a>
      <p class="muted-text" style="color: #999999; font-size: 12px; margin: 15px 0 0 0;">
        ${t.expiry}
      </p>
    </div>

    <p class="body-text" style="color: #666666; font-size: 14px; margin: 0 0 15px 0;">
      ${t.enjoy}
    </p>

    <a href="${shopUrl}" class="link" style="color: #1a1a1a; text-decoration: underline; font-size: 14px;">
      ${t.browseShop} &rarr;
    </a>

    <hr class="divider" style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

    <p class="muted-text" style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
      &copy; ${new Date().getFullYear()} ${siteName}
    </p>
  `;

  const html = getEmailWrapper(t.subject, content);
  const text = `${t.heading}\n\n${t.body}\n\n${downloadUrl}\n\n${t.enjoy}\n\n${t.browseShop}: ${shopUrl}`;

  return sendEmail({ to, subject: t.subject, html, text, from: site?.fromEmail || undefined });
}
