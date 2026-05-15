-- Unify Participante into Usuario.
-- Every Participante becomes a Usuario (created if missing).
-- Cumprimento and Demanda are rebuilt to reference Usuario.id (TEXT cuid).

PRAGMA foreign_keys = OFF;

-- 1. Add new columns to Usuario
ALTER TABLE "Usuario" ADD COLUMN "nomeExibicao" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "celular" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "numCurso" INTEGER;

-- 2. For Usuarios that already point to a Participante, copy data over
UPDATE "Usuario"
SET "nomeExibicao" = (SELECT "nomeExibicao" FROM "Participante" WHERE "id" = "Usuario"."participanteId"),
    "celular"      = (SELECT "celular" FROM "Participante" WHERE "id" = "Usuario"."participanteId"),
    "numCurso"     = "participanteId"
WHERE "participanteId" IS NOT NULL;

-- 3. Create a Usuario for every Participante that does not yet have one.
-- Default password is "tpcefs2026" (bcrypt 12 rounds). firstLogin = 1.
INSERT INTO "Usuario" (
  "id", "email", "senhaHash", "nome", "nomeExibicao", "celular", "numCurso",
  "role", "firstLogin", "ativo", "criadoEm"
)
SELECT
  'c' || lower(hex(randomblob(12))) || p."id",
  'p' || p."id" || '@tpcefs.local',
  '$2b$12$cV3P1pM8efsBLk5bJp28fedCJyFayETnE4Vs3uvU2p/BHVmPZsJPG',
  p."nome",
  p."nomeExibicao",
  p."celular",
  p."id",
  'PARTICIPANTE',
  1,
  1,
  CURRENT_TIMESTAMP
FROM "Participante" p
WHERE NOT EXISTS (SELECT 1 FROM "Usuario" u WHERE u."participanteId" = p."id");

-- 4. Rebuild Cumprimento: participanteId (INTEGER) -> usuarioId (TEXT)
CREATE TABLE "Cumprimento_new" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "usuarioId"    TEXT NOT NULL,
  "demandaId"    TEXT NOT NULL,
  "dataRegistro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Cumprimento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Cumprimento_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "Cumprimento_new" ("id", "usuarioId", "demandaId", "dataRegistro")
SELECT c."id", u."id", c."demandaId", c."dataRegistro"
FROM "Cumprimento" c
JOIN "Usuario" u ON u."numCurso" = c."participanteId";

DROP TABLE "Cumprimento";
ALTER TABLE "Cumprimento_new" RENAME TO "Cumprimento";
CREATE UNIQUE INDEX "Cumprimento_usuarioId_demandaId_key" ON "Cumprimento"("usuarioId", "demandaId");

-- 5. Rebuild Demanda: responsavel (TEXT) + celularResp (TEXT) -> responsavelId (TEXT FK)
-- Existing demandas get the oldest ADMIN as the responsavel (admin fixes later via UI).
CREATE TABLE "Demanda_new" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "titulo"        TEXT NOT NULL,
  "linkForm"      TEXT NOT NULL,
  "prazo"         DATETIME NOT NULL,
  "horaLimite"    TEXT NOT NULL,
  "responsavelId" TEXT NOT NULL,
  "ativa"         BOOLEAN NOT NULL DEFAULT true,
  "criadaEm"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Demanda_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "Demanda_new" ("id", "titulo", "linkForm", "prazo", "horaLimite", "responsavelId", "ativa", "criadaEm")
SELECT
  d."id", d."titulo", d."linkForm", d."prazo", d."horaLimite",
  (SELECT "id" FROM "Usuario" WHERE "role" = 'ADMIN' ORDER BY "criadoEm" LIMIT 1),
  d."ativa", d."criadaEm"
FROM "Demanda" d;

DROP TABLE "Demanda";
ALTER TABLE "Demanda_new" RENAME TO "Demanda";

-- 6. Drop participanteId column from Usuario (rebuild table)
CREATE TABLE "Usuario_new" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "email"        TEXT NOT NULL,
  "senhaHash"    TEXT NOT NULL,
  "nome"         TEXT NOT NULL,
  "nomeExibicao" TEXT,
  "celular"      TEXT,
  "numCurso"     INTEGER,
  "role"         TEXT NOT NULL DEFAULT 'PARTICIPANTE',
  "firstLogin"   BOOLEAN NOT NULL DEFAULT true,
  "ativo"        BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "Usuario_new"
  ("id", "email", "senhaHash", "nome", "nomeExibicao", "celular", "numCurso",
   "role", "firstLogin", "ativo", "criadoEm")
SELECT
  "id", "email", "senhaHash", "nome", "nomeExibicao", "celular", "numCurso",
  "role", "firstLogin", "ativo", "criadoEm"
FROM "Usuario";

DROP TABLE "Usuario";
ALTER TABLE "Usuario_new" RENAME TO "Usuario";

CREATE UNIQUE INDEX "Usuario_email_key"    ON "Usuario"("email");
CREATE UNIQUE INDEX "Usuario_numCurso_key" ON "Usuario"("numCurso");

-- 7. Drop Participante
DROP TABLE "Participante";

PRAGMA foreign_keys = ON;
