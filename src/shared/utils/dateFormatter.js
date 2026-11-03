/**
 * MedGuard AI Safe Date Formatter
 * Supports YYYY-MM-DD, YYYY-MM, MM-YY, MM/YY, YYYY without inventing days
 */
export const formatMedicineDate = (dateVal) => {
  if (!dateVal || typeof dateVal !== 'string') return 'Not detected';
  const val = dateVal.trim();
  if (!val) return 'Not detected';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Match ISO YYYY-MM-DD
  const isoFull = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
  if (isoFull) {
    const year = isoFull[1];
    const monthIdx = parseInt(isoFull[2], 10) - 1;
    const day = parseInt(isoFull[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }

  // Match YYYY-MM
  const isoYearMonth = /^(\d{4})-(\d{2})$/.exec(val);
  if (isoYearMonth) {
    const year = isoYearMonth[1];
    const monthIdx = parseInt(isoYearMonth[2], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${year}`;
    }
  }

  // Match MM-YY or MM/YY or MM-YYYY or MM/YYYY (e.g. 06-25 or 06/25)
  const slashDash = /^(\d{1,2})[-/](\d{2,4})$/.exec(val);
  if (slashDash) {
    const monthIdx = parseInt(slashDash[1], 10) - 1;
    let year = slashDash[2];
    if (year.length === 2) {
      year = `20${year}`;
    }
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${year}`;
    }
  }

  // Match pure 4-digit year
  if (/^\d{4}$/.test(val)) {
    return val;
  }

  // Fallback to original value if safe
  return val;
};
