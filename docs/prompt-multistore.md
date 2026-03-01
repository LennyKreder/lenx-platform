# CLAUDE.md — Lenx Platform

## Project Overview

Unified multi-tenant e-commerce platform powering multiple brands under LenxLabs. One codebase, one deployment, one PostgreSQL database. Domain-based routing determines which site the customer sees. Each site has its own branding, products, customers, orders, and content — completely isolated from the customer's perspective. The admin panel provides a site switcher to manage all brands from one interface.

### Sites

| Site | Domains | Locales | Type | Bol.com |
|-------|---------|---------|------|---------|
| Layouts by Lenny (LBL) | layoutsbylenny.com | en | Digital products (planners) | No |
| Mat Care | matcare.nl, matcare.com | nl, en, de, fr | Physical products (diagnostic tests) | Yes (NL, BE, Select) |
| Clariz | clariz.nl | nl | Physical products (pregnancy bolas) | Yes |
| Jelly Bean | jellybeannailpolish.nl | nl | Physical products (nail polish) | Yes |

### Key Principles

- **Site isolation**: Customers on matcare.nl never see anything about LBL or Clariz. No shared accounts, no "Lenx" branding customer-facing
- **Translation-ready everywhere**: Even single-locale sites use the translation tables (just one row per entity). Adding a language later requires zero schema changes
- **Feature flags per site**: Templates, bundles, digital delivery, shipping, Bol.com integration — all togglable per site
- **Unified orders**: Webshop orders and Bol.com orders live in the same table, differentiated by `source` and `channel_id`
- **Unified inventory**: One stock count per product, synced to Bol.com when applicable. Selling on the webshop decrements the same stock as Bol

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Database**: PostgreSQL on Hetzner dev server
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Payments**: Stripe (webshop orders)
- **Shipping Labels**: MyParcel API
- **Email**: Transactional email via templates stored in DB
- **File Storage**: Hetzner S3-compatible object storage
- **Deployment**: Coolify on Strato VPS (single deployment, multi-domain)
- **Dev Server**: Hetzner CAX31 ARM with code-server, PostgreSQL

## Project Structure (Actual)

```
lbl-website/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                         # Seeds 4 sites, languages, admin user
│   └── migrations/
├── proxy.ts                            # Domain → site resolution, header injection
├── src/
│   ├── app/
│   │   ├── [locale]/                   # Locale-prefixed routes
│   │   │   ├── page.tsx                # Homepage
│   │   │   ├── shop/                   # Product browsing
│   │   │   │   ├── page.tsx            # Main shop page
│   │   │   │   ├── planners/           # Category pages
│   │   │   │   ├── printables/
│   │   │   │   ├── notebooks/
│   │   │   │   ├── bundles/
│   │   │   │   └── templates/
│   │   │   ├── checkout/               # Stripe checkout + success page
│   │   │   ├── blog/                   # Blog listing + [slug] detail
│   │   │   ├── account/                # Customer account
│   │   │   │   ├── library/            # Purchased products
│   │   │   │   ├── downloads/          # Digital downloads
│   │   │   │   └── orders/             # Order history
│   │   │   ├── admin/                  # Admin panel
│   │   │   │   ├── layout.tsx          # Sidebar layout with site switcher
│   │   │   │   ├── page.tsx            # Dashboard
│   │   │   │   ├── products/
│   │   │   │   ├── templates/
│   │   │   │   ├── bundles/
│   │   │   │   ├── orders/
│   │   │   │   ├── customers/
│   │   │   │   ├── blog/
│   │   │   │   ├── pages/              # Content pages
│   │   │   │   ├── reviews/
│   │   │   │   ├── menus/              # Menu builder (drag-and-drop)
│   │   │   │   ├── tags/
│   │   │   │   ├── discounts/          # Automatic discounts
│   │   │   │   ├── discount-codes/     # Code-based discounts
│   │   │   │   ├── featured/
│   │   │   │   ├── pricing/            # Bulk pricing editor
│   │   │   │   ├── settings/           # Site config
│   │   │   │   └── cleanup/
│   │   │   └── [...slug]/              # Dynamic slug routing
│   │   └── api/
│   │       ├── admin/                  # Admin CRUD APIs (~20 subdirectories)
│   │       │   ├── products/
│   │       │   ├── templates/
│   │       │   ├── bundles/
│   │       │   ├── orders/
│   │       │   ├── customers/
│   │       │   ├── blog/
│   │       │   ├── content-pages/
│   │       │   ├── reviews/
│   │       │   ├── menus/
│   │       │   ├── tags/
│   │       │   ├── discounts/
│   │       │   ├── discount-codes/
│   │       │   ├── settings/
│   │       │   ├── site/               # Site switcher API
│   │       │   ├── login/
│   │       │   ├── logout/
│   │       │   └── ...
│   │       └── checkout/
│   │           └── webhook/            # Stripe webhook handler
│   ├── lib/
│   │   ├── site-context.ts             # Domain → site resolution, getSiteFromHeaders()
│   │   ├── admin-site.ts               # Admin site cookie, getAdminSiteId()
│   │   ├── admin-auth.ts               # JWT auth, role-based access
│   │   ├── customer-auth.ts            # Magic link login, sessions
│   │   ├── prisma.ts                   # Prisma client
│   │   ├── i18n.ts                     # Locale handling
│   │   ├── stripe.ts                   # Stripe integration
│   │   ├── email.ts                    # Transactional email sender
│   │   ├── s3.ts                       # S3-compatible file storage
│   │   ├── settings.ts                 # Per-site settings (key-value)
│   │   ├── order-service.ts            # Order creation with safe numbering
│   │   ├── slug-routes.ts              # Slug resolution per site/locale
│   │   └── ...
│   ├── components/
│   │   ├── storefront/                 # Customer-facing components
│   │   └── admin/                      # Admin panel components (~37 components)
│   │       ├── layout/                 # AdminHeader, AdminSidebar, SiteSwitcher
│   │       ├── shared/                 # DataTable, StatusBadge, ConfirmDialog
│   │       ├── products/               # ProductForm, ImageManager, etc.
│   │       ├── orders/                 # OrderForm, OrderTable
│   │       ├── customers/              # CustomerTable, CustomerAccessManager
│   │       └── ...
│   └── app/sitemap.ts                  # Dynamic sitemap (currently LBL only)
├── public/
├── .env
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### Not yet created (from spec):
```
├── src/
│   ├── lib/
│   │   ├── myparcel.ts                 # TODO: MyParcel shipping API
│   │   └── bol/                        # TODO: Bol.com API client
│   │       ├── client.ts
│   │       ├── orders.ts
│   │       ├── stock.ts
│   │       └── offers.ts
│   ├── app/
│   │   ├── [locale]/admin/
│   │   │   ├── inventory/              # TODO: Inventory management
│   │   │   ├── shipping/               # TODO: Shipping zones/rates
│   │   │   ├── channels/               # TODO: Bol.com channels
│   │   │   ├── email-templates/        # TODO: Email template editor
│   │   │   └── settings/theme/         # TODO: Visual theme editor
│   │   └── api/
│   │       ├── webhooks/bol/           # TODO: Bol.com webhooks
│   │       └── cron/
│   │           ├── bol-sync/           # TODO: Bol order/stock sync
│   │           └── email/              # TODO: Email queue processing
│   └── middleware.ts                   # Uses proxy.ts pattern instead
```

## Site Context & Routing

The middleware resolves every request to a site context:

```typescript
// middleware.ts pseudocode
// 1. Read hostname from request
// 2. Look up site by domain (cache this)
// 3. If site.has_multilingual: extract locale from URL path
// 4. If no locale in URL and site has multiple locales: redirect to default
// 5. If site has single locale: no locale prefix in URLs
// 6. Inject site_id and locale into request context
```

**URL patterns:**
- `matcare.com/nl/producten/ovulatietest` → site: matcare, locale: nl
- `matcare.com/en/products/ovulation-test` → site: matcare, locale: en
- `layoutsbylenny.com/planners/2026-daily` → site: lbl, locale: en (no prefix)
- `clariz.nl/zwangerschapsbol` → site: clariz, locale: nl (no prefix)

The `slug_route` table resolves slugs to entities per site per locale.

## Database Schema

### Site & Localization

```prisma
model Site {
  id                    String   @id @default(uuid())
  code                  String   @unique @db.VarChar(30)
  name                  String   @db.VarChar(100)
  domains               Json     // ['layoutsbylenny.com']
  defaultLocale         String   @map("default_locale") @db.VarChar(5)
  locales               Json     // ['en'] or ['nl','en','de','fr']
  currency              String   @default("EUR") @db.VarChar(3)
  timezone              String   @default("Europe/Amsterdam") @db.VarChar(50)

  // Feature flags
  hasShipping           Boolean  @default(false) @map("has_shipping")
  hasDigitalDelivery    Boolean  @default(false) @map("has_digital_delivery")
  hasMultilingual       Boolean  @default(false) @map("has_multilingual")
  hasBolIntegration     Boolean  @default(false) @map("has_bol_integration")
  hasBundles            Boolean  @default(false) @map("has_bundles")
  hasTemplates          Boolean  @default(false) @map("has_templates")
  hasBlog               Boolean  @default(true) @map("has_blog")
  hasReviews            Boolean  @default(true) @map("has_reviews")

  // Branding
  logoUrl               String?  @map("logo_url") @db.VarChar(500)
  faviconUrl            String?  @map("favicon_url") @db.VarChar(500)
  primaryColor          String?  @map("primary_color") @db.VarChar(7)
  accentColor           String?  @map("accent_color") @db.VarChar(7)
  footerText            String?  @map("footer_text") @db.Text
  theme                 Json?    // Full visual theme config (colors, fonts, layout styles)

  // SEO
  defaultMetaTitle      String?  @map("default_meta_title") @db.VarChar(200)
  defaultMetaDescription String? @map("default_meta_description") @db.VarChar(300)

  // Payment
  stripeAccountId       String?  @map("stripe_account_id") @db.VarChar(100)
  stripeWebhookSecret   String?  @map("stripe_webhook_secret") @db.VarChar(200)

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  // Relations
  categories      Category[]
  products        Product[]
  templates       Template[]
  bundles         Bundle[]
  contentPages    ContentPage[]
  blogPosts       BlogPost[]
  reviews         Review[]
  customers       Customer[]
  orders          Order[]
  salesChannels   SalesChannel[]
  shippingZones   ShippingZone[]
  coupons         Coupon[]
  emailTemplates  EmailTemplate[]
  productTags     ProductTag[]
  slugRoutes      SlugRoute[]
  menus           Menu[]

  @@map("site")
}

