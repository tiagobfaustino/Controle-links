/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // -------------------------------------------------------------------------
  // A) Extend the built-in `users` collection
  // -------------------------------------------------------------------------
  const usersCollection = app.findCollectionByNameOrId("users");

  usersCollection.fields.add(new SelectField({
    name: "role",
    required: true,
    maxSelect: 1,
    values: ["ADMIN", "GESTOR", "PARTICIPANTE"],
  }));

  usersCollection.fields.add(new BoolField({
    name: "firstLogin",
    required: false,
  }));

  // participante relation added after participantes collection is created
  app.save(usersCollection);

  // -------------------------------------------------------------------------
  // B) Create `participantes` collection
  // -------------------------------------------------------------------------
  const participantes = new Collection({
    name: "participantes",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = \"ADMIN\"",
    updateRule: "@request.auth.role = \"ADMIN\"",
    deleteRule: null,
    fields: [
      new NumberField({
        name: "numeroCurso",
        required: true,
      }),
      new TextField({
        name: "nome",
        required: true,
      }),
      new TextField({
        name: "celular",
        required: true,
      }),
    ],
  });

  app.save(participantes);

  // -------------------------------------------------------------------------
  // A cont.) Add `participante` relation field to users now that participantes exists
  // -------------------------------------------------------------------------
  const usersCollection2 = app.findCollectionByNameOrId("users");

  usersCollection2.fields.add(new RelationField({
    name: "participante",
    required: false,
    maxSelect: 1,
    collectionId: participantes.id,
  }));

  app.save(usersCollection2);

  // -------------------------------------------------------------------------
  // C) Create `demandas` collection
  // -------------------------------------------------------------------------
  const demandas = new Collection({
    name: "demandas",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = \"ADMIN\" || @request.auth.role = \"GESTOR\"",
    updateRule: "@request.auth.role = \"ADMIN\" || @request.auth.role = \"GESTOR\"",
    deleteRule: "@request.auth.role = \"ADMIN\"",
    fields: [
      new TextField({
        name: "titulo",
        required: true,
      }),
      new URLField({
        name: "linkForm",
        required: true,
      }),
      new DateField({
        name: "prazo",
        required: true,
      }),
      new TextField({
        name: "horaLimite",
        required: true,
      }),
      new TextField({
        name: "responsavel",
        required: true,
      }),
      new TextField({
        name: "celularResp",
        required: true,
      }),
      new BoolField({
        name: "ativa",
        required: false,
      }),
    ],
  });

  app.save(demandas);

  // -------------------------------------------------------------------------
  // D) Create `cumprimento` collection
  // -------------------------------------------------------------------------
  const cumprimento = new Collection({
    name: "cumprimento",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role != \"\"",
    updateRule: null,
    deleteRule: "@request.auth.role != \"\"",
    fields: [
      new RelationField({
        name: "participante",
        required: true,
        maxSelect: 1,
        collectionId: participantes.id,
      }),
      new RelationField({
        name: "demanda",
        required: true,
        maxSelect: 1,
        collectionId: demandas.id,
      }),
      new DateField({
        name: "dataRegistro",
        required: false,
      }),
    ],
  });

  app.save(cumprimento);

  // -------------------------------------------------------------------------
  // F) Seed the 28 participants
  // -------------------------------------------------------------------------
  const participantesData = [
    { numeroCurso: 751, nome: "ALENCAR CAMPOS DA SILVA",                celular: "(31) 98751-6138" },
    { numeroCurso: 752, nome: "ALEX MARTINO DA SILVA",                  celular: "(32) 99985-5484" },
    { numeroCurso: 753, nome: "ALMIR DE LIMA BARBOSA",                  celular: "(31) 99694-6834" },
    { numeroCurso: 754, nome: "BLAYTON VANINI DE MELLO",                celular: "(31) 98381-8262" },
    { numeroCurso: 755, nome: "CAMILA ALVES COSTA",                     celular: "(31) 98896-8254" },
    { numeroCurso: 756, nome: "CLAUDIA DE JESUS PEREIRA MEDEIROS",      celular: "(31) 98837-6801" },
    { numeroCurso: 757, nome: "CRISTIANO TEIXEIRA DE AGUILAR",          celular: "(31) 98531-8021" },
    { numeroCurso: 758, nome: "DANIEL COUTINHO PEREIRA SCHIAVON",       celular: "(31) 99891-6761" },
    { numeroCurso: 759, nome: "DAVIDSON RONAN DA SILVA TEIXEIRA",       celular: "(31) 98724-5460" },
    { numeroCurso: 760, nome: "DIMAS JOSE SANTOS FREITAS",              celular: "(31) 99322-3813" },
    { numeroCurso: 761, nome: "ELIMARCOS MARTINS SOBRINHO",             celular: "(35) 99171-0577" },
    { numeroCurso: 762, nome: "FELLIPE AUGUSTO SOARES BARRETO",         celular: "(31) 99930-2890" },
    { numeroCurso: 763, nome: "FRANCISCO DO NASCIMENTO",                celular: "(31) 99852-9902" },
    { numeroCurso: 764, nome: "GLEIDSON CANDIDO DA FONSECA",            celular: "(31) 98733-1195" },
    { numeroCurso: 765, nome: "HENRIQUE DE CARVALHO CAMPO",             celular: "(31) 99480-1026" },
    { numeroCurso: 766, nome: "ISABELLA OLIVEIRA BAPTISTA DE CASTRO",   celular: "(31) 98475-0339" },
    { numeroCurso: 767, nome: "JOSE LAFAIETE DOS SANTOS ROCHA",         celular: "(31) 99238-2988" },
    { numeroCurso: 768, nome: "LOUIS PHILIPPE PAIVA BOUCHARDET",        celular: "(31) 98663-1039" },
    { numeroCurso: 769, nome: "MARCIO DIONISIO MARTINS RESENDE",        celular: "(31) 92007-0814" },
    { numeroCurso: 770, nome: "MATTOS ALLEM OLIVEIRA FOSSE",            celular: "(31) 99749-1026" },
    { numeroCurso: 771, nome: "NEYLON VALENTE SILVA",                   celular: "(31) 98920-4147" },
    { numeroCurso: 772, nome: "PEDRO HENRIQUE OLIVEIRA MARIANO",        celular: "(31) 99796-6850" },
    { numeroCurso: 773, nome: "RAFAEL OLIVEIRA PERPETUO",               celular: "(31) 99289-6822" },
    { numeroCurso: 774, nome: "RENAN ALVES FERNANDES",                  celular: "(31) 97338-5140" },
    { numeroCurso: 775, nome: "ROBSON PICHARA ARAUJO",                  celular: "(31) 98872-9228" },
    { numeroCurso: 776, nome: "SIRVOLEI LOPES LUIZ",                    celular: "(31) 98756-3158" },
    { numeroCurso: 777, nome: "THAIANE HELENA QUARESMA",                celular: "(31) 98400-9850" },
    { numeroCurso: 778, nome: "TIAGO BATISTA FAUSTINO",                 celular: "(31) 99668-0419" },
  ];

  try {
    const participantesCollection = app.findCollectionByNameOrId("participantes");
    for (const data of participantesData) {
      const record = new Record(participantesCollection);
      record.set("numeroCurso", data.numeroCurso);
      record.set("nome", data.nome);
      record.set("celular", data.celular);
      app.save(record);
    }
  } catch (e) {
    console.log("Participants seed skipped (may already exist):", e);
  }

  // -------------------------------------------------------------------------
  // G) Create the ADMIN superuser
  // -------------------------------------------------------------------------
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@tpcefs.com";
    const usersCol = app.findCollectionByNameOrId("users");
    const admin = new Record(usersCol);
    admin.set("email", adminEmail);
    admin.setPassword("tpcefs2026");
    admin.set("role", "ADMIN");
    admin.set("firstLogin", true);
    admin.set("verified", true);
    app.save(admin);
  } catch (e) {
    console.log("Admin user seed skipped (may already exist):", e);
  }

}, (app) => {
  // Down migration – remove everything created above

  try {
    const cumprimento = app.findCollectionByNameOrId("cumprimento");
    app.delete(cumprimento);
  } catch (_) {}

  try {
    const demandas = app.findCollectionByNameOrId("demandas");
    app.delete(demandas);
  } catch (_) {}

  try {
    const participantes = app.findCollectionByNameOrId("participantes");
    app.delete(participantes);
  } catch (_) {}

  // Remove extra fields from users
  try {
    const users = app.findCollectionByNameOrId("users");
    for (const name of ["role", "firstLogin", "participante"]) {
      const field = users.fields.getByName(name);
      if (field) users.fields.remove(field);
    }
    app.save(users);
  } catch (_) {}
});
