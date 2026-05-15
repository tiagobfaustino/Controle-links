import "dotenv/config";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "dev.db");
const db = new Database(DB_PATH);

const participantes = [
  { numCurso: 751, nome: "ALENCAR CAMPOS DA SILVA", nomeExibicao: "**ALENCAR** CAMPOS DA SILVA", celular: "(31) 98751-6138" },
  { numCurso: 752, nome: "ALEX MARTINO DA SILVA", nomeExibicao: "**ALEX MARTINO** DA SILVA", celular: "(32) 99985-5484" },
  { numCurso: 753, nome: "ALMIR DE LIMA BARBOSA", nomeExibicao: "**ALMIR** DE LIMA BARBOSA", celular: "(31) 99694-6834" },
  { numCurso: 754, nome: "BLAYTON VANINI DE MELLO", nomeExibicao: "**BLAYTON** VANINI DE MELLO", celular: "(31) 98381-8262" },
  { numCurso: 755, nome: "CAMILA ALVES COSTA", nomeExibicao: "**CAMILA** ALVES COSTA", celular: "(31) 98896-8254" },
  { numCurso: 756, nome: "CLAUDIA DE JESUS PEREIRA MEDEIROS", nomeExibicao: "**CLAUDIA** DE JESUS PEREIRA MEDEIROS", celular: "(31) 98837-6801" },
  { numCurso: 757, nome: "CRISTIANO TEIXEIRA DE AGUILAR", nomeExibicao: "CRISTIANO **TEIXEIRA DE AGUILAR**", celular: "(31) 98531-8021" },
  { numCurso: 758, nome: "DANIEL COUTINHO PEREIRA SCHIAVON", nomeExibicao: "DANIEL **COUTINHO** PEREIRA SCHIAVON", celular: "(31) 99891-6761" },
  { numCurso: 759, nome: "DAVIDSON RONAN DA SILVA TEIXEIRA", nomeExibicao: "DAVIDSON **RONAN** DA SILVA TEIXEIRA", celular: "(31) 98724-5460" },
  { numCurso: 760, nome: "DIMAS JOSE SANTOS FREITAS", nomeExibicao: "**DIMAS** JOSE SANTOS FREITAS", celular: "(31) 99322-3813" },
  { numCurso: 761, nome: "ELIMARCOS MARTINS SOBRINHO", nomeExibicao: "**ELIMARCOS** MARTINS **SOBRINHO**", celular: "(35) 99171-0577" },
  { numCurso: 762, nome: "FELLIPE AUGUSTO SOARES BARRETO", nomeExibicao: "**FELLIPE** AUGUSTO **SOARES** BARRETO", celular: "(31) 99930-2890" },
  { numCurso: 763, nome: "FRANCISCO DO NASCIMENTO", nomeExibicao: "FRANCISCO **DO NASCIMENTO**", celular: "(31) 99852-9902" },
  { numCurso: 764, nome: "GLEIDSON CANDIDO DA FONSECA", nomeExibicao: "**GLEIDSON** CANDIDO DA FONSECA", celular: "(31) 98733-1195" },
  { numCurso: 765, nome: "HENRIQUE DE CARVALHO CAMPO", nomeExibicao: "HENRIQUE DE **CARVALHO** CAMPO", celular: "(31) 99480-1026" },
  { numCurso: 766, nome: "ISABELLA OLIVEIRA BAPTISTA DE CASTRO", nomeExibicao: "**ISABELLA** OLIVEIRA BAPTISTA DE CASTRO", celular: "(31) 98475-0339" },
  { numCurso: 767, nome: "JOSE LAFAIETE DOS SANTOS ROCHA", nomeExibicao: "JOSE **LAFAIETE** DOS SANTOS ROCHA", celular: "(31) 99238-2988" },
  { numCurso: 768, nome: "LOUIS PHILIPPE PAIVA BOUCHARDET", nomeExibicao: "LOUIS PHILIPPE PAIVA **BOUCHARDET**", celular: "(31) 98663-1039" },
  { numCurso: 769, nome: "MARCIO DIONISIO MARTINS RESENDE", nomeExibicao: "**MARCIO** DIONISIO MARTINS RESENDE", celular: "(31) 92007-0814" },
  { numCurso: 770, nome: "MATTOS ALLEM OLIVEIRA FOSSE", nomeExibicao: "**MATTOS ALLEM** OLIVEIRA FOSSE", celular: "(31) 99749-1026" },
  { numCurso: 771, nome: "NEYLON VALENTE SILVA", nomeExibicao: "**NEYLON** VALENTE SILVA", celular: "(31) 98920-4147" },
  { numCurso: 772, nome: "PEDRO HENRIQUE OLIVEIRA MARIANO", nomeExibicao: "PEDRO **HENRIQUE** OLIVEIRA **MARIANO**", celular: "(31) 99796-6850" },
  { numCurso: 773, nome: "RAFAEL OLIVEIRA PERPETUO", nomeExibicao: "RAFAEL OLIVEIRA **PERPETUO**", celular: "(31) 99289-6822" },
  { numCurso: 774, nome: "RENAN ALVES FERNANDES", nomeExibicao: "RENAN ALVES FERNANDES", celular: "(31) 97338-5140" },
  { numCurso: 775, nome: "ROBSON PICHARA ARAUJO", nomeExibicao: "ROBSON PICHARA ARAUJO", celular: "(31) 98872-9228" },
  { numCurso: 776, nome: "SIRVOLEI LOPES LUIZ", nomeExibicao: "**SIRVOLEI** LOPES LUIZ", celular: "(31) 98756-3158" },
  { numCurso: 777, nome: "THAIANE HELENA QUARESMA", nomeExibicao: "**THAIANE** HELENA QUARESMA", celular: "(31) 98400-9850" },
  { numCurso: 778, nome: "TIAGO BATISTA FAUSTINO", nomeExibicao: "TIAGO BATISTA **FAUSTINO**", celular: "(31) 99668-0419" },
];

function newId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function main() {
  console.log("Seeding database:", DB_PATH);

  const senhaPadrao = bcrypt.hashSync("tpcefs2026", 12);

  // Insert participant-users (idempotent by numCurso)
  const upsertUsuario = db.prepare(
    `INSERT INTO Usuario (id, email, senhaHash, nome, nomeExibicao, celular, numCurso, role, firstLogin, ativo, criadoEm)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PARTICIPANTE', 1, 1, datetime('now'))
     ON CONFLICT(numCurso) DO UPDATE SET
       nome = excluded.nome,
       nomeExibicao = excluded.nomeExibicao,
       celular = excluded.celular`
  );

  const tx = db.transaction(() => {
    for (const p of participantes) {
      upsertUsuario.run(
        newId(),
        `p${p.numCurso}@tpcefs.local`,
        senhaPadrao,
        p.nome,
        p.nomeExibicao,
        p.celular,
        p.numCurso
      );
    }
  });
  tx();
  console.log(`✓ ${participantes.length} usuários (participantes) inseridos/atualizados`);

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@tpcefs.com";
  db.prepare(
    `INSERT OR IGNORE INTO Usuario (id, email, senhaHash, nome, role, firstLogin, ativo, criadoEm)
     VALUES (?, ?, ?, ?, 'ADMIN', 1, 1, datetime('now'))`
  ).run(newId(), adminEmail, senhaPadrao, "Administrador");

  console.log(`✓ Admin garantido: ${adminEmail}`);
  db.close();
}

main();