model Language {
  code       String  @id @db.VarChar(5)
  name       String  @db.VarChar(50)
  nativeName String  @map("native_name") @db.VarChar(50)
  isActive   Boolean @default(true) @map("is_active")
  sortOrder  Int     @default(0) @map("sort_order")

  @@map("language")
}

model SlugRoute {
  id            Int      @id @default(autoincrement())
  siteId       String   @map("site_id")
  locale        String   @db.VarChar(5)
  slug          String   @db.VarChar(200)
  entityType    String   @map("entity_type") @db.VarChar(20)
  // One of these will be set based on entityType
  categoryId    Int?     @map("category_id")
  productId     Int?     @map("product_id")
  templateId    Int?     @map("template_id")
  bundleId      Int?     @map("bundle_id")
  tagId         Int?     @map("tag_id")
  pageId        Int?     @map("page_id")
  blogPostId    Int?     @map("blog_post_id")
  redirectToId  Int?     @map("redirect_to_id")
  isPrimary     Boolean  @default(true) @map("is_primary")
  createdAt     DateTime @default(now()) @map("created_at")

  site        Site    @relation(fields: [siteId], references: [id])
  redirect      SlugRoute? @relation("SlugRedirect", fields: [redirectToId], references: [id])
  redirectedFrom SlugRoute[] @relation("SlugRedirect")

  @@unique([siteId, locale, slug])
  @@map("slug_route")
}
```

### Products

```prisma
model Category {
  id          Int      @id @default(autoincrement())
  siteId     String   @map("site_id")
  parentId    Int?     @map("parent_id")
  imageUrl    String?  @map("image_url") @db.VarChar(500)
  sortOrder   Int      @default(0) @map("sort_order")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  site       Site                @relation(fields: [siteId], references: [id])
  parent       Category?            @relation("CategoryTree", fields: [parentId], references: [id])
  children     Category[]           @relation("CategoryTree")
  translations CategoryTranslation[]
  products     Product[]

  @@map("category")
}

model CategoryTranslation {
  id              Int    @id @default(autoincrement())
  categoryId      Int    @map("category_id")
  locale          String @db.VarChar(5)
  name            String @db.VarChar(100)
  description     String? @db.Text
  metaTitle       String? @map("meta_title") @db.VarChar(200)
  metaDescription String? @map("meta_description") @db.VarChar(300)

  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, locale])
  @@map("category_translation")
}

