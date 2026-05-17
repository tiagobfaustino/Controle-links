/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const cumprimento = app.findCollectionByNameOrId("cumprimento");

  const rule = "user = @request.auth.id || demanda.responsavel = @request.auth.nomeFuncional || demanda.responsavel = @request.auth.name";
  cumprimento.createRule = rule;
  cumprimento.deleteRule = rule;

  app.save(cumprimento);
}, (app) => {
  const cumprimento = app.findCollectionByNameOrId("cumprimento");

  cumprimento.createRule = "user = @request.auth.id";
  cumprimento.deleteRule = "user = @request.auth.id";

  app.save(cumprimento);
});
