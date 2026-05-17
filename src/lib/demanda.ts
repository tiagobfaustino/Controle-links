export type PrazoDemanda = {
  prazo: string;
  horaLimite?: string;
};

export function getDemandaDeadline(demanda: PrazoDemanda): Date | null {
  const datePart = demanda.prazo.split(/[ T]/)[0];
  if (!datePart) return null;

  const horaLimite = demanda.horaLimite || "23:59";
  const deadline = new Date(`${datePart}T${horaLimite}:59`);

  return isNaN(deadline.getTime()) ? null : deadline;
}

export function isDemandaVencida(demanda: PrazoDemanda): boolean {
  const deadline = getDemandaDeadline(demanda);
  return deadline ? new Date() > deadline : false;
}
