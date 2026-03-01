-- CreateTable
CREATE TABLE "newslettersubscriber" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "source" VARCHAR(20) NOT NULL DEFAULT 'website',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "newslettersubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newslettersubscriber_email_key" ON "newslettersubscriber"("email");

-- CreateIndex
CREATE INDEX "newslettersubscriber_email_idx" ON "newslettersubscriber"("email");

-- CreateIndex
CREATE INDEX "newslettersubscriber_isActive_idx" ON "newslettersubscriber"("isActive");

-- CreateIndex
CREATE INDEX "newslettersubscriber_source_idx" ON "newslettersubscriber"("source");
