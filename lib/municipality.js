const normalizeLocationText = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/\s+/g, '')
  .trim();

const stripPostalCode = (value) => value.replace(/^〒?\d{3}-?\d{4}/, '');

export const inferMunicipalityFromAddress = (value = '') => {
  const normalized = stripPostalCode(normalizeLocationText(value));
  if (!normalized) return '';

  const withoutPrefecture = normalized.replace(
    /^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/,
    ''
  );
  const match = withoutPrefecture.match(/^(?:[^0-9-]+?郡)?([^0-9-]+?(?:市|区|町|村))/);
  return match?.[1] || '';
};

const inferMunicipalityFromLegacyCompany = (value = '') => {
  const normalized = normalizeLocationText(value);
  if (!/^[^0-9-]{1,30}(?:市|区|町|村)$/.test(normalized)) return '';
  return inferMunicipalityFromAddress(normalized);
};

export const getReservationMunicipality = (reservation = {}) => {
  const fromAddress = inferMunicipalityFromAddress(reservation.address);
  if (fromAddress) return { name: fromAddress, source: 'address' };

  const fromLegacyCompany = inferMunicipalityFromLegacyCompany(reservation.company_name);
  if (fromLegacyCompany) return { name: fromLegacyCompany, source: 'company' };

  return { name: '市町村不明', source: 'unknown' };
};
