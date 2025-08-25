import ExcelJS from 'exceljs';
import { getProfitLossData } from '../../models/profit-loss/profitLossModel.js';

const generateProfitLossReport = async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
    }

    try {
        const { profit, loss, net } = await getProfitLossData(month, year);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Profit & Loss Report');

        // Set up headers
        worksheet.columns = [
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Amount (R)', key: 'amount', width: 20 },
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true, size: 12 };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F3FF' },
        };
        worksheet.getRow(1).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };

        // Add title row
        worksheet.insertRow(1, [`Profit & Loss Report - ${month} ${year}`]);
        worksheet.mergeCells('A1:B1');
        worksheet.getRow(1).font = { bold: true, size: 14 };
        worksheet.getRow(1).alignment = { horizontal: 'center' };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD4E6F1' },
        };

        // Add data
        worksheet.addRow({ category: 'Total Profit', amount: `R ${profit.toFixed(2)}` });
        worksheet.addRow({ category: 'Total Loss', amount: `R ${loss.toFixed(2)}` });
        worksheet.addRow({ category: 'Net Profit/Loss', amount: `R ${net.toFixed(2)}` });

        // Style data rows
        worksheet.getRows(2, 3).forEach(row => {
            row.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            if (row.number % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8F9FA' },
                };
            }
        });

        // Generate and send file
        const filename = `Profit_Loss_Report_${month}_${year}.xlsx`;
        const buffer = await workbook.xlsx.writeBuffer();
        console.log('Buffer length:', buffer.length); // Debug log

        // Save to disk for verification (optional, uncomment and adjust path)
        // const fs = require('fs');
        // fs.writeFileSync(`/tmp/${filename}`, buffer);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer); // Send buffer directly, avoid Buffer.from()
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

export { generateProfitLossReport };