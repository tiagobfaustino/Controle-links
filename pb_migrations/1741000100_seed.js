/// <reference path="../pb_data/types.d.ts" />

// Seed inicial: usuário ADMIN + 28 alunos do curso (todos como GESTOR).
// Senha provisória padrão: tpcefs2026 (firstLogin=true força troca no 1º acesso).

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("users");

  const participantes = [
    { numeroCurso: 751, name: "ALENCAR CAMPOS DA SILVA",              nomeFuncional: "ALENCAR",            numPM: 1596030, email: "juninho.mg@live.com",            celular: "(31) 98751-6138" },
    { numeroCurso: 752, name: "ALEX MARTINO DA SILVA",                nomeFuncional: "ALEX MARTINO",       numPM: 1546910, email: "alexsilvams@outlook.com",        celular: "(32) 99985-5484" },
    { numeroCurso: 753, name: "ALMIR DE LIMA BARBOSA",                nomeFuncional: "ALMIR",              numPM: 1583699, email: "almirdelimabarbosa@gmail.com",   celular: "(31) 99694-6834" },
    { numeroCurso: 754, name: "BLAYTON VANINI DE MELLO",              nomeFuncional: "BLAYTON",            numPM: 1584770, email: "blayton.vanini@gmail.com",       celular: "(31) 98381-8262" },
    { numeroCurso: 755, name: "CAMILA ALVES COSTA",                   nomeFuncional: "CAMILA",             numPM: 1596253, email: "milinha_alves03@yahoo.com.br",   celular: "(31) 98896-8254" },
    { numeroCurso: 756, name: "CLAUDIA DE JESUS PEREIRA MEDEIROS",    nomeFuncional: "CLAUDIA",            numPM: 1598861, email: "claudiajpenf@yahoo.com.br",      celular: "(31) 98837-6801" },
    { numeroCurso: 757, name: "CRISTIANO TEIXEIRA DE AGUILAR",        nomeFuncional: "TEIXEIRA AGUILAR",   numPM: 1583632, email: "cristianocj@gmail.com",          celular: "(31) 98531-8021" },
    { numeroCurso: 758, name: "DANIEL COUTINHO PEREIRA SCHIAVON",     nomeFuncional: "COUTINHO",           numPM: 1594845, email: "pc.danielschin@gmail.com",       celular: "(31) 99891-6761" },
    { numeroCurso: 759, name: "DAVIDSON RONAN DA SILVA TEIXEIRA",     nomeFuncional: "RONAN",              numPM: 1571348, email: "davidsonronan@gmail.com",        celular: "(31) 98724-5460" },
    { numeroCurso: 760, name: "DIMAS JOSE SANTOS FREITAS",            nomeFuncional: "DIMAS",              numPM: 1568328, email: "dimasminza@hotmail.com",         celular: "(31) 99322-3813" },
    { numeroCurso: 761, name: "ELIMARCOS MARTINS SOBRINHO",           nomeFuncional: "SOBRINHO",           numPM: 1599760, email: "elimarcosms@gmail.com",          celular: "(35) 99171-0577" },
    { numeroCurso: 762, name: "FELLIPE AUGUSTO SOARES BARRETO",       nomeFuncional: "FELLIPE SOARES",     numPM: 1586320, email: "knight.fellipe@gmail.com",       celular: "(31) 99930-2890" },
    { numeroCurso: 763, name: "FRANCISCO DO NASCIMENTO",              nomeFuncional: "DO NASCIMENTO",      numPM: 1592914, email: "fnascimento731@yahoo.com.br",    celular: "(31) 99852-9902" },
    { numeroCurso: 764, name: "GLEIDSON CANDIDO DA FONSECA",          nomeFuncional: "GLEIDSON",           numPM: 1586932, email: "gleidsoncandidof@gmail.com",     celular: "(31) 98733-1195" },
    { numeroCurso: 765, name: "HENRIQUE DE CARVALHO CAMPO",           nomeFuncional: "CARVALHO",           numPM: 1569375, email: "iquecampos@outlook.com",         celular: "(31) 99480-1026" },
    { numeroCurso: 766, name: "ISABELLA OLIVEIRA BAPTISTA DE CASTRO", nomeFuncional: "ISABELLA",           numPM: 1587088, email: "baptistaisabella@gmail.com",     celular: "(31) 98475-0339" },
    { numeroCurso: 767, name: "JOSE LAFAIETE DOS SANTOS ROCHA",       nomeFuncional: "LAFAIETE",           numPM: 1592047, email: "zelafaiete@hotmail.com",         celular: "(31) 99238-2988" },
    { numeroCurso: 768, name: "LOUIS PHILIPPE PAIVA BOUCHARDET",      nomeFuncional: "BOUCHARDET",         numPM: 1587138, email: "louisbouchardet@yahoo.com.br",   celular: "(31) 98663-1039" },
    { numeroCurso: 769, name: "MARCIO DIONISIO MARTINS RESENDE",      nomeFuncional: "MARCIO",             numPM: 1576651, email: "marciodionisio25tm@gmail.com",   celular: "(31) 92007-0814" },
    { numeroCurso: 770, name: "MATTOS ALLEM OLIVEIRA FOSSE",          nomeFuncional: "MATTOS ALLEM",       numPM: 1580422, email: "mattosallem@gmail.com",          celular: "(31) 99749-1026" },
    { numeroCurso: 771, name: "NEYLON VALENTE SILVA",                 nomeFuncional: "NEYLON",             numPM: 1589977, email: "neylonvalente@outlook.com",      celular: "(31) 98920-4147" },
    { numeroCurso: 772, name: "PEDRO HENRIQUE OLIVEIRA MARIANO",      nomeFuncional: "PEDRO MARIANO",      numPM: 1588854, email: "pedroh-mariano@hotmail.com",     celular: "(31) 99796-6850" },
    { numeroCurso: 773, name: "RAFAEL OLIVEIRA PERPETUO",             nomeFuncional: "PERPETUO",           numPM: 1590058, email: "rafachuferpetuo@gmail.com",      celular: "(31) 99289-6822" },
    { numeroCurso: 774, name: "RENAN ALVES FERNANDES",                nomeFuncional: "RENAN",              numPM: 1538198, email: "renanalves4042@gmail.com",       celular: "(31) 97338-5140" },
    { numeroCurso: 775, name: "ROBSON PICHARA ARAUJO",                nomeFuncional: "ROBSON PICHARA",     numPM: 1587722, email: "robson20226cjc@gmail.com",       celular: "(31) 98872-9228" },
    { numeroCurso: 776, name: "SIRVOLEI LOPES LUIZ",                  nomeFuncional: "SIRVOLEI",           numPM: 1579671, email: "sl128pmmg@gmail.com",            celular: "(31) 98756-3158" },
    { numeroCurso: 777, name: "THAIANE HELENA QUARESMA",              nomeFuncional: "THAIANE",            numPM: 1572320, email: "thayhelenaq@gmail.com",          celular: "(31) 98400-9850" },
    { numeroCurso: 778, name: "TIAGO BATISTA FAUSTINO",               nomeFuncional: "FAUSTINO",           numPM: 1589365, email: "tiagobfaustino@gmail.com",       celular: "(31) 99668-0419" },
  ];

  for (const p of participantes) {
    try {
      const u = new Record(usersCol);
      u.set("email", p.email);
      u.setPassword("tpcefs2026");
      u.set("name", p.name);
      u.set("nomeFuncional", p.nomeFuncional);
      u.set("celular", p.celular);
      u.set("numeroCurso", p.numeroCurso);
      u.set("numPM", p.numPM);
      u.set("role", "GESTOR");
      u.set("firstLogin", true);
      u.set("verified", true);
      app.save(u);
    } catch (e) {
      console.log(`Seed pulou usuário ${p.numeroCurso}:`, e);
    }
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@tpcefs.com";
    const admin = new Record(usersCol);
    admin.set("email", adminEmail);
    admin.setPassword("tpcefs2026");
    admin.set("name", "Administrador");
    admin.set("role", "ADMIN");
    admin.set("firstLogin", true);
    admin.set("verified", true);
    app.save(admin);
  } catch (e) {
    console.log("Admin seed pulou:", e);
  }

}, (app) => {
  try {
    const records = app.findRecordsByFilter(
      "users",
      "email = 'admin@tpcefs.com' || (numeroCurso >= 751 && numeroCurso <= 778)",
      "",
      1000,
      0
    );
    for (const r of records) {
      try { app.delete(r); } catch (_) {}
    }
  } catch (_) {}
});
