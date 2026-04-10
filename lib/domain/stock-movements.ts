/** Stok hareket tipi etiketleri ve UI sınıfları — tek kaynak */

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: 'Giriş',
  out: 'Çıkış',
  transfer: 'Transfer',
  adjustment: 'Düzeltme',
}

export const MOVEMENT_TYPE_BADGE_CLASSES: Record<string, string> = {
  in: 'bg-green-100 text-green-800',
  out: 'bg-red-100 text-red-800',
  transfer: 'bg-blue-100 text-blue-800',
  adjustment: 'bg-yellow-100 text-yellow-800',
}

export function getMovementTypeLabel(type: string): string {
  return MOVEMENT_TYPE_LABELS[type] ?? type
}

export function getMovementTypeBadgeClass(type: string): string {
  return MOVEMENT_TYPE_BADGE_CLASSES[type] ?? 'bg-gray-100 text-gray-800'
}
