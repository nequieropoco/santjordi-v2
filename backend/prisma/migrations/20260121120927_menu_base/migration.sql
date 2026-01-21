-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_departmentId_idx" ON "Item"("departmentId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
