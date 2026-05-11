import "dotenv/config";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "dev.db");
const db = new Database(DB_PATH);

const participantes = [
  { id: 751, nome: "ALENCAR CAMPOS DA SILVA", celular: "(31) 98751-6138" },
  { id: 752, nome: "ALEX MARTINO DA SILVA", celular: "(32) 99985-5484" },
  { id: 753, nome: "ALMIR DE LIMA BARBOSA", celular: "(31) 99694-6834" },
  { id: 754, nome: "BLAYTON VANINI DE MELLO", celular: "(31) 98381-8262" },
  { id: 755, nome: "CAMILA ALVES COSTA", celular: "(31) 98896-8254" },
  { id: 756, nome: "CLAUDIA DE JESUS PEREIRA MEDEIROS", celular: "(31) 98837-6801" },
  { id: 757, nome: "CRISTIANO TEIXEIRA DE AGUILAR", celular: "(31) 98531-8021" },
  { id: 758, nome: "DANIEL COUTINHO PEREIRA SCHIAVON", celular: "(31) 99891-6761" },
  { id: 759, nome: "DAVIDSON RONAN DA SILVA TEIXEIRA", celular: "(31) 98724-5460" },
  { id: 760, nome: "DIMAS JOSE SANTOS FREITAS", celular: "(31) 99322-3813" },
  { id: 761, nome: "ELIMARCOS MARTINS SOBRINHO", celular: "(35) 99171-0577" },
  { id: 762, nome: "FELLIPE AUGUSTO SOARES BARRETO", celular: "(31) 99930-2890" },
  { id: 763, nome: "FRANCISCO DO NASCIMENTO", celular: "(31) 99852-9902" },
  { id: 764, nome: "GLEIDSON CANDIDO DA FONSECA", celular: "(31) 98733-1195" },
  { id: 765, nome: "HENRIQUE DE CARVALHO CAMPO", celular: "(31) 99480-1026" },
  { id: 766, nome: "ISABELLA OLIVEIRA BAPTISTA DE CASTRO", celular: "(31) 98475-0339" },
  { id: 767, nome: "JOSE LAFAIETE DOS SANTOS ROCHA", celular: "(31) 99238-2988" },
  { id: 768, nome: "LOUIS PHILIPPE PAIVA BOUCHARDET", celular: "(31) 98663-1039" },
  { id: 769, nome: "MARCIO DIONISIO MARTINS RESENDE", celular: "(31) 92007-0814" },
  { id: 770, nome: "MATTOS ALLEM OLIVEIRA FOSSE", celular: "(31) 99749-1026" },
  { id: 771, nome: "NEYLON VALENTE SILVA", celular: "(31) 98920-4147" },
  { id: 772, nome: "PEDRO HENRIQUE OLIVEIRA MARIANO", celular: "(31) 99796-6850" },
  { id: 773, nome: "RAFAEL OLIVEIRA PERPETUO", celular: "(31) 99289-6822" },
  { id: 774, nome: "RENAN ALVES FERNANDES", celular: "(31) 97338-5140" },
  { id: 775, nome: "ROBSON PICHARA ARAUJO", celular: "(31) 98872-9228" },
  { id: 776, nome: "SIRVOLEI LOPES LUIZ", celular: "(31) 98756-3158" },
  { id: 777, nome: "THAIANE HELENA QUARESMA", celular: "(31) 98400-9850" },
  { id: 778, nome: "TIAGO BATISTA FAUSTINO", celular: "(31) 99668-0419" },
];

function main() {
  console.log("Seeding database:", DB_PATH);

  const insertParticipante = db.prepare(
    "INSERT OR IGNORE INTO Participante (id, nome, celular) VALUES (?, ?, ?)"
  );
  const seedParticipantes = db.transaction(() => {
    for (const p of participantes) {
      insertParticipante.run(p.id, p.nome, p.celular);
    }
  });
  seedParticipantes();
  console.log(`✓ ${participantes.length} participantes inseridos`);

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@tpcefs.com";
  const senhaHash = bcrypt.hashSync("tpcefs2026", 12);
  const cuid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

  db.prepare(
    `INSERT OR IGNORE INTO Usuario (id, email, senhaHash, nome, role, firstLogin, ativo, criadoEm)
     VALUES (?, ?, ?, ?, ?, 1, 1, datetime('now'))`
  ).run(cuid, adminEmail, senhaHash, "Administrador", "ADMIN");

  console.log(`✓ Admin criado: ${adminEmail}`);
  db.close();
}

main();
