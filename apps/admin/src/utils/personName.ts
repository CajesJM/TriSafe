export type PersonNameParts = { lastName: string; firstName: string; middleInitial: string };

const namePartPattern = /^[\p{L}][\p{L} '-]*$/u;
const firstNamePattern = /^[\p{L}][\p{L}'-]+(?: [\p{L}][\p{L}'-]+)*$/u;

export function cleanPersonNamePart(value: string, maxLength = 45) {
  return value.replace(/[^\p{L} '-]/gu, "").slice(0, maxLength);
}
export function cleanMiddleInitial(value: string) {
  return value.match(/\p{L}/u)?.[0]?.toUpperCase() ?? "";
}
export function formatPersonName(parts: PersonNameParts) {
  const lastName = normalizePart(parts.lastName);
  const firstName = normalizePart(parts.firstName);
  const middleInitial = cleanMiddleInitial(parts.middleInitial);
  return `${lastName}, ${firstName}${middleInitial ? ` ${middleInitial}.` : ""}`;
}
export function parsePersonName(fullName: string): PersonNameParts {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (normalized.includes(",")) {
    const commaIndex = normalized.indexOf(",");
    const lastName = normalized.slice(0, commaIndex).trim();
    const givenNames = normalized.slice(commaIndex + 1).trim();
    const initialMatch = givenNames.match(/\s+(\p{L})\.?$/u);
    return { lastName, firstName: initialMatch ? givenNames.slice(0, initialMatch.index).trim() : givenNames, middleInitial: initialMatch?.[1]?.toUpperCase() ?? "" };
  }
  const words = normalized.split(" ").filter(Boolean);
  if (words.length <= 1) return { lastName: words[0] ?? "", firstName: "", middleInitial: "" };
  return { lastName: words.at(-1) ?? "", firstName: words.slice(0, -1).join(" "), middleInitial: "" };
}
export function displayPersonName(fullName: string) {
  const parts = parsePersonName(fullName);
  return parts.firstName && parts.lastName ? formatPersonName(parts) : fullName;
}
export function validatePersonName(parts: PersonNameParts) {
  const lastName = normalizePart(parts.lastName);
  const firstName = normalizePart(parts.firstName);
  if (lastName.length < 2 || lastName.length > 45 || !namePartPattern.test(lastName)) return "Enter a valid last name using letters, spaces, apostrophes, or hyphens.";
  if (firstName.length < 2 || firstName.length > 45 || !firstNamePattern.test(firstName)) return "Enter a valid first name using letters, spaces, apostrophes, or hyphens.";
  if (parts.middleInitial && !/^\p{L}$/u.test(parts.middleInitial)) return "Middle initial must contain only one letter.";
  return "";
}
function normalizePart(value: string) { return value.trim().replace(/\s+/g, " "); }
