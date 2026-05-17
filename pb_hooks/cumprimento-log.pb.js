/// <reference path="../pb_data/types.d.ts" />

// Append-only audit log para cumprimento.
// Inserções e remoções são registradas em `cumprimento_log` com o ator
// autenticado. Os hooks usam `onRecord*Request` (não os `AfterSuccess`)
// porque só o RecordRequestEvent expõe `e.auth`.

function writeLog(app, action, record, auth) {
  try {
    const logCol = app.findCollectionByNameOrId("cumprimento_log");
    const entry = new Record(logCol);
    entry.set("action", action);
    entry.set("demanda", record.getString("demanda"));
    entry.set("targetUser", record.getString("user"));
    if (auth) entry.set("actor", auth.id);
    app.save(entry);
  } catch (err) {
    // Falha de log nunca deve impedir a operação principal.
    console.log("[cumprimento-log] erro ao gravar:", err);
  }
}

onRecordCreateRequest((e) => {
  e.next();
  writeLog(e.app, "create", e.record, e.auth);
}, "cumprimento");

onRecordDeleteRequest((e) => {
  const snapshot = e.record;
  const auth = e.auth;
  e.next();
  writeLog(e.app, "delete", snapshot, auth);
}, "cumprimento");