model Product {
  id               Int      @id @default(autoincrement())
  siteId          String   @map("site_id")
  categoryId       Int?     @map("category_id")
  templateId       Int?     @map("template_id") // LBL: links to template/theme
  sku              String?  @db.VarChar(50)
  ean              String?  @db.VarChar(20)

  // Pricing
  price            Decimal  @db.Decimal(10, 2)
  compareAtPrice   Decimal? @map("compare_at_price") @db.Decimal(10, 2)
  costPrice        Decimal? @map("cost_price") @db.Decimal(10, 2)
  vatRate          Decimal  @default(21.00) @map("vat_rate") @db.Decimal(5, 2)

  // Physical product fields (nullable)
  weightGrams      Int?     @map("weight_grams")
  hsCode           String?  @map("hs_code") @db.VarChar(20)
  countryOfOrigin  String?  @map("country_of_origin") @db.VarChar(2)

  // Digital delivery (LBL: gated file behind purchase)
  digitalFileUrl   String?  @map("digital_file_url") @db.VarChar(500)
  digitalFileSize  BigInt?  @map("digital_file_size")

  // Images
  images           Json     @default("[]") // [{url, alt, sortOrder}]

  // Flags
  isActive         Boolean  @default(true) @map("is_active")
  isFeatured       Boolean  @default(false) @map("is_featured")
  sortOrder        Int      @default(0) @map("sort_order")

  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  site           Site                @relation(fields: [siteId], references: [id])
  category         Category?            @relation(fields: [categoryId], references: [id])
  template         Template?            @relation(fields: [templateId], references: [id])
  translations     ProductTranslation[]
  variants         ProductVariant[]
  files            ProductFile[]        // Manuals, info sheets (public downloads)
  inventory        Inventory?
  channelListings  ChannelListing[]
  reviews          Review[]
  orderItems       OrderItem[]
  bundleItems      BundleItem[]
  tags             ProductToTag[]
  inventoryMovements InventoryMovement[]

  @@unique([siteId, sku])
  @@map("product")
}

model ProductTranslation {
  id               Int     @id @default(autoincrement())
  productId        Int     @map("product_id")
  locale           String  @db.VarChar(5)
  name             String  @db.VarChar(200)
  shortDescription String? @map("short_description") @db.Text
  description      String? @db.Text // Rich text / HTML
  metaTitle        String? @map("meta_title") @db.VarChar(200)
  metaDescription  String? @map("meta_description") @db.VarChar(300)
  features         Json?   // Bullet points, specs, etc.

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, locale])
  @@map("product_translation")
}

model ProductVariant {
  id             Int      @id @default(autoincrement())
  productId      Int      @map("product_id")
  sku            String?  @db.VarChar(50)
  ean            String?  @db.VarChar(20)
  name           String   @db.VarChar(100) // e.g. '50-pack', 'Large'
  priceOverride  Decimal? @map("price_override") @db.Decimal(10, 2)
  weightGrams    Int?     @map("weight_grams")
  isActive       Boolean  @default(true) @map("is_active")
  sortOrder      Int      @default(0) @map("sort_order")

  product          Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  inventory        Inventory?
  channelListings  ChannelListing[]
  orderItems       OrderItem[]
  inventoryMovements InventoryMovement[]

  @@unique([productId, sku])
  @@map("product_variant")
}

// Public downloadable files (manuals, info sheets, spec sheets)
// NOT gated behind purchase — available to anyone on the product page
model ProductFile {
  id          Int      @id @default(autoincrement())
  productId   Int      @map("product_id")
  locale      String?  @db.VarChar(5) // null = all locales
  fileUrl     String   @map("file_url") @db.VarChar(500)
  fileName    String   @map("file_name") @db.VarChar(200)
  fileType    String   @map("file_type") @db.VarChar(20) // 'manual', 'info_sheet', 'certificate', 'datasheet'
  fileSize    Int?     @map("file_size") // bytes
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_file")
}

model ProductTag {
  id       Int     @id @default(autoincrement())
  siteId  String  @map("site_id")
  slug     String  @db.VarChar(100)
  isActive Boolean @default(true) @map("is_active")

  site       Site                @relation(fields: [siteId], references: [id])
  translations ProductTagTranslation[]
  products     ProductToTag[]

  @@unique([siteId, slug])
  @@map("product_tag")
}

model ProductTagTranslation {
  id     Int    @id @default(autoincrement())
  tagId  Int    @map("tag_id")
  locale String @db.VarChar(5)
  name   String @db.VarChar(100)

  tag ProductTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([tagId, locale])
  @@map("product_tag_translation")
}

model ProductToTag {
  productId Int @map("product_id")
  tagId     Int @map("tag_id")

  product Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag     ProductTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@map("product_to_tag")
}
```

### Templates & Bundles

```prisma
// Templates are "themes/styles" for digital products (LBL-specific concept)
// E.g. "Botanical", "Midnight Blue", "Minimalist"
// A product links to a template via product.templateId
model Template {
  id            Int      @id @default(autoincrement())
  siteId       String   @map("site_id")
  slug          String   @db.VarChar(100)
  colorHex      String?  @map("color_hex") @db.VarChar(7)
  previewImage  String?  @map("preview_image") @db.VarChar(500)
  defaultPrice  Decimal? @map("default_price") @db.Decimal(10, 2)
  isActive      Boolean  @default(true) @map("is_active")
  sortOrder     Int      @default(0) @map("sort_order")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  site       Site                @relation(fields: [siteId], references: [id])
  translations TemplateTranslation[]
  products     Product[]

  @@unique([siteId, slug])
  @@map("template")
}

model TemplateTranslation {
  id          Int    @id @default(autoincrement())
  templateId  Int    @map("template_id")
  locale      String @db.VarChar(5)
  name        String @db.VarChar(100)
  description String? @db.Text

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, locale])
  @@map("template_translation")
}

model Bundle {
  id              Int      @id @default(autoincrement())
  siteId         String   @map("site_id")
  slug            String   @db.VarChar(100)
  price           Decimal  @db.Decimal(10, 2)
  compareAtPrice  Decimal? @map("compare_at_price") @db.Decimal(10, 2)
  imageUrl        String?  @map("image_url") @db.VarChar(500)
  isActive        Boolean  @default(true) @map("is_active")
  sortOrder       Int      @default(0) @map("sort_order")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  site       Site              @relation(fields: [siteId], references: [id])
  translations BundleTranslation[]
  items        BundleItem[]

  @@unique([siteId, slug])
  @@map("bundle")
}

