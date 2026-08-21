CREATE TYPE "TermsStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "TermsDocument" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "TermsStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TermsDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TermsDocument_version_key" ON "TermsDocument"("version");
CREATE INDEX "TermsDocument_status_effectiveFrom_idx" ON "TermsDocument"("status", "effectiveFrom");
