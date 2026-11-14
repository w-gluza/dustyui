const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

export function isIdentifier(text: string): boolean {
  return IDENTIFIER.test(text);
}
