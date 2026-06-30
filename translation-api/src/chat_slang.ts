/** Common chat abbreviations expanded before translation (Google website handles these via context). */
const SLANG_BY_LANGUAGE: Record<string, Record<string, string>> = {
  fr: {
    bjr: 'bonjour',
    slt: 'salut',
    cc: 'coucou',
    stp: "s'il te plaît",
    svp: "s'il vous plaît",
    mdr: 'mort de rire',
    ptdr: 'mort de rire',
    rdv: 'rendez-vous',
    bsr: 'bonsoir',
    bsn: 'bonne nuit',
    cv: 'comment vas-tu',
    tkt: "t'inquiète",
    dsl: 'désolé',
    pk: 'pourquoi',
    prq: 'pourquoi',
    tt: 'tout',
    tjrs: 'toujours',
    bcp: 'beaucoup',
    qq: 'quelque',
    qqn: "quelqu'un",
    qqch: 'quelque chose',
  },
  en: {
    brb: 'be right back',
    btw: 'by the way',
    idk: "I don't know",
    imo: 'in my opinion',
    tbh: 'to be honest',
    np: 'no problem',
    thx: 'thanks',
    ty: 'thank you',
    pls: 'please',
    plz: 'please',
    u: 'you',
    ur: 'your',
    rn: 'right now',
    asap: 'as soon as possible',
    lol: 'laughing',
    omg: 'oh my god',
    nvm: 'never mind',
    fwiw: 'for what it is worth',
  },
  lg: {
    oly: 'oli',
    oli: 'oli',
  },
};

export type SlangExpansion = {
  text: string;
  expanded: boolean;
  slangLanguage?: string;
  originalToken?: string;
};

export function expandChatSlang(text: string, hintLanguage?: string): SlangExpansion {
  const trimmed = text.trim();
  if (!trimmed) {
    return {text: trimmed, expanded: false};
  }

  const isSingleToken = !/\s/.test(trimmed);
  if (!isSingleToken) {
    return {text: trimmed, expanded: false};
  }

  const lower = trimmed.toLowerCase();

  if (hintLanguage) {
    const hint = hintLanguage.trim().toLowerCase().split(/[-_]/)[0];
    const mapped = SLANG_BY_LANGUAGE[hint]?.[lower];
    if (mapped) {
      return {
        text: mapped,
        expanded: true,
        slangLanguage: hint,
        originalToken: trimmed,
      };
    }
  }

  for (const [lang, dictionary] of Object.entries(SLANG_BY_LANGUAGE)) {
    const mapped = dictionary[lower];
    if (mapped) {
      return {
        text: mapped,
        expanded: true,
        slangLanguage: lang,
        originalToken: trimmed,
      };
    }
  }

  return {text: trimmed, expanded: false};
}
