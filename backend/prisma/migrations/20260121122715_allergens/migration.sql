-- CreateTable
CREATE TABLE "Allergen" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" JSONB NOT NULL,

    CONSTRAINT "Allergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAllergen" (
    "itemId" TEXT NOT NULL,
    "allergenId" TEXT NOT NULL,

    CONSTRAINT "ItemAllergen_pkey" PRIMARY KEY ("itemId","allergenId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Allergen_code_key" ON "Allergen"("code");

-- CreateIndex
CREATE INDEX "ItemAllergen_allergenId_idx" ON "ItemAllergen"("allergenId");

-- AddForeignKey
ALTER TABLE "ItemAllergen" ADD CONSTRAINT "ItemAllergen_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAllergen" ADD CONSTRAINT "ItemAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
