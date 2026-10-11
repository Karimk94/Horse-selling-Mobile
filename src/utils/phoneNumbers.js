export function toWhatsAppNumber(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.startsWith('00') ? digits.slice(2) : digits;
}

export function toTelephoneNumber(phone) {
  const value = String(phone ?? '').trim();
  const digits = value.replace(/\D/g, '');
  const internationalDigits = digits.startsWith('00') ? digits.slice(2) : digits;

  if (value.startsWith('+') || digits.startsWith('00')) {
    return `+${internationalDigits}`;
  }

  return value.replace(/[^0-9+]/g, '');
}
