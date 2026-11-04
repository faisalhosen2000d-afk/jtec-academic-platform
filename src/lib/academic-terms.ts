export type AcademicLevelOrder = {
  id: string;
  sort_order: number;
};

export type AcademicTermOrder = {
  id: string;
  level_id: string;
  sort_order: number;
};

export type AcademicTermNavigation<TLevel extends AcademicLevelOrder, TTerm extends AcademicTermOrder> = {
  currentLevel: TLevel;
  currentTerm: TTerm;
  previousTerms: TTerm[];
  currentAndPreviousTerms: TTerm[];
};

export function getAcademicTermNavigation<
  TLevel extends AcademicLevelOrder,
  TTerm extends AcademicTermOrder,
>(
  levels: readonly TLevel[],
  terms: readonly TTerm[],
  currentLevelId: string | null,
  currentTermId: string | null,
): AcademicTermNavigation<TLevel, TTerm> | null {
  if (!currentLevelId || !currentTermId) {
    return null;
  }

  const currentLevel = levels.find((level) => level.id === currentLevelId);
  const currentTerm = terms.find((term) => term.id === currentTermId);

  if (!currentLevel || !currentTerm || currentTerm.level_id !== currentLevel.id) {
    return null;
  }

  const levelOrderById = new Map(
    levels.map((level) => [level.id, level.sort_order]),
  );

  const orderedTerms = terms
    .filter((term) => levelOrderById.has(term.level_id))
    .slice()
    .sort((a, b) => {
      const levelDifference =
        levelOrderById.get(a.level_id)! - levelOrderById.get(b.level_id)!;

      if (levelDifference !== 0) {
        return levelDifference;
      }

      return a.sort_order - b.sort_order;
    });

  const currentIndex = orderedTerms.findIndex(
    (term) => term.id === currentTerm.id,
  );

  if (currentIndex < 0) {
    return null;
  }

  return {
    currentLevel,
    currentTerm,
    previousTerms: orderedTerms.slice(0, currentIndex),
    currentAndPreviousTerms: orderedTerms.slice(0, currentIndex + 1),
  };
}