model BundleTranslation {
  id          Int    @id @default(autoincrement())
  bundleId    Int    @map("bundle_id")
  locale      String @db.VarChar(5)
  name        String @db.VarChar(200)
  description String? @db.Text

  bundle Bundle @relation(fields: [bundleId], references: [id], onDelete: Cascade)

  @@unique([bundleId, locale])
  @@map("bundle_translation")
}

model BundleItem {
  id        Int @id @default(autoincrement())
  bundleId  Int @map("bundle_id")
  productId Int @map("product_id")
  quantity  Int @default(1)
  sortOrder Int @default(0) @map("sort_order")

  bundle  Bundle  @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@map("bundle_item")
}
```

### Inventory

```prisma
model Inventory {
  id                Int      @id @default(autoincrement())
  productId         Int?     @map("product_id")
  variantId         Int?     @map("variant_id")
  quantityOnHand    Int      @default(0) @map("quantity_on_hand")
  quantityReserved  Int      @default(0) @map("quantity_reserved")
  lvbQuantity       Int      @default(0) @map("lvb_quantity") // Stock at Bol warehouse
  lowStockThreshold Int      @default(5) @map("low_stock_threshold")
  updatedAt         DateTime @updatedAt @map("updated_at")

  product Product?        @relation(fields: [productId], references: [id])
  variant ProductVariant? @relation(fields: [variantId], references: [id])

  // Either product-level or variant-level inventory, not both
  @@unique([productId])
  @@unique([variantId])
  @@map("inventory")
}

model InventoryMovement {
  id             Int      @id @default(autoincrement())
  productId      Int      @map("product_id")
  variantId      Int?     @map("variant_id")
  quantityChange Int      @map("quantity_change") // +5 restock, -1 sale
  type           String   @db.VarChar(20) // 'sale','return','adjustment','lvb_shipment','lvb_return'
  referenceType  String?  @map("reference_type") @db.VarChar(20) // 'order','return'
  referenceId    Int?     @map("reference_id")
  notes          String?  @db.Text
  createdBy      Int?     @map("created_by")
  createdAt      DateTime @default(now()) @map("created_at")

  product Product        @relation(fields: [productId], references: [id])
  variant ProductVariant? @relation(fields: [variantId], references: [id])
  user    AdminUser?     @relation(fields: [createdBy], references: [id])

  @@map("inventory_movement")
}
```

### Sales Channels (Bol.com)

```prisma
model SalesChannel {
  id              Int      @id @default(autoincrement())
  siteId         String   @map("site_id")
  type            String   @db.VarChar(20) // 'bol', 'webshop'
  code            String   @unique @db.VarChar(50) // 'matcare_bol_nl'
  name            String   @db.VarChar(100)
  country         String?  @db.VarChar(2)

  // Bol API credentials (should be encrypted at rest)
  apiClientId     String?  @map("api_client_id") @db.VarChar(255)
  apiClientSecret String?  @map("api_client_secret") @db.VarChar(255)

  isLvb           Boolean  @default(false) @map("is_lvb")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  site   Site            @relation(fields: [siteId], references: [id])
  listings ChannelListing[]
  orders   Order[]
  syncLogs BolSyncLog[]

  @@map("sales_channel")
}

model ChannelListing {
  id              Int      @id @default(autoincrement())
  channelId       Int      @map("channel_id")
  productId       Int      @map("product_id")
  variantId       Int?     @map("variant_id")

  externalOfferId String?  @map("external_offer_id") @db.VarChar(50)
  price           Decimal  @db.Decimal(10, 2)
  deliveryCode    String?  @map("delivery_code") @db.VarChar(20)
  shippingMethod  String?  @map("shipping_method") @db.VarChar(20) // 'vvb','myparcel','stamp'
  conditionName   String   @default("NEW") @map("condition_name") @db.VarChar(10)

  stockSyncedAt   DateTime? @map("stock_synced_at")
  lastSyncError   String?   @map("last_sync_error") @db.Text
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  channel  SalesChannel   @relation(fields: [channelId], references: [id])
  product  Product        @relation(fields: [productId], references: [id])
  variant  ProductVariant? @relation(fields: [variantId], references: [id])

  @@unique([channelId, productId, variantId])
  @@map("channel_listing")
}

