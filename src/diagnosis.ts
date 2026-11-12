export type Tally = {
  total: number;
  noPerson: number;
  missing: Record<string, number>;
};

export function explainFailure({ total, noPerson, missing }: Tally): string {
  const percent = (count: number) =>
    Math.round((count / Math.max(1, total)) * 100);
  const worst = Object.entries(missing).sort((a, b) => b[1] - a[1])[0];
  if (noPerson > total / 2 || !worst)
    return `Fant ingen tydelig person i midten i ${percent(noPerson)} % av bildene. Prøv en video der personen er større i bildet og lyset er godt.`;
  return `Personen i midten ble funnet, men ${worst[0]} var skjult eller utenfor bildet i ${percent(worst[1])} % av bildene. Prøv en video der hele kroppen, også føttene, er synlig.`;
}
