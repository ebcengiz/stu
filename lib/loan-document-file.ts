/** Kredi belgesi yükleme: boyut ve uzantı (MIME tarayıcıya göre değişebilir) */

export const LOAN_DOC_MAX_BYTES = 5 * 1024 * 1024

export const LOAN_DOC_ACCEPT =
  '.doc,.docx,.xls,.xlsx,.pdf,.jpg,.jpeg,.gif,.png,.txt,.webp'

const ALLOWED_EXT = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'pdf',
  'jpg',
  'jpeg',
  'gif',
  'png',
  'txt',
  'webp',
])

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export function validateLoanDocumentFile(file: File): string | null {
  if (file.size > LOAN_DOC_MAX_BYTES) {
    return 'Dosya boyutu 5 MB’ı geçmemelidir.'
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXT.has(ext)) {
    return 'Uzantısı doc, docx, xls, xlsx, pdf, jpg, gif, png, txt veya webp olan dosyaları yükleyebilirsiniz.'
  }
  return null
}

export function contentTypeForLoanDocument(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type
  }
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}
