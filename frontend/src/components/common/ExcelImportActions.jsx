import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload, X, CheckCircle2, AlertTriangle } from 'lucide-react';

function cellValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') return value.text ?? value.result ?? value.hyperlink ?? String(value);
  return value;
}

export function ExcelImportActions({ entityName, fileName, columns, createRecord, mapRow, onImported }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);

  const exportTemplate = async () => {
    setBusy(true);
    try {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'INVEXA';
      workbook.company = 'INVEXA';
      workbook.subject = `${entityName} import template`;
      workbook.created = new Date();

      const data = workbook.addWorksheet('Data', { views: [{ state: 'frozen', ySplit: 1 }] });
      data.columns = columns.map((column) => ({ key: column.key, header: column.header, width: column.width || 22 }));
      const header = data.getRow(1);
      header.height = 30;
      header.eachCell((cell, index) => {
        const required = columns[index - 1]?.required;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: required ? 'FF064789' : 'FF427AA1' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { bottom: { style: 'medium', color: { argb: 'FFEBF2FA' } } };
      });
      data.autoFilter = { from: 'A1', to: `${data.getColumn(columns.length).letter}1` };
      for (let row = 2; row <= 1001; row += 1) {
        data.getRow(row).height = 22;
        columns.forEach((column, index) => {
          const cell = data.getCell(row, index + 1);
          cell.alignment = { vertical: 'middle', wrapText: true };
          if (column.type === 'number') cell.numFmt = '#,##0.00';
          if (column.options?.length) {
            cell.dataValidation = {
              type: 'list',
              allowBlank: !column.required,
              formulae: [`"${column.options.join(',')}"`],
              showErrorMessage: true,
              errorTitle: 'Invalid value',
              error: `Choose one of: ${column.options.join(', ')}`,
            };
          }
        });
      }

      const guide = workbook.addWorksheet('Instructions');
      guide.columns = [{ width: 24 }, { width: 68 }];
      guide.mergeCells('A1:B1');
      guide.getCell('A1').value = `INVEXA ${entityName} Import Guide`;
      guide.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064789' } };
      guide.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 18 };
      guide.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      guide.getRow(1).height = 42;
      guide.addRow(['How to use', 'Enter records in the Data sheet, one record per row. Keep the header names unchanged, then upload this .xlsx file in INVEXA.']);
      guide.addRow(['Required fields', 'Dark-blue headers are required. Light-blue headers are optional.']);
      guide.addRow(['Before upload', 'Remove empty rows, check email/number formats, and make sure identifiers such as SKU or category code are unique.']);
      guide.addRow([]);
      guide.addRow(['Column', 'Description']);
      columns.forEach((column) => guide.addRow([`${column.header}${column.required ? ' *' : ''}`, column.note || 'Optional supporting information.']));
      guide.eachRow((row, rowNumber) => {
        row.alignment = { vertical: 'top', wrapText: true };
        if (rowNumber === 5) {
          row.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF427AA1' } };
          });
        }
      });

      const examples = workbook.addWorksheet('Example');
      examples.columns = columns.map((column) => ({ key: column.key, header: column.header, width: column.width || 22 }));
      examples.addRow(Object.fromEntries(columns.map((column) => [column.key, column.example ?? ''])));
      examples.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064789' } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setSummary({ imported: 0, failed: 1, errors: [error?.message || 'Could not create the Excel template.'] });
    } finally {
      setBusy(false);
    }
  };

  const importTemplate = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.getWorksheet('Data') || workbook.worksheets[0];
      if (!sheet) throw new Error('The workbook does not contain a Data sheet.');
      const headers = {};
      sheet.getRow(1).eachCell((cell, index) => { headers[String(cellValue(cell.value)).trim()] = index; });
      const missingHeaders = columns.filter((column) => !headers[column.header]).map((column) => column.header);
      if (missingHeaders.length) throw new Error(`Missing template columns: ${missingHeaders.join(', ')}`);

      const rows = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const raw = Object.fromEntries(columns.map((column) => [column.key, cellValue(row.getCell(headers[column.header]).value)]));
        if (Object.values(raw).some((value) => String(value ?? '').trim() !== '')) rows.push({ rowNumber, raw });
      });
      if (!rows.length) throw new Error('No records were found in the Data sheet.');

      let imported = 0;
      const errors = [];
      for (const item of rows) {
        try {
          const missing = columns.filter((column) => column.required && String(item.raw[column.key] ?? '').trim() === '');
          if (missing.length) throw new Error(`Required: ${missing.map((column) => column.header).join(', ')}`);
          const payload = mapRow ? await mapRow(item.raw) : item.raw;
          await createRecord(payload);
          imported += 1;
        } catch (error) {
          errors.push(`Row ${item.rowNumber}: ${error?.message || 'Import failed'}`);
        }
      }
      setSummary({ imported, failed: errors.length, errors });
      if (imported) await onImported?.();
    } catch (error) {
      setSummary({ imported: 0, failed: 1, errors: [error?.message || 'Could not read the workbook.'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportTemplate} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5 px-4 py-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-[var(--brand-primary)]/10 disabled:opacity-50">
          <Download className="h-4 w-4" /> Export Template
        </button>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50">
          {busy ? <FileSpreadsheet className="h-4 w-4 animate-pulse" /> : <Upload className="h-4 w-4" />} {busy ? 'Processing…' : 'Import Excel'}
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importTemplate} className="hidden" />
      </div>
      {summary && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div className="flex gap-3">{summary.failed ? <AlertTriangle className="h-6 w-6 text-amber-500" /> : <CheckCircle2 className="h-6 w-6 text-emerald-500" />}<div><h3 className="font-bold text-[var(--color-text-primary)]">{entityName} import results</h3><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{summary.imported} imported · {summary.failed} failed</p></div></div><button onClick={() => setSummary(null)} className="rounded-lg p-1 text-[var(--color-text-secondary)]"><X className="h-5 w-5" /></button></div>
            {summary.errors.length > 0 && <div className="mt-4 max-h-56 overflow-y-auto rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">{summary.errors.map((error, index) => <p key={index} className="py-1">{error}</p>)}</div>}
            <button type="button" onClick={() => setSummary(null)} className="mt-5 w-full rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">Done</button>
          </div>
        </div>
      )}
    </>
  );
}

export default ExcelImportActions;
