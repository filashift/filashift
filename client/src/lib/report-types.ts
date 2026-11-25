export type Rep = string | ((m: string, ...g: string[]) => string);
export type Rules = [RegExp, Rep][];
