// The garden problem's variation, 「假如 1 个苹果 = 2 根黄瓜」: what the child
// may tap as kept and as changed when saying the reason is not possible, by
// id, with the words the dew drops show. The site shows them and the server's
// rule judges the ids, so both read them from here.
export const gardenVariationChoices = {
  groups: '组数',
  'per-group': '每组根数',
} as const;

export type GardenVariationChoice = keyof typeof gardenVariationChoices;
