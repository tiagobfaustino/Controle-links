/// <reference path="../pb_data/types.d.ts" />

// Instruções opcionais do responsável para orientar o cumprimento da demanda.

migrate((app) => {
  const demandas = app.findCollectionByNameOrId("demandas");
  demandas.fields.add(new Field({
    name: "observacao",
    type: "text",
  }));
  app.save(demandas);
}, (app) => {
  const demandas = app.findCollectionByNameOrId("demandas");
  const observacao = demandas.fields.getByName("observacao");
  if (observacao) demandas.fields.remove(observacao);
  app.save(demandas);
});