model BolSyncLog {
  id            Int       @id @default(autoincrement())
  channelId     Int       @map("channel_id")
  syncType      String    @map("sync_type") @db.VarChar(30) // 'orders','stock','offers'
  status        String    @db.VarChar(20) // 'running','completed','failed'
  recordsSynced Int       @default(0) @map("records_synced")
  errorMessage  String?   @map("error_message") @db.Text
  startedAt     DateTime  @default(now()) @map("started_at")
  completedAt   DateTime? @map("completed_at")

  channel SalesChannel @relation(fields: [channelId], references: [id])

  @@map("bol_sync_log")
}
```

### Customers

```prisma
model Customer {
  id           Int      @id @default(autoincrement())
  siteId      String   @map("site_id")
  email        String   @db.VarChar(255)
  passwordHash String?  @map("password_hash") @db.VarChar(255) // null for Bol customers
  firstName    String?  @map("first_name") @db.VarChar(100)
  lastName     String?  @map("last_name") @db.VarChar(100)
  phone        String?  @db.VarChar(20)
  locale       String   @default("nl") @db.VarChar(5)

  // Default address
  street      String?  @db.VarChar(200)
  houseNr     String?  @map("house_nr") @db.VarChar(20)
  houseExt    String?  @map("house_ext") @db.VarChar(20)
  postalCode  String?  @map("postal_code") @db.VarChar(20)
  city        String?  @db.VarChar(100)
  country     String?  @db.VarChar(2)

  source      String   @default("webshop") @db.VarChar(20) // 'webshop','bol'
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  site Site   @relation(fields: [siteId], references: [id])
  orders Order[]

  // Same email on different sites = different customers
  @@unique([siteId, email])
  @@map("customer")
}
```

### Orders

```prisma
model Order {
  id                Int      @id @default(autoincrement())
  siteId           String   @map("site_id")
  channelId         Int?     @map("channel_id") // null for direct webshop, set for Bol
  customerId        Int?     @map("customer_id")
  orderNumber       String   @map("order_number") @db.VarChar(50)
  externalOrderId   String?  @map("external_order_id") @db.VarChar(50) // Bol order ID

  source            String   @default("webshop") @db.VarChar(20) // 'webshop','bol'
  email             String?  @db.VarChar(255)
  locale            String?  @db.VarChar(5) // Customer's language for emails

  // Shipping address (snapshot at time of order)
  shippingName       String?  @map("shipping_name") @db.VarChar(200)
  shippingStreet     String?  @map("shipping_street") @db.VarChar(200)
  shippingHouseNr    String?  @map("shipping_house_nr") @db.VarChar(20)
  shippingHouseExt   String?  @map("shipping_house_ext") @db.VarChar(20)
  shippingPostalCode String?  @map("shipping_postal_code") @db.VarChar(20)
  shippingCity       String?  @map("shipping_city") @db.VarChar(100)
  shippingCountry    String?  @map("shipping_country") @db.VarChar(2)

  // Billing address (snapshot)
  billingName        String?  @map("billing_name") @db.VarChar(200)
  billingStreet      String?  @map("billing_street") @db.VarChar(200)
  billingHouseNr     String?  @map("billing_house_nr") @db.VarChar(20)
  billingHouseExt    String?  @map("billing_house_ext") @db.VarChar(20)
  billingPostalCode  String?  @map("billing_postal_code") @db.VarChar(20)
  billingCity        String?  @map("billing_city") @db.VarChar(100)
  billingCountry     String?  @map("billing_country") @db.VarChar(2)

  // Totals
  subtotal          Decimal  @db.Decimal(10, 2)
  shippingCost      Decimal  @default(0) @map("shipping_cost") @db.Decimal(10, 2)
  discountAmount    Decimal  @default(0) @map("discount_amount") @db.Decimal(10, 2)
  taxAmount         Decimal  @default(0) @map("tax_amount") @db.Decimal(10, 2)
  total             Decimal  @db.Decimal(10, 2)
  currency          String   @default("EUR") @db.VarChar(3)

  // Coupon
  couponId          Int?     @map("coupon_id")

  // Payment
  paymentStatus     String   @default("pending") @map("payment_status") @db.VarChar(20)
  // 'pending','paid','refunded','partially_refunded','failed'
  paymentMethod     String?  @map("payment_method") @db.VarChar(30) // 'stripe','ideal','bol'
  stripePaymentId   String?  @map("stripe_payment_id") @db.VarChar(100)
  paidAt            DateTime? @map("paid_at")

  // Order status
  status            String   @default("pending") @db.VarChar(20)
  // 'pending','processing','shipped','delivered','cancelled','completed'

  // Digital delivery (LBL)
  downloadToken     String?  @map("download_token") @db.VarChar(100)
  downloadExpiresAt DateTime? @map("download_expires_at")

  // Notes
  customerNotes     String?  @map("customer_notes") @db.Text
  internalNotes     String?  @map("internal_notes") @db.Text

  // Dates
  orderDate         DateTime @default(now()) @map("order_date")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  site    Site         @relation(fields: [siteId], references: [id])
  channel   SalesChannel? @relation(fields: [channelId], references: [id])
  customer  Customer?     @relation(fields: [customerId], references: [id])
  coupon    Coupon?       @relation(fields: [couponId], references: [id])
  items     OrderItem[]
  shipments Shipment[]
  returns   Return[]

  @@unique([siteId, orderNumber])
  @@map("order")
}

model OrderItem {
  id                     Int      @id @default(autoincrement())
  orderId                Int      @map("order_id")
  productId              Int?     @map("product_id")
  variantId              Int?     @map("variant_id")
  shipmentId             Int?     @map("shipment_id")

  externalOrderItemId    String?  @map("external_order_item_id") @db.VarChar(50) // Bol

  // Product snapshot
  ean                    String?  @db.VarChar(20)
  productName            String   @map("product_name") @db.VarChar(255)
  variantName            String?  @map("variant_name") @db.VarChar(100)
  quantity               Int      @default(1)
  unitPrice              Decimal  @map("unit_price") @db.Decimal(10, 2)
  taxRate                Decimal? @map("tax_rate") @db.Decimal(5, 2)
  lineTotal              Decimal  @map("line_total") @db.Decimal(10, 2)

  // Bol fees
  commissionTotal        Decimal? @map("commission_total") @db.Decimal(10, 2)

  // Status (order-item level for Bol compatibility)
  status                 String   @default("pending") @db.VarChar(20)
  // 'pending','processing','shipped','delivered','cancelled','returned'

  // Digital delivery snapshot
  digitalFileUrl         String?  @map("digital_file_url") @db.VarChar(500)
  downloadedAt           DateTime? @map("downloaded_at")

  // Cancellation
  cancelledQuantity      Int      @default(0) @map("cancelled_quantity")
  cancelReason           String?  @map("cancel_reason") @db.VarChar(255)
  cancelledAt            DateTime? @map("cancelled_at")

  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  order    Order           @relation(fields: [orderId], references: [id])
  product  Product?        @relation(fields: [productId], references: [id])
  variant  ProductVariant? @relation(fields: [variantId], references: [id])
  shipment Shipment?       @relation(fields: [shipmentId], references: [id])
  returns  Return[]

  @@map("order_item")
}
```

### Shipping

```prisma
model ShippingZone {
  id        Int     @id @default(autoincrement())
  siteId   String  @map("site_id")
  name      String  @db.VarChar(100) // 'Netherlands', 'Belgium'
  countries Json    // ['NL'] or ['BE']
  isActive  Boolean @default(true) @map("is_active")

  siteSite          @relation(fields: [siteId], references: [id])
  rates ShippingRate[]

  @@map("shipping_zone")
}

model ShippingRate {
  id              Int      @id @default(autoincrement())
  zoneId          Int      @map("zone_id")
  name            String   @db.VarChar(100) // 'Standard', 'Letterbox', 'Parcel'
  minWeightGrams  Int?     @map("min_weight_grams")
  maxWeightGrams  Int?     @map("max_weight_grams")
  price           Decimal  @db.Decimal(10, 2)
  freeAbove       Decimal? @map("free_above") @db.Decimal(10, 2) // Free shipping threshold
  carrier         String?  @db.VarChar(20) // 'postnl','dhl'
  carrierService  String?  @map("carrier_service") @db.VarChar(30) // 'mailbox','parcel'
  isDefault       Boolean  @default(false) @map("is_default")
  sortOrder       Int      @default(0) @map("sort_order")

  zone ShippingZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)

  @@map("shipping_rate")
}

