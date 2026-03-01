# Banner Naming Convention

Banners support automatic variants for language and dark mode using a file naming convention.

## Setup

In the admin panel, set just the **base banner URL** (e.g., `/api/uploads/banners/homepage-banner.jpg`).

The system automatically loads variants based on file suffixes.

## Naming Pattern

Given a base file `homepage-banner.jpg`, upload variants with these suffixes:

| Variant | Filename |
|---------|----------|
| Base (light, English) | `homepage-banner.jpg` |
| Dark mode | `homepage-banner-dark.jpg` |
| Dutch | `homepage-banner-nl.jpg` |
| Dutch dark | `homepage-banner-nl-dark.jpg` |

## Fallback Chain

The system tries variants in this order:

1. `{base}-{lang}-dark.{ext}` - Language + dark mode
2. `{base}-{lang}.{ext}` - Language only
3. `{base}-dark.{ext}` - Dark mode (default language)
4. `{base}.{ext}` - Base file

If a variant doesn't exist, it falls back to the base file.

## Language Codes

- `en` - English (default, no suffix needed)
- `nl` - Dutch
- `de` - German
- `fr` - French
- `es` - Spanish
- `it` - Italian

## Example

For a Dutch user in dark mode viewing `/api/uploads/banners/homepage-banner.jpg`:

1. Tries: `homepage-banner-nl-dark.jpg`
2. Falls back to: `homepage-banner.jpg`

## Upload Location

Upload banners to S3 at: `uploads/banners/`

They're served via: `/api/uploads/banners/{filename}`
