-- AlterTable
ALTER TABLE "configuracoes_agenda" ADD COLUMN     "agenda_dia_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "agenda_dia_email_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "agenda_dia_enviado_em" TEXT,
ADD COLUMN     "agenda_dia_horario" TEXT NOT NULL DEFAULT '07:00';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "smtp_from" TEXT,
ADD COLUMN     "smtp_host" TEXT,
ADD COLUMN     "smtp_pass" TEXT,
ADD COLUMN     "smtp_port" INTEGER,
ADD COLUMN     "smtp_user" TEXT;
