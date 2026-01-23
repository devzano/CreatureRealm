// lib/data/palworld/paldbActiveSkills.ts

import { cleanKey, firstMatch, htmlToText } from "../palworldDB";

export type PalActiveSkill = {
  level: string; // "1", "7", etc.
  name: string; // "Ice Missile"
  element?: string; // "Ice"
  coolTime?: string; // "3"
  power?: string; // "30"
  aggregate?: string; // "Freeze • 103" (or similar)
  description?: string;
  skillFruitImageUrl?: string;
  skillFruitHref?: string; // e.g. Skill_Fruit%3A_Air_Cannon (optional)
};

function sliceSectionByH5(html: string, title: string, nextTitles: string[]) {
  const h5TitleRe = new RegExp(
    `<h5[^>]*>\\s*(?:<span[^>]*>\\s*)?${title}\\s*(?:<\\/span>\\s*)?<\\/h5>`,
    "i"
  );

  const startM = h5TitleRe.exec(html);
  if (!startM) return null;

  const sectionStart = startM.index;

  // find earliest next <h5 ...>NextTitle</h5> AFTER sectionStart
  let sectionEnd = -1;

  for (const next of nextTitles) {
    const nextRe = new RegExp(
      `<h5[^>]*>\\s*(?:<span[^>]*>\\s*)?${next}\\s*(?:<\\/span>\\s*)?<\\/h5>`,
      "i"
    );
    const after = html.slice(sectionStart + startM[0].length);
    const nm = nextRe.exec(after);
    if (!nm) continue;

    const idx = sectionStart + startM[0].length + nm.index;
    if (sectionEnd < 0 || idx < sectionEnd) sectionEnd = idx;
  }

  if (sectionEnd < 0) {
    sectionEnd = Math.min(html.length, sectionStart + 220_000);
  }

  return html.slice(sectionStart, sectionEnd);
}

export function parseActiveSkillsFromHtml(html: string): PalActiveSkill[] {
  const chunk =
    sliceSectionByH5(html, "Active Skills", [
      "Passive Skills",
      "Possible Drops",
      "Tribes",
      "Spawner",
      "Work Suitability",
      "Summary",
    ]) ?? null;

  if (!chunk) return [];

  // Split by the active skill card marker (this is the most stable part)
  const parts = chunk.split(/<div\s+class="card\s+itemPopup\s+activeSkill"[^>]*>/i);
  if (parts.length <= 1) return [];

  const skills: PalActiveSkill[] = [];

  // parts[0] is preface before first card
  for (let i = 1; i < parts.length; i++) {
    const cardHtml = `<div class="card itemPopup activeSkill">${parts[i]}`;

    const level =
      firstMatch(cardHtml, /Lv\.\s*([0-9]{1,3})/i) ??
      firstMatch(cardHtml, /Lv\s*\.?\s*([0-9]{1,3})/i);

    // Name is the <a> right after Lv
    const nameHtml =
      firstMatch(
        cardHtml,
        /Lv\.\s*[0-9]{1,3}\s*<a[^>]*>([\s\S]*?)<\/a>/i
      ) ?? null;
    const name = nameHtml ? cleanKey(htmlToText(nameHtml)) : null;

    if (!level || !name) continue;

    const fruitHref =
      firstMatch(
        cardHtml,
        /<a[^>]*href="([^"]*Skill_Fruit[^"]*)"[^>]*>[\s\S]*?<img[^>]*>/i
      ) ?? undefined;

    const fruitImg =
      firstMatch(
        cardHtml,
        /<a[^>]*href="[^"]*Skill_Fruit[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/i
      ) ?? undefined;

    const skillFruitHref = fruitHref ? cleanKey(htmlToText(fruitHref)) : undefined;
    const skillFruitImageUrl = fruitImg ? cleanKey(htmlToText(fruitImg)) : undefined;

    // Element: inside the "me-auto" bar
    const elementHtml = firstMatch(
      cardHtml,
      /<div[^>]*class="[^"]*\bme-auto\b[^"]*"[\s\S]*?<span[^>]*>\s*([^<]+)\s*<\/span>/i
    );
    const element = elementHtml ? cleanKey(htmlToText(elementHtml)) : undefined;

    // CoolTime
    const coolHtml =
      firstMatch(
        cardHtml,
        /data-bs-title="CoolTime"[\s\S]*?:\s*<span[^>]*>\s*([^<]+)\s*<\/span>/i
      ) ??
      firstMatch(
        cardHtml,
        /data-bs-title="CoolTime"[\s\S]*?:\s*([^<\s]+)\s*</i
      );
    const coolTime = coolHtml ? cleanKey(htmlToText(coolHtml)) : undefined;

    // Power
    const powerHtml = firstMatch(
      cardHtml,
      /Power:\s*<span[^>]*>\s*([^<]+)\s*<\/span>/i
    );
    const power = powerHtml ? cleanKey(htmlToText(powerHtml)) : undefined;

    // Aggregate
    let aggregate: string | undefined = undefined;
    const aggBlock = firstMatch(
      cardHtml,
      /<div[^>]*class="[^"]*\bAggregate\b[^"]*"[^>]*>[\s\S]*?<\/div>/i
    );

    if (aggBlock) {
      const statusHtml = firstMatch(
        aggBlock,
        /Aggregate:\s*<\/span>\s*<span[^>]*>\s*([^<]+)\s*<\/span>/i
      );
      const status = statusHtml ? cleanKey(htmlToText(statusHtml)) : null;

      const numHtml = firstMatch(
        aggBlock,
        /<div[^>]*class="ms-auto"[^>]*>\s*([^<]+)\s*<\/div>/i
      );
      const num = numHtml ? cleanKey(htmlToText(numHtml)) : null;

      if (status && num) aggregate = `${status} • ${num}`;
      else if (status) aggregate = status;
    }

    // Description
    const descHtml = firstMatch(
      cardHtml,
      /<div[^>]*class="card-body"[^>]*>([\s\S]*?)<\/div>/i
    );
    const description = descHtml ? cleanKey(htmlToText(descHtml)) : undefined;

    skills.push({
      level: String(level),
      name,
      element: element || undefined,
      coolTime: coolTime || undefined,
      power: power || undefined,
      aggregate: aggregate || undefined,
      description: description || undefined,

      skillFruitImageUrl: skillFruitImageUrl || undefined,
      skillFruitHref: skillFruitHref || undefined,
    });
  }

  return skills;
}
