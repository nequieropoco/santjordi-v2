-- CreateEnum
CREATE TYPE "SuggestionSection" AS ENUM ('FOOD', 'DESSERT', 'OTHER');

-- CreateTable
CREATE TABLE "SuggestionSheet" (
    "id" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestionSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionItem" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "section" "SuggestionSection" NOT NULL,
    "titleCa" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuggestionItem_sheetId_section_order_idx" ON "SuggestionItem"("sheetId", "section", "order");

-- AddForeignKey
ALTER TABLE "SuggestionItem" ADD CONSTRAINT "SuggestionItem_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "SuggestionSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
