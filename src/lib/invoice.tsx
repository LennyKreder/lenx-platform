import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { type Locale, getDateLocale } from './i18n';

// Invoice translations
const invoiceTranslations = {
  en: {
    invoice: 'Invoice',
    invoiceNumber: 'Invoice Number',
    date: 'Date',
    billTo: 'Bill To',
    from: 'From',
    item: 'Item',
    quantity: 'Qty',
    price: 'Price',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    grandTotal: 'Total',
    thankYou: 'Thank you for your purchase!',
    digitalProduct: 'Digital Product - No shipping required',
    paymentReceived: 'Payment Received',
  },
  nl: {
    invoice: 'Factuur',
    invoiceNumber: 'Factuurnummer',
    date: 'Datum',
    billTo: 'Factuuradres',
    from: 'Van',
    item: 'Artikel',
    quantity: 'Aantal',
    price: 'Prijs',
    total: 'Totaal',
    subtotal: 'Subtotaal',
    discount: 'Korting',
    grandTotal: 'Totaal',
    thankYou: 'Bedankt voor je aankoop!',
    digitalProduct: 'Digitaal product - Geen verzending nodig',
    paymentReceived: 'Betaling ontvangen',
  },
  de: {
    invoice: 'Rechnung',
    invoiceNumber: 'Rechnungsnummer',
    date: 'Datum',
    billTo: 'Rechnungsadresse',
    from: 'Von',
    item: 'Artikel',
    quantity: 'Menge',
    price: 'Preis',
    total: 'Gesamt',
    subtotal: 'Zwischensumme',
    discount: 'Rabatt',
    grandTotal: 'Gesamtbetrag',
    thankYou: 'Danke für deinen Einkauf!',
    digitalProduct: 'Digitales Produkt - Kein Versand erforderlich',
    paymentReceived: 'Zahlung erhalten',
  },
  fr: {
    invoice: 'Facture',
    invoiceNumber: 'Numéro de facture',
    date: 'Date',
    billTo: 'Facturer à',
    from: 'De',
    item: 'Article',
    quantity: 'Qté',
    price: 'Prix',
    total: 'Total',
    subtotal: 'Sous-total',
    discount: 'Remise',
    grandTotal: 'Total',
    thankYou: 'Merci pour votre achat !',
    digitalProduct: 'Produit numérique - Aucune livraison requise',
    paymentReceived: 'Paiement reçu',
  },
  es: {
    invoice: 'Factura',
    invoiceNumber: 'Número de factura',
    date: 'Fecha',
    billTo: 'Facturar a',
    from: 'De',
    item: 'Artículo',
    quantity: 'Cant',
    price: 'Precio',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    grandTotal: 'Total',
    thankYou: '¡Gracias por tu compra!',
    digitalProduct: 'Producto digital - No requiere envío',
    paymentReceived: 'Pago recibido',
  },
  it: {
    invoice: 'Fattura',
    invoiceNumber: 'Numero fattura',
    date: 'Data',
    billTo: 'Fatturare a',
    from: 'Da',
    item: 'Articolo',
    quantity: 'Qtà',
    price: 'Prezzo',
    total: 'Totale',
    subtotal: 'Subtotale',
    discount: 'Sconto',
    grandTotal: 'Totale',
    thankYou: 'Grazie per il tuo acquisto!',
    digitalProduct: 'Prodotto digitale - Nessuna spedizione richiesta',
    paymentReceived: 'Pagamento ricevuto',
  },
} as const;

