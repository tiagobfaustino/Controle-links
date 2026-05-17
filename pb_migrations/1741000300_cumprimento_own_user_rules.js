/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const cumprimento = app.findCollectionByNameOrId("cumprimento");

  cumprimento.createRule = "user = @request.auth.id";
  cumprimento.deleteRule = "user = @request.auth.id";

  app.save(cumprimento);
}, (app) => {
  const cumprimento = app.findCollectionByNameOrId("cumprimento");

  cumprimento.createRule = "@request.auth.id != ''";
  cumprimento.deleteRule = "@request.auth.id != ''";

  app.save(cumprimento);
});