model Shipment {
  id                   Int       @id @default(autoincrement())
  orderId              Int       @map("order_id")

  carrier              String?   @db.VarChar(20) // 'postnl','dhl','bol_vvb'
  carrierService       String?   @map("carrier_service") @db.VarChar(30)

  myparcelShipmentId   String?   @map("myparcel_shipment_id") @db.VarChar(50)
  labelUrl             String?   @map("label_url") @db.VarChar(500)
  labelDownloadedAt    DateTime? @map("label_downloaded_at")

  trackingCode         String?   @map("tracking_code") @db.VarChar(100)
  trackingUrl          String?   @map("tracking_url") @db.VarChar(255)

  weightGrams          Int?      @map("weight_grams")
  shippingCost         Decimal?  @map("shipping_cost") @db.Decimal(10, 2)

  promisedDeliveryDate DateTime? @map("promised_delivery_date") @db.Date
  expectedShipBy       DateTime? @map("expected_ship_by")
  handedInAt           DateTime? @map("handed_in_at")
  shippedAt            DateTime? @map("shipped_at")
  deliveredAt          DateTime? @map("delivered_at")

  status               String    @default("pending") @db.VarChar(30)
  // 'pending','label_requested','label_ready','label_downloaded',
  // 'shipped','in_transit','delivered','delivery_failed','returned_to_sender'

  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  order Order       @relation(fields: [orderId], references: [id])
  items OrderItem[]

  @@map("shipment")
}

model Return {
  id                Int       @id @default(autoincrement())
  orderId           Int       @map("order_id")
  orderItemId       Int       @map("order_item_id")

  externalReturnId  String?   @map("external_return_id") @db.VarChar(50) // Bol return ID
  reason            String?   @db.VarChar(255)
  quantity          Int       @default(1)
  status            String    @default("pending") @db.VarChar(20)
  // 'pending','received','approved','rejected','refunded'
  refundAmount      Decimal?  @map("refund_amount") @db.Decimal(10, 2)
  notes             String?   @db.Text

  receivedAt        DateTime? @map("received_at")
  resolvedAt        DateTime? @map("resolved_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  order     Order     @relation(fields: [orderId], references: [id])
  orderItem OrderItem @relation(fields: [orderItemId], references: [id])

  @@map("return")
}
```

### Coupons

```prisma
model Coupon {
  id              Int       @id @default(autoincrement())
  siteId         String    @map("site_id")
  code            String    @db.VarChar(50) // 'WELCOME10'
  type            String    @db.VarChar(20) // 'percentage','fixed_amount','free_shipping'
  value           Decimal   @db.Decimal(10, 2) // 10 = 10% or €10
  minOrderAmount  Decimal?  @map("min_order_amount") @db.Decimal(10, 2)
  maxUses         Int?      @map("max_uses")
  timesUsed       Int       @default(0) @map("times_used")
  validFrom       DateTime? @map("valid_from")
  validUntil      DateTime? @map("valid_until")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  site Site   @relation(fields: [siteId], references: [id])
  orders Order[]

  @@unique([siteId, code])
  @@map("coupon")
}
```

### CMS & Content

```prisma
model ContentPage {
  id           Int      @id @default(autoincrement())
  siteId      String   @map("site_id")
  slug         String   @db.VarChar(100)
  pageType     String   @default("page") @map("page_type") @db.VarChar(20)
  // 'page','landing','policy'
  bannerImage  String?  @map("banner_image") @db.VarChar(500)
  settings     Json?
  isPublished  Boolean  @default(false) @map("is_published")
  sortOrder    Int      @default(0) @map("sort_order")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  site       Site                    @relation(fields: [siteId], references: [id])
  translations ContentPageTranslation[]

  @@unique([siteId, slug])
  @@map("content_page")
}

model ContentPageTranslation {
  id              Int    @id @default(autoincrement())
  pageId          Int    @map("page_id")
  locale          String @db.VarChar(5)
  title           String @db.VarChar(200)
  content         String? @db.Text
  metaTitle       String? @map("meta_title") @db.VarChar(200)
  metaDescription String? @map("meta_description") @db.VarChar(300)

  page ContentPage @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@unique([pageId, locale])
  @@map("content_page_translation")
}

model BlogPost {
  id            Int       @id @default(autoincrement())
  siteId       String    @map("site_id")
  slug          String    @db.VarChar(100)
  featuredImage String?   @map("featured_image") @db.VarChar(500)
  isPublished   Boolean   @default(false) @map("is_published")
  publishedAt   DateTime? @map("published_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  site       Site                @relation(fields: [siteId], references: [id])
  translations BlogPostTranslation[]

  @@unique([siteId, slug])
  @@index([isPublished, publishedAt])
  @@map("blog_post")
}

model BlogPostTranslation {
  id              Int    @id @default(autoincrement())
  postId          Int    @map("post_id")
  locale          String @db.VarChar(5)
  title           String @db.VarChar(200)
  excerpt         String? @db.Text
  content         String? @db.Text
  metaTitle       String? @map("meta_title") @db.VarChar(200)
  metaDescription String? @map("meta_description") @db.VarChar(300)

  post BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([postId, locale])
  @@map("blog_post_translation")
}

model Review {
  id           Int      @id @default(autoincrement())
  siteId      String   @map("site_id")
  productId    Int      @map("product_id")
  customerName String   @map("customer_name") @db.VarChar(100)
  rating       Int      // 1-5
  isVerified   Boolean  @default(false) @map("is_verified")
  isPublished  Boolean  @default(false) @map("is_published")
  source       String   @default("webshop") @db.VarChar(20) // 'webshop','bol','manual'
  createdAt    DateTime @default(now()) @map("created_at")

  site       Site              @relation(fields: [siteId], references: [id])
  product      Product            @relation(fields: [productId], references: [id])
  translations ReviewTranslation[]

  @@map("review")
}

model ReviewTranslation {
  id       Int    @id @default(autoincrement())
  reviewId Int    @map("review_id")
  locale   String @db.VarChar(5)
  title    String? @db.VarChar(200)
  content  String? @db.Text

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@unique([reviewId, locale])
  @@map("review_translation")
}
```

### Email Templates

```prisma
model EmailTemplate {
  id        Int     @id @default(autoincrement())
  siteId   String  @map("site_id")
  type      String  @db.VarChar(50)
  // 'order_confirmation','shipping_notification','download_ready',
  // 'review_request','password_reset','welcome','return_confirmation'
  locale    String  @db.VarChar(5)
  subject   String  @db.VarChar(300) // Supports {{order_number}} etc.
  bodyHtml  String  @map("body_html") @db.Text // With {{variable}} placeholders
  isActive  Boolean @default(true) @map("is_active")
  updatedAt DateTime @updatedAt @map("updated_at")

  siteSite @relation(fields: [siteId], references: [id])

  @@unique([siteId, type, locale])
  @@map("email_template")
}
```

### Navigation Menus

Fully configurable navigation per site. Each site has its own menus (header, footer, sidebar). Menu items can link to internal entities (pages, categories, products, blog posts) via `linkType` + `entityId`, or to external URLs. Labels are translatable per locale. Items support nesting via `parentId` for dropdown menus.

```prisma
model Menu {
  id        Int    @id @default(autoincrement())
  siteId   String @map("site_id")
  location  String @db.VarChar(30) // 'header', 'footer', 'sidebar'

  siteSite      @relation(fields: [siteId], references: [id])
  items MenuItem[]

  @@unique([siteId, location])
  @@map("menu")
}

model MenuItem {
  id        Int     @id @default(autoincrement())
  menuId    Int     @map("menu_id")
  parentId  Int?    @map("parent_id")
  linkType  String  @db.VarChar(20) // 'page','category','product','url','blog'
  entityId  Int?    @map("entity_id")
  url       String? @db.VarChar(500)
  openNew   Boolean @default(false) @map("open_new")
  sortOrder Int     @default(0) @map("sort_order")

  menu         Menu                  @relation(fields: [menuId], references: [id], onDelete: Cascade)
  parent       MenuItem?             @relation("MenuTree", fields: [parentId], references: [id])
  children     MenuItem[]            @relation("MenuTree")
  translations MenuItemTranslation[]

  @@map("menu_item")
}

model MenuItemTranslation {
  id         Int    @id @default(autoincrement())
  menuItemId Int    @map("menu_item_id")
  locale     String @db.VarChar(5)
  label      String @db.VarChar(100)

  menuItem MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)

  @@unique([menuItemId, locale])
  @@map("menu_item_translation")
}
```

### Theme Configuration

The Site model's `theme` field holds the full visual theme config per site, loaded as CSS variables at runtime. The existing `primaryColor`, `accentColor`, `logoUrl`, `faviconUrl`, and `footerText` fields on Site can be kept for quick access but the `theme` JSON is the full source of truth for styling. The storefront layout reads `site.theme` and injects the values as CSS custom properties on `<body>`.

Example `theme` structure:

```json
{
  "colors": {
    "primary": "#1a1a2e",
    "accent": "#e94560",
    "background": "#ffffff",
    "surface": "#f8f9fa",
    "text": "#1a1a2e",
    "textMuted": "#6b7280",
    "border": "#e5e7eb",
    "error": "#ef4444",
    "success": "#22c55e"
  },
  "fonts": {
    "heading": "Playfair Display",
    "body": "Inter"
  },
  "borderRadius": "0.5rem",
  "navStyle": "centered",
  "productCardStyle": "minimal",
  "heroStyle": "full-width"
}
```

### Admin Users

```prisma
model AdminUser {
  id           Int      @id @default(autoincrement())
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  name         String   @db.VarChar(100)
  role         String   @default("admin") @db.VarChar(20) // 'super_admin','admin'
  siteAccess  Json     @default("[]") @map("site_access") // ['lbl','matcare'] or ['*']
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  inventoryMovements InventoryMovement[]

  @@map("admin_user")
}
```

## Conventions

### Code Style
- TypeScript strict mode
- Prisma for all database access — no raw SQL unless absolutely necessary
- Server components by default, client components only when interactivity needed
- API routes in `src/app/api/` using Next.js Route Handlers
- Zod for input validation on all API routes
- React Hook Form + Zod for admin panel forms

### Naming
- Database tables: snake_case (via Prisma @@map)
- Prisma models: PascalCase
- Prisma fields: camelCase (mapped to snake_case in DB)
- API routes: kebab-case
- React components: PascalCase
- Utility functions: camelCase
- Environment variables: UPPER_SNAKE_CASE

### Site Context Pattern
Every database query in the storefront MUST be scoped by `siteId`. Use the site context middleware — never trust client-provided site IDs.

```typescript
// CORRECT
const products = await prisma.product.findMany({
  where: { siteId: site.id, isActive: true }
})

// WRONG — leaks data across sites
const products = await prisma.product.findMany({
  where: { isActive: true }
})
```

The admin panel allows cross-site queries only for super_admin users and only in explicitly cross-site views (e.g., a global dashboard).

### Translation Pattern
Always fetch translations for the current locale with a fallback to the site's default locale:

```typescript
// Fetch product with translation for current locale
const product = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    translations: {
      where: { locale: { in: [currentLocale, site.defaultLocale] } }
    }
  }
})
// Pick currentLocale translation, fall back to defaultLocale
const t = product.translations.find(t => t.locale === currentLocale)
       ?? product.translations.find(t => t.locale === site.defaultLocale)