function getInvoiceTranslations(locale: string) {
  const validLocale = locale in invoiceTranslations ? locale : 'en';
  return invoiceTranslations[validLocale as keyof typeof invoiceTranslations];
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  invoiceInfo: {
    textAlign: 'right',
    color: '#666666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  addressBlock: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 4,
  },
  addressText: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 2,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 4,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tableCell: {
    fontSize: 10,
    color: '#333333',
  },
  col1: { width: '50%' },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '17.5%', textAlign: 'right' },
  col4: { width: '17.5%', textAlign: 'right' },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 5,
    width: 200,
  },
  totalLabel: {
    width: '50%',
    textAlign: 'right',
    paddingRight: 15,
    color: '#666666',
  },
  totalValue: {
    width: '50%',
    textAlign: 'right',
    color: '#333333',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 10,
    width: 200,
    borderTopWidth: 2,
    borderTopColor: '#1a1a1a',
    marginTop: 5,
  },
  grandTotalLabel: {
    width: '50%',
    textAlign: 'right',
    paddingRight: 15,
    fontWeight: 'bold',
    fontSize: 12,
    color: '#1a1a1a',
  },
  grandTotalValue: {
    width: '50%',
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#1a1a1a',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  footerText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 9,
  },
  badge: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 8,
    alignSelf: 'flex-start',
  },
});

// Default business information - can be overridden per-site via InvoiceData
const DEFAULT_BUSINESS_INFO = {
  name: 'Layouts by Lenny',
  address: process.env.BUSINESS_ADDRESS || '',
  city: process.env.BUSINESS_CITY || '',
  country: process.env.BUSINESS_COUNTRY || '',
  vatNumber: process.env.BUSINESS_VAT_NUMBER || '',
  email: 'hello@layoutsbylenny.com',
  website: 'layoutsbylenny.com',
};

export interface InvoiceBusinessInfo {
  name: string;
  email?: string;
  website?: string;
  vatNumber?: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  priceInCents: number;
}

export interface InvoiceData {
  orderId: number;
  orderNumber?: string | null;
  customerEmail: string;
  billingCountry?: string | null;
  items: InvoiceItem[];
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  currency: string;
  createdAt: Date;
  locale: string;
  businessInfo?: InvoiceBusinessInfo;
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const t = getInvoiceTranslations(data.locale);
  const dateLocale = getDateLocale(data.locale as Locale);
  const biz = {
    ...DEFAULT_BUSINESS_INFO,
    ...(data.businessInfo ? {
      name: data.businessInfo.name,
      ...(data.businessInfo.email && { email: data.businessInfo.email }),
      ...(data.businessInfo.website && { website: data.businessInfo.website }),
      ...(data.businessInfo.vatNumber && { vatNumber: data.businessInfo.vatNumber }),
    } : {}),
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency: data.currency,
    }).format(cents / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{biz.name}</Text>
            {biz.address && (
              <Text style={styles.addressText}>{biz.address}</Text>
            )}
            {biz.city && (
              <Text style={styles.addressText}>{biz.city}</Text>
            )}
            {biz.country && (
              <Text style={styles.addressText}>{biz.country}</Text>
            )}
            {biz.vatNumber && (
              <Text style={styles.addressText}>VAT: {biz.vatNumber}</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{t.invoice}</Text>
            <Text style={styles.invoiceInfo}>
              {t.invoiceNumber}: #{data.orderNumber || data.orderId}
            </Text>
            <Text style={styles.invoiceInfo}>
              {t.date}: {formatDate(data.createdAt)}
            </Text>
            <View style={styles.badge}>
              <Text>{t.paymentReceived}</Text>
            </View>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.billTo}</Text>
          <View style={styles.addressBlock}>
            <Text style={styles.addressText}>{data.customerEmail}</Text>
            {data.billingCountry && (
              <Text style={styles.addressText}>{data.billingCountry}</Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>{t.item}</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>{t.quantity}</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>{t.price}</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>{t.total}</Text>
          </View>

          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col1]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.col2]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.col3]}>
                {formatCurrency(item.priceInCents)}
              </Text>
              <Text style={[styles.tableCell, styles.col4]}>
                {formatCurrency(item.priceInCents * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.subtotal}</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.subtotalInCents)}</Text>
          </View>
          {data.discountInCents > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t.discount}</Text>
              <Text style={styles.totalValue}>-{formatCurrency(data.discountInCents)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>{t.grandTotal}</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.totalInCents)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t.digitalProduct}</Text>
          <Text style={styles.footerText}>{t.thankYou}</Text>
          <Text style={styles.footerText}>
            {biz.email} | {biz.website}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
