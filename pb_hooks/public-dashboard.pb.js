routerAdd("GET", "/api/public-dashboard", (e) => {
  const users = e.app.findRecordsByFilter(
    "users",
    "role != 'ADMIN'",
    "numeroCurso,name",
    500,
    0,
  );

  const demandas = e.app.findRecordsByFilter(
    "demandas",
    "ativa = true",
    "prazo",
    500,
    0,
  );

  const cumprimentos = e.app.findRecordsByFilter(
    "cumprimento",
    "",
    "",
    5000,
    0,
  );

  const demandaIds = {};
  for (const d of demandas) {
    demandaIds[d.id] = true;
  }

  const userIds = {};
  const publicUsers = [];
  for (const u of users) {
    userIds[u.id] = true;
    publicUsers.push({
      id: u.id,
      name: u.getString("name"),
      nomeFuncional: u.getString("nomeFuncional"),
      numeroCurso: u.getInt("numeroCurso"),
      role: u.getString("role"),
    });
  }

  const publicDemandas = demandas.map((d) => ({
    id: d.id,
    titulo: d.getString("titulo"),
    linkForm: d.getString("linkForm"),
    prazo: d.getString("prazo"),
    horaLimite: d.getString("horaLimite"),
    responsavel: d.getString("responsavel"),
    ativa: d.getBool("ativa"),
  }));

  const publicCumprimentos = [];
  for (const c of cumprimentos) {
    const user = c.getString("user");
    const demanda = c.getString("demanda");
    if (!userIds[user] || !demandaIds[demanda]) continue;

    publicCumprimentos.push({
      id: c.id,
      user,
      demanda,
      dataRegistro: c.getString("dataRegistro"),
    });
  }

  return e.json(200, {
    usuarios: publicUsers,
    demandas: publicDemandas,
    cumprimentos: publicCumprimentos,
  });
});