```

### File Storage
- Product images → S3: `/{site_code}/products/{product_id}/{filename}`
- Digital delivery files → S3: `/{site_code}/digital/{product_id}/{filename}` (signed URLs for download)
- Product files (manuals) → S3: `/{site_code}/files/{product_id}/{filename}` (public URLs)
- Email template assets → S3: `/{site_code}/email/{filename}`

### Environment Variables
```
DATABASE_URL=postgresql://user:pass@localhost:5432/lenx_platform
ADMIN_SECRET=...                    # JWT secret for admin auth
CUSTOMER_SECRET=...                 # JWT secret for customer auth

# Stripe (per site, but can use env for default)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# MyParcel
MYPARCEL_API_KEY=...

# S3 Storage
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=lenx-platform

# Email
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

## Implementation Status

> Status key: DONE = fully implemented, PARTIAL = partially done, TODO = not started

### Phase 1: Foundation — DONE

1. **DONE** — Next.js 16 project with TypeScript, Tailwind, shadcn/ui, React 19
2. **DONE** — Prisma 7 with full schema, all migrations applied (including store→site rename)
3. **DONE** — Seed file creates 4 sites (lbl, matcare, clariz, jellybean), languages, admin user (`prisma/seed.ts`)
4. **DONE** — Site context via `proxy.ts` (domain → site resolution, injects `x-site-id`/`x-site-code` headers) + `src/lib/site-context.ts` (reads headers, caches 5min). Note: uses proxy pattern instead of Next.js middleware.ts
5. **DONE** — Locale detection and routing in `proxy.ts` with translated URL segments per locale
6. **DONE** — Admin auth with JWT (jose, 24h tokens), bcrypt passwords, role-based access (`super_admin`/`admin`), site access control (`src/lib/admin-auth.ts`)
7. **DONE** — Admin layout with site switcher sidebar (`src/components/admin/layout/SiteSwitcher.tsx`), full reload on switch, all admin pages filter by selected site via `getAdminSiteId()`

### Phase 2: Product & Content Management (Admin) — DONE

