-- AlterTable: add disparo_ciclo and respondeu_wa to leads
ALTER TABLE "leads" ADD COLUMN "disparo_ciclo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN "respondeu_wa" BOOLEAN NOT NULL DEFAULT false;
