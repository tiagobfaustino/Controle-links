export type PrazoDemanda = {
  prazo: string;
  horaLimite?: string;
};

export function getDemandaDatePart(prazo: string): string {
  return prazo.split(/[ T]/)[0] ?? prazo;
}

export function formatDemandaDate(prazo: string): string {
  const datePart = getDemandaDatePart(prazo);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return prazo;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

export function formatDemandaShortDate(prazo: string): string {
  const datePart = getDemandaDatePart(prazo);
  const [, month, day] = datePart.split("-");
  if (!month || !day) return prazo;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}`;
}

export function getDemandaDeadline(demanda: PrazoDemanda): Date | null {
  const datePart = getDemandaDatePart(demanda.prazo);
  if (!datePart) return null;

  const horaLimite = demanda.horaLimite || "23:59";
  const deadline = new Date(`${datePart}T${horaLimite}:59`);

  return isNaN(deadline.getTime()) ? null : deadline;
}

export function isDemandaVencida(demanda: PrazoDemanda): boolean {
  const deadline = getDemandaDeadline(demanda);
  return deadline ? new Date() > deadline : false;
}