1. **DONE** — Product CRUD with translations, slugs, images, variants, pricing, digital files. Admin API at `src/app/api/admin/products/`. Bulk operations, duplicate, file management
2. **DONE** — Category management (no dedicated admin page but used in product forms)
3. **DONE** — Template management with variable definitions and file properties (`src/app/[locale]/admin/templates/`)
4. **DONE** — Bundle management with translations and items (`src/app/[locale]/admin/bundles/`)
5. **DONE** — Product files upload to S3 (`src/lib/s3.ts`)
6. **DONE** — Content page editor with translations (`src/app/[locale]/admin/pages/`)
7. **DONE** — Blog post editor with translations and image uploads (`src/app/[locale]/admin/blog/`)
8. **DONE** — Review management with seeding and retranslation (`src/app/[locale]/admin/reviews/`)
9. **DONE** — Image/video upload to Hetzner S3-compatible storage (`src/lib/s3.ts`)
10. **DONE** — Menu builder with drag-and-drop, nested items, translations (`src/app/[locale]/admin/menus/`)
11. **PARTIAL** — Settings page exists (`src/app/[locale]/admin/settings/`) but no dedicated visual theme editor page. Site branding fields exist in DB

**Additional admin features built (beyond spec):**
- Discount management (automatic + code-based) at `src/app/[locale]/admin/discounts/` and `discount-codes/`
- Tag management at `src/app/[locale]/admin/tags/`
- Featured items management at `src/app/[locale]/admin/featured/`
- Pricing bulk editor at `src/app/[locale]/admin/pricing/`
- Cleanup tools at `src/app/[locale]/admin/cleanup/`
- Per-site settings (key-value store) via `src/lib/settings.ts`

### Phase 3: Storefront — DONE (for LBL)

1. **DONE** — Homepage at `src/app/[locale]/page.tsx` (currently LBL-focused)
2. **DONE** — Product listing under `src/app/[locale]/shop/` with subcategory pages (planners, printables, notebooks, bundles, templates)
3. **DONE** — Product detail pages with translations, reviews, files via slug routing
4. **DONE** — Blog listing (`src/app/[locale]/blog/`) and detail (`src/app/[locale]/blog/[slug]`)
5. **DONE** — Content pages (about, contact, terms, how-to-import) via slug routing
6. **PARTIAL** — SEO: meta tags and hreflang working, sitemap exists (`src/app/sitemap.ts`) but currently hardcoded to LBL site only — needs multi-site sitemap generation

**Note:** Storefront is fully functional for LBL (digital products). Physical product storefronts (MatCare, Clariz, Jelly Bean) will need adapted product listing/detail pages with shipping options, physical product attributes, and potentially different layouts per site theme.

### Phase 4: Cart & Checkout — DONE (for LBL digital)

1. **DONE** — Cart via context/API (no dedicated /cart route, handled in-page)
2. **TODO** — Shipping zone/rate calculation for physical products
3. **PARTIAL** — Discount codes work at checkout. Coupon model exists in schema but no dedicated coupon management admin page
4. **DONE** — Stripe checkout integration with webhook at `src/app/api/checkout/webhook/route.ts` (handles `checkout.session.completed` and `checkout.session.expired`)
5. **DONE** — Digital delivery flow: generates download token on purchase, grants customer access to products/bundles
6. **DONE** — Checkout success page at `src/app/[locale]/checkout/success/`
7. **DONE** — Order confirmation email sent via webhook handler (`src/lib/email.ts`)

### Phase 5: Customer Accounts — DONE

1. **DONE** — Magic link + email code login per site, 30-day sessions (`src/lib/customer-auth.ts`). Auto-create on purchase. Customers scoped by `(siteId, email)` unique constraint
2. **DONE** — Order history at `src/app/[locale]/account/orders/`
3. **DONE** — Download history / library at `src/app/[locale]/account/library/` and `downloads/`
4. **TODO** — Address management (not built yet)

### Phase 6: Shipping & Fulfillment — TODO

1. **PARTIAL** — Orders can be managed in admin (list, detail, manual creation) but no dedicated processing workflow (pick/pack/ship states)
2. **TODO** — MyParcel label generation (no `src/lib/myparcel.ts`)
3. **TODO** — Shipment tracking (Shipment model exists in schema but no UI/API)
4. **TODO** — Shipping notification emails
5. **TODO** — Returns management (Return model exists in schema but no UI/API)

**Schema ready:** ShippingZone, ShippingRate, Shipment, Return models all exist in Prisma schema. No admin pages or API routes built for these yet.

### Phase 7: Bol.com Integration — TODO

1. **TODO** — Bol.com API client (no `src/lib/bol/` directory)
2. **TODO** — Channel listing management (no `src/app/[locale]/admin/channels/`)
3. **TODO** — Order sync worker (no `src/app/api/cron/` directory)
4. **TODO** — Stock sync worker
5. **TODO** — Shipment confirmation push
6. **TODO** — Sync logging

**Schema ready:** SalesChannel, ChannelListing, BolSyncLog models all exist in Prisma schema. No implementation yet.

### Phase 8: Polish — PARTIAL

1. **TODO** — Email template editor (EmailTemplate model exists, no admin page at `email-templates/`)
2. **PARTIAL** — Coupon model exists in schema. Discount + discount code management built. No separate coupon admin page
3. **TODO** — Shipping zone/rate editor (no `src/app/[locale]/admin/shipping/`)
4. **PARTIAL** — Dashboard exists (`src/app/[locale]/admin/page.tsx`) with order counts and recent orders per site. No advanced KPIs/charts
5. **TODO** — Export/reporting

## What Works Today

### Fully operational (LBL):
- Complete storefront with product browsing, detail pages, reviews
- Stripe checkout with digital delivery
- Customer accounts with magic link login
- Order management (Etsy import + manual + shop orders)
- Full admin panel with product/template/bundle/blog/page/review/menu/discount management
- Multi-locale URL routing with translated slugs
- S3 file storage for images, videos, digital downloads

### Multi-tenant infrastructure (all sites):
- Database fully tenant-isolated (`siteId` on all tables, unique constraints per site)
- 4 sites seeded (LBL, MatCare, Clariz, Jelly Bean) with correct domains, locales, feature flags
- Admin site switcher working — all admin pages filter by selected site
- Domain → site resolution via proxy headers
- Per-site customer isolation
- Per-site settings (key-value store)
- Role-based admin access with per-site permissions

### Not yet built:
- Physical product checkout flow (shipping calculation, address collection)
- MyParcel shipping label generation
- Bol.com integration (API client, order sync, stock sync)
- Per-site sitemap generation (currently LBL only)
- Visual theme editor for per-site branding
- Email template editor
- Inventory management admin page
- Returns management
- Customer address management