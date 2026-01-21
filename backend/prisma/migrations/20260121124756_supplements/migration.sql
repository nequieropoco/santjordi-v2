-- CreateTable
CREATE TABLE "SupplementGroup" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SupplementGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SupplementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementItemAllergen" (
    "supplementItemId" TEXT NOT NULL,
    "allergenId" TEXT NOT NULL,

    CONSTRAINT "SupplementItemAllergen_pkey" PRIMARY KEY ("supplementItemId","allergenId")
);

-- CreateIndex
CREATE INDEX "SupplementItem_groupId_idx" ON "SupplementItem"("groupId");

-- CreateIndex
CREATE INDEX "SupplementItemAllergen_allergenId_idx" ON "SupplementItemAllergen"("allergenId");

-- AddForeignKey
ALTER TABLE "SupplementItem" ADD CONSTRAINT "SupplementItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SupplementGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementItemAllergen" ADD CONSTRAINT "SupplementItemAllergen_supplementItemId_fkey" FOREIGN KEY ("supplementItemId") REFERENCES "SupplementItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementItemAllergen" ADD CONSTRAINT "SupplementItemAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
