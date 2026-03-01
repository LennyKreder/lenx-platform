import { prisma } from '@/lib/prisma';

const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'fr', 'es', 'it'];

interface TranslationResult {
  translatedText: string;
  detected_source_language?: string;
}

async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<TranslationResult> {
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    // No API key - return original text
    return { translatedText: text, detected_source_language: sourceLang };
  }

  try {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang.toUpperCase(),
        ...(sourceLang && { source_lang: sourceLang.toUpperCase() }),
      }),
    });

    if (!response.ok) {
      console.error('DeepL API error:', response.status);
      return { translatedText: text, detected_source_language: sourceLang };
    }

    const data = await response.json();
    const translation = data.translations?.[0];

    return {
      translatedText: translation?.text || text,
      detected_source_language: translation?.detected_source_language?.toLowerCase() || sourceLang,
    };
  } catch (error) {
    console.error('Translation error:', error);
    return { translatedText: text, detected_source_language: sourceLang };
  }
}

/**
 * Translate a review to all supported languages and store the translations.
 * Call this when a review is created or when its text is updated.
 */
export async function translateReview(reviewId: number): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { reviewText: true, language: true },
  });

  if (!review) {
    console.error(`Review ${reviewId} not found`);
    return;
  }

  const sourceLanguage = review.language || 'en';
  const targetLanguages = SUPPORTED_LOCALES.filter((lang) => lang !== sourceLanguage);

  // Delete existing translations (in case of re-translation)
  await prisma.reviewTranslation.deleteMany({
    where: { reviewId },
  });

  // Translate to each target language
  const translations: { languageCode: string; reviewText: string }[] = [];

  for (const targetLang of targetLanguages) {
    const result = await translateText(review.reviewText, targetLang, sourceLanguage);

    // Only store if translation is different from original
    if (result.translatedText !== review.reviewText) {
      translations.push({
        languageCode: targetLang,
        reviewText: result.translatedText,
      });
    }
  }

  // Batch create translations
  if (translations.length > 0) {
    await prisma.reviewTranslation.createMany({
      data: translations.map((t) => ({
        reviewId,
        languageCode: t.languageCode,
        reviewText: t.reviewText,
      })),
    });
  }

  console.log(`Translated review ${reviewId} to ${translations.length} languages`);
}

/**
 * Translate all approved reviews that don't have translations yet.
 * Useful for backfilling existing reviews.
 */
export async function translateAllPendingReviews(): Promise<number> {
  const reviews = await prisma.review.findMany({
    where: {
      approved: true,
      translations: { none: {} },
    },
    select: { id: true },
  });

  let translated = 0;
  for (const review of reviews) {
    try {
      await translateReview(review.id);
      translated++;
    } catch (error) {
      console.error(`Failed to translate review ${review.id}:`, error);
    }
  }

  return translated;
}
