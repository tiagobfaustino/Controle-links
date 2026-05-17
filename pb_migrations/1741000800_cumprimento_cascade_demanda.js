/// <reference path="../pb_data/types.d.ts" />

// Liga cascadeDelete na FK `cumprimento.demanda`. Sem isso, deletar uma
// demanda exige apagar os cumprimentos um a um via API — operação que falha
// quando o ator não tem permissão para deletar os cumprimentos dos outros
// usuários (regra de delete restringe a `user = auth.id` ou ser responsável).
//
// Com cascade ativado, a exclusão da demanda apaga as linhas dependentes
// diretamente no banco, sem passar pelas regras de API.

migrate((app) => {
  const cumprimento = app.findCollectionByNameOrId("cumprimento");
  const demandaField = cumprimento.fields.getByName("demanda");
  demandaField.cascadeDelete = true;
  app.save(cumprimento);
}, (app) => {
  const cumprimento = app.findCollectionByNameOrId("cumprimento");
  const demandaField = cumprimento.fields.getByName("demanda");
  demandaField.cascadeDelete = false;
  app.save(cumprimento);
});
