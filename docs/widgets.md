# Widget System

The widget system allows you to embed dynamic content (like product grids, category cards, and CTAs) directly in your CMS HTML content using simple shortcodes.

## How to Use

1. Go to **Admin > Pages** and edit any page
2. Switch to **code view** (click the `</>` button in the toolbar)
3. Add shortcodes anywhere in your HTML content
4. Save the page

Widgets will be rendered dynamically when the page is displayed.

## Available Widgets

### Featured Products

Displays a grid of products marked as "featured" in the admin panel.

```
[featured-products]
[featured-products qty="6"]
[featured-products qty="4" title="Our Picks"]
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `qty` | 4 | Maximum number of products to show |
| `title` | "Featured" / "Uitgelicht" | Section heading |

---

### Latest Products

Displays the most recently added products.

```
[latest-products]
[latest-products qty="8"]
[latest-products qty="4" title="New Arrivals"]
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `qty` | 4 | Maximum number of products to show |
| `title` | "Latest Products" / "Nieuw Toegevoegd" | Section heading |

---

### Products by Category

Displays products filtered by product type/category.

```
[products category="planners" qty="4"]
[products category="notebooks" qty="3" title="Popular Notebooks"]
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `category` | *required* | Product type: `planners`, `notebooks`, `templates`, `printables` |
| `qty` | 4 | Maximum number of products to show |
| `title` | Category name | Section heading |

---

### Categories

Displays a grid of category cards linking to each product type.

```
[categories]
[categories title="Browse by Category"]
[categories title=""]
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `title` | "Categories" / "Categorieën" | Section heading (use `""` to hide) |

---

### Call to Action (CTA)

Displays a styled button linking to any page.

```
[cta href="/shop" text="Browse Shop"]
[cta href="/shop" text="View All" variant="outline" size="lg"]
[cta href="https://etsy.com/shop/LayoutsByLenny" text="Visit Etsy" fullwidth="true"]
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `href` | *required* | Link URL (relative or absolute) |
| `text` | *required* | Button text |
| `variant` | `default` | Button style: `default`, `outline`, `secondary` |
| `size` | `lg` | Button size: `sm`, `default`, `lg` |
| `fullwidth` | `false` | Set to `true` for full-width button |

---

### Newsletter Signup

Displays an email subscription form.

```
[newsletter]
[newsletter compact="true"]
[newsletter title="Join Our List" description="Get exclusive offers and updates"]
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `title` | "Stay Updated" / "Blijf op de hoogte" | Form heading |
| `description` | Default description | Text below heading |
| `compact` | `false` | Set to `true` for inline form without card |

> **Note:** Requires `/api/newsletter/subscribe` endpoint to be implemented.

---

## Example: Home Page

```html
<div class="text-center py-12">
  <h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-6">
    Beautiful Digital Planners for Your iPad
  </h1>
  <p class="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
    Organize your life with stunning, handcrafted digital planners.
  </p>
</div>

[featured-products qty="4"]

[categories]

<div class="text-center py-8">
  <h2 class="text-2xl font-bold mb-4">Ready to Get Organized?</h2>
  <p class="text-gray-600 mb-6">Browse our collection and find the perfect planner.</p>
  [cta href="/shop" text="Explore the Shop"]
</div>

[newsletter]
```

---

## Example: About Page with Products

```html
<h1>About Layouts by Lenny</h1>
<p>We create beautiful digital planners designed with care...</p>

<h2>Check Out Our Planners</h2>
[products category="planners" qty="3"]

[cta href="/shop/planners" text="View All Planners" variant="outline"]
```

---

## Technical Details

### Files

| File | Description |
|------|-------------|
| `src/lib/widgets.ts` | Shortcode parser |
| `src/components/widgets/WidgetRenderer.tsx` | Main renderer component |
| `src/components/widgets/FeaturedProductsWidget.tsx` | Featured products widget |
| `src/components/widgets/LatestProductsWidget.tsx` | Latest products widget |
| `src/components/widgets/ProductsByCategoryWidget.tsx` | Products by category widget |
| `src/components/widgets/CategoriesWidget.tsx` | Categories grid widget |
| `src/components/widgets/CTAWidget.tsx` | Call to action widget |
| `src/components/widgets/NewsletterWidget.tsx` | Newsletter signup widget |

### Supported Pages

The widget system is enabled on these CMS-powered pages:
- Home (`/`)
- About (`/about`)
- How to Import (`/how-to-import`)
- Terms & Conditions (`/terms`)

### Adding New Widgets

1. Create a new component in `src/components/widgets/`
2. Add the widget type to `WIDGET_TYPES` in `src/lib/widgets.ts`
3. Add a case in `renderWidget()` in `src/components/widgets/WidgetRenderer.tsx`
4. Export from `src/components/widgets/index.ts`

### Localization

Widgets automatically detect the current locale and:
- Display translated labels (English/Dutch)
- Filter products by content language
- Use locale-appropriate formatting
