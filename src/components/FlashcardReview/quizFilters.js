/**
 * Shared card filters for quiz modes that need fill-in-the-blank eligible cards.
 * Used by FillBlankMode and ContextClueMode.
 */
export function filterFillBlankCards(cards, singleCard) {
  if (singleCard) {
    const c = singleCard;
    if (c.exampleSentence?.includes(c.target))
      return [{ ...c, fillSentence: c.exampleSentence }];
    if (c.exampleExtra?.includes(c.target))
      return [{ ...c, fillSentence: c.exampleExtra }];
    return [];
  }
  return cards.map(c => {
    if (c.exampleSentence?.includes(c.target))
      return { ...c, fillSentence: c.exampleSentence };
    if (c.exampleExtra?.includes(c.target))
      return { ...c, fillSentence: c.exampleExtra };
    return null;
  }).filter(Boolean);
}
