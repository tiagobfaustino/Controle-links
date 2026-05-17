/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // -------------------------------------------------------------------------
  // A) Extend the built-in `users` collection
  //    Campos adicionais:
  //      role           - ADMIN | GESTOR
  //      firstLogin     - força troca de senha provisória no 1º acesso
  //      celular        - usado pelo dashboard p/ gerar link de WhatsApp
  //      numeroCurso    - nº do curso (ex.: 751..778), UNIQUE quando preenchido
  //      numPM          - nº de PM (matrícula militar), UNIQUE quando preenchido
  //      nomeFuncional  - parte do nome a destacar em negrito no dashboard
  //                       (ex.: nome="ALEX MARTINO DA SILVA" + nomeFuncional="ALEX MARTINO"
  //                        renderiza "**ALEX MARTINO** DA SILVA")
  // -------------------------------------------------------------------------
  const usersCollection = app.findCollectionByNameOrId("users");

  usersCollection.fields.add(new Field({
    name: "role",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["ADMIN", "GESTOR"],
  }));

  usersCollection.fields.add(new Field({
    name: "firstLogin",
    type: "bool",
  }));

  usersCollection.fields.add(new Field({
    name: "celular",
    type: "text",
  }));

  usersCollection.fields.add(new Field({
    name: "numeroCurso",
    type: "number",
  }));

  usersCollection.fields.add(new Field({
    name: "numPM",
    type: "number",
  }));

  usersCollection.fields.add(new Field({
    name: "nomeFuncional",
    type: "text",
  }));

  usersCollection.listRule = "@request.auth.id != ''";
  usersCollection.viewRule = "@request.auth.id != ''";
  usersCollection.manageRule = "id = @request.auth.id || @request.auth.role = \"ADMIN\"";

  app.save(usersCollection);

  usersCollection.indexes.push(
    "CREATE UNIQUE INDEX `idx_users_numeroCurso` ON `users` (`numeroCurso`) WHERE `numeroCurso` IS NOT NULL AND `numeroCurso` != 0"
  );
  usersCollection.indexes.push(
    "CREATE UNIQUE INDEX `idx_users_numPM` ON `users` (`numPM`) WHERE `numPM` IS NOT NULL AND `numPM` != 0"
  );
  app.save(usersCollection);

  // -------------------------------------------------------------------------
  // B) Create `demandas` collection
  // -------------------------------------------------------------------------
  const demandas = new Collection({ type: "base", name: "demandas" });
  app.save(demandas);

  demandas.listRule = "@request.auth.id != ''";
  demandas.viewRule = "@request.auth.id != ''";
  demandas.createRule = "@request.auth.id != ''";
  demandas.updateRule = "@request.auth.role = \"ADMIN\" || responsavel = @request.auth.nomeFuncional || responsavel = @request.auth.name";
  demandas.deleteRule = "@request.auth.role = \"ADMIN\" || responsavel = @request.auth.nomeFuncional || responsavel = @request.auth.name";

  demandas.fields.add(new Field({ name: "titulo", type: "text", required: true }));
  demandas.fields.add(new Field({ name: "linkForm", type: "url", required: true }));
  demandas.fields.add(new Field({ name: "prazo", type: "date", required: true }));
  demandas.fields.add(new Field({ name: "horaLimite", type: "text", required: true }));
  demandas.fields.add(new Field({ name: "responsavel", type: "text", required: true }));
  demandas.fields.add(new Field({ name: "celularResp", type: "text", required: true }));
  demandas.fields.add(new Field({ name: "ativa", type: "bool" }));

  app.save(demandas);

  // -------------------------------------------------------------------------
  // C) Create `cumprimento` collection (user × demanda, UNIQUE)
  // -------------------------------------------------------------------------
  const usersCol = app.findCollectionByNameOrId("users");

  const cumprimento = new Collection({ type: "base", name: "cumprimento" });
  app.save(cumprimento);

  cumprimento.listRule = "@request.auth.id != ''";
  cumprimento.viewRule = "@request.auth.id != ''";
  cumprimento.createRule = "user = @request.auth.id || demanda.responsavel = @request.auth.nomeFuncional || demanda.responsavel = @request.auth.name";
  cumprimento.deleteRule = "user = @request.auth.id || demanda.responsavel = @request.auth.nomeFuncional || demanda.responsavel = @request.auth.name";

  cumprimento.fields.add(new Field({
    name: "user",
    type: "relation",
    required: true,
    maxSelect: 1,
    collectionId: usersCol.id,
  }));
  cumprimento.fields.add(new Field({
    name: "demanda",
    type: "relation",
    required: true,
    maxSelect: 1,
    collectionId: demandas.id,
  }));
  cumprimento.fields.add(new Field({ name: "dataRegistro", type: "date" }));

  app.save(cumprimento);

  cumprimento.indexes.push(
    "CREATE UNIQUE INDEX `idx_cumprimento_user_demanda` ON `cumprimento` (`user`, `demanda`)"
  );
  app.save(cumprimento);

}, (app) => {
  try {
    const cumprimento = app.findCollectionByNameOrId("cumprimento");
    app.delete(cumprimento);
  } catch (_) {}

  try {
    const demandas = app.findCollectionByNameOrId("demandas");
    app.delete(demandas);
  } catch (_) {}

  try {
    const users = app.findCollectionByNameOrId("users");
    for (const name of ["role", "firstLogin", "celular", "numeroCurso", "numPM", "nomeFuncional"]) {
      const field = users.fields.getByName(name);
      if (field) users.fields.remove(field);
    }
    users.listRule = null;
    users.viewRule = null;
    users.manageRule = null;
    app.save(users);
  } catch (_) {}
});
