const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Formula injection protection (CWE-1236).
 * Prepends a single quote if a cell string begins with dangerous spreadsheet formula characters.
 */
const sanitizeFormula = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
};

/**
 * CSV escaping following RFC 4180
 */
const csvCell = (value) => {
  const safe = sanitizeFormula(value);
  return `"${safe.replace(/"/g, '""')}"`;
};

/**
 * Generates an RFC-4180 compliant CSV string with UTF-8 BOM
 */
const generateCsv = ({ title, ngoName, generatedAt, filters, columns, data }) => {
  const lines = [];

  // Metadata Header Block
  lines.push([csvCell('NGOcore Report'), csvCell(title)].join(','));
  lines.push([csvCell('Organization'), csvCell(ngoName || 'NGO Organization')].join(','));
  lines.push([csvCell('Generated At'), csvCell(new Date(generatedAt || Date.now()).toISOString())].join(','));
  lines.push([csvCell('Applied Filters'), csvCell(filters ? JSON.stringify(filters) : 'None')].join(','));
  lines.push(''); // Empty line before table

  // Table Column Headers
  const headerRow = columns.map((col) => csvCell(col.header)).join(',');
  lines.push(headerRow);

  // Table Data Rows
  for (const row of data) {
    const rowCells = columns.map((col) => csvCell(row[col.key]));
    lines.push(rowCells.join(','));
  }

  // UTF-8 BOM for seamless Excel multi-language encoding
  return '\uFEFF' + lines.join('\r\n');
};

/**
 * Generates a professionally styled Excel (.xlsx) file as a Buffer using ExcelJS
 */
const generateExcel = async ({ title, ngoName, generatedAt, filters, columns, data }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NGOcore System';
  workbook.created = new Date(generatedAt || Date.now());

  const sheet = workbook.addWorksheet(title.slice(0, 31) || 'Report', {
    pageSetup: { orientation: 'landscape', fitToPage: true }
  });

  // 1. Report Title Banner
  sheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${title.toUpperCase()} — ${ngoName || 'NGO ORGANIZATION'}`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF15803D' } // Brand Green Dark
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 34;

  // 2. Metadata Block
  const metaLabels = [
    ['Organization:', ngoName || 'NGO Organization'],
    ['Generated At:', new Date(generatedAt || Date.now()).toISOString()],
    ['Applied Filters:', filters ? JSON.stringify(filters) : 'None'],
    ['Total Records:', data.length]
  ];

  metaLabels.forEach((meta, idx) => {
    const rowNum = idx + 2;
    sheet.getCell(rowNum, 1).value = meta[0];
    sheet.getCell(rowNum, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
    sheet.getCell(rowNum, 2).value = sanitizeFormula(meta[1]);
    sheet.getCell(rowNum, 2).font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
    sheet.getRow(rowNum).height = 18;
  });

  // Row 6 is blank separator
  sheet.getRow(6).height = 12;

  // 3. Table Column Headers
  const headerRowNum = 7;
  const headerRow = sheet.getRow(headerRowNum);
  headerRow.height = 26;

  columns.forEach((col, idx) => {
    const colNum = idx + 1;
    const cell = sheet.getCell(headerRowNum, colNum);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' } // Brand Green Medium
    };
    cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F766E' } },
      bottom: { style: 'medium', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF0F766E' } }
    };
  });

  // 4. Data Rows
  data.forEach((row, rowIdx) => {
    const currentRowNum = headerRowNum + 1 + rowIdx;
    const isEven = rowIdx % 2 === 0;
    const dataRow = sheet.getRow(currentRowNum);
    dataRow.height = 20;

    columns.forEach((col, colIdx) => {
      const colNum = colIdx + 1;
      const cell = sheet.getCell(currentRowNum, colNum);
      const val = row[col.key];
      cell.value = sanitizeFormula(val == null ? '' : val);
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
      };
      cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // 5. Compute adaptive column widths
  columns.forEach((col, idx) => {
    const colNum = idx + 1;
    let maxLen = col.header.length;
    data.slice(0, 100).forEach((row) => {
      const valStr = String(row[col.key] || '');
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    sheet.getColumn(colNum).width = Math.min(Math.max(maxLen + 4, 12), 45);
  });

  return workbook.xlsx.writeBuffer();
};

/**
 * Generates a clean, paginated PDF report Buffer using PDFKit
 */
const generatePdf = ({ title, ngoName, generatedAt, filters, columns, data, isLandscape = true }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: isLandscape ? 'landscape' : 'portrait',
        margin: 30,
        bufferPages: true,
        info: {
          Title: title,
          Author: 'NGOcore Records System'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const contentWidth = pageWidth - 60; // 30 margin left & right

      // Calculate column widths proportionately
      const totalColWeight = columns.reduce((acc, col) => acc + (col.widthWeight || 1), 0);
      const colWidths = columns.map((col) => Math.floor(contentWidth * ((col.widthWeight || 1) / totalColWeight)));

      // Render Header Block
      const drawHeaderBlock = () => {
        doc.rect(30, 25, contentWidth, 38).fill('#15803D');
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF')
          .text(title.toUpperCase(), 40, 32, { width: contentWidth - 20, align: 'left' });
        doc.fontSize(9).font('Helvetica').fillColor('#DCFCE7')
          .text(`Organization: ${ngoName || 'NGO Organization'} | Generated: ${new Date(generatedAt || Date.now()).toISOString().slice(0, 19).replace('T', ' ')}`, 40, 48, { width: contentWidth - 20, align: 'left' });
      };

      // Render Filter Metadata
      let currentY = 70;
      doc.fontSize(8).font('Helvetica').fillColor('#64748B')
        .text(`Applied Filters: ${filters ? JSON.stringify(filters) : 'None'}  |  Total Records: ${data.length}`, 30, currentY, { width: contentWidth });
      currentY += 15;

      // Table Header Drawer
      const drawTableHeader = (y) => {
        doc.rect(30, y, contentWidth, 20).fill('#16A34A');
        let x = 30;
        columns.forEach((col, idx) => {
          const w = colWidths[idx];
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF')
            .text(col.header, x + 3, y + 5, { width: w - 6, align: col.align || 'left', ellipsis: true });
          x += w;
        });
        return y + 20;
      };

      drawHeaderBlock();
      currentY = drawTableHeader(currentY);

      // Data Rows
      const rowHeight = 18;
      data.forEach((row, rowIdx) => {
        // Page break check
        if (currentY + rowHeight > pageHeight - 40) {
          doc.addPage();
          drawHeaderBlock();
          currentY = drawTableHeader(75);
        }

        const isEven = rowIdx % 2 === 0;
        if (!isEven) {
          doc.rect(30, currentY, contentWidth, rowHeight).fill('#F8FAFC');
        }

        // Row dividing line
        doc.moveTo(30, currentY + rowHeight).lineTo(30 + contentWidth, currentY + rowHeight).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

        let x = 30;
        columns.forEach((col, idx) => {
          const w = colWidths[idx];
          const rawVal = row[col.key];
          const val = sanitizeFormula(rawVal == null ? '' : String(rawVal));
          doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
            .text(val, x + 3, currentY + 4.5, { width: w - 6, align: col.align || 'left', ellipsis: true });
          x += w;
        });

        currentY += rowHeight;
      });

      // Global Footer on all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7.5).font('Helvetica').fillColor('#94A3B8')
          .text(
            `NGOcore Confidential Report  •  Page ${i + 1} of ${range.count}`,
            30,
            pageHeight - 25,
            { width: contentWidth, align: 'center' }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  sanitizeFormula,
  generateCsv,
  generateExcel,
  generatePdf
};

