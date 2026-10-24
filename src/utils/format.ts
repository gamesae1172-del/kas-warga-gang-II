export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatDateIndo(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTimeIndo(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })}, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
  } catch {
    return dateString;
  }
}

// Terbilang Rupiah (Converting numbers to Indonesian words for receipts)
export function terbilang(nominal: number): string {
  const angka = Math.abs(Math.round(nominal));
  const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function toWords(n: number): string {
    if (n < 12) return bilangan[n];
    if (n < 20) return `${bilangan[n - 10]} Belas`;
    if (n < 100) return `${toWords(Math.floor(n / 10))} Puluh ${n % 10 > 0 ? bilangan[n % 10] : ''}`.trim();
    if (n < 200) return `Seratus ${toWords(n - 100)}`.trim();
    if (n < 1000) return `${bilangan[Math.floor(n / 100)]} Ratus ${toWords(n % 100)}`.trim();
    if (n < 2000) return `Seribu ${toWords(n - 1000)}`.trim();
    if (n < 1000000) return `${toWords(Math.floor(n / 1000))} Ribu ${toWords(n % 1000)}`.trim();
    if (n < 1000000000) return `${toWords(Math.floor(n / 1000000))} Juta ${toWords(n % 1000000)}`.trim();
    if (n < 1000000000000) return `${toWords(Math.floor(n / 1000000000))} Milyar ${toWords(n % 1000000000)}`.trim();
    return `${n}`;
  }

  if (angka === 0) return 'Nol Rupiah';
  return `${toWords(angka)} Rupiah`;
}

// CSV exporter
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
