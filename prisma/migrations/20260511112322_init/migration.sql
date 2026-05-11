-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARTICIPANTE',
    "firstLogin" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "participanteId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participante" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "celular" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Demanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "linkForm" TEXT NOT NULL,
    "prazo" DATETIME NOT NULL,
    "horaLimite" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "celularResp" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Cumprimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participanteId" INTEGER NOT NULL,
    "demandaId" TEXT NOT NULL,
    "dataRegistro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cumprimento_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cumprimento_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_participanteId_key" ON "Usuario"("participanteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cumprimento_participanteId_demandaId_key" ON "Cumprimento"("participanteId", "demandaId");
