/** Excel sütun başlığını eşleştirme anahtarına çevirir */
export function normHeader(s: string): string {
  return s
    .replace(/\*/g, '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
}
