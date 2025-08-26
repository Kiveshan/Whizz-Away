import ExcelJS from 'exceljs';
import { getProfitLossData } from '../../models/profit-loss/profitLossModel.js';

const generateProfitLossReport = async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
    }

    try {
        const { profitDetails, lossDetails, totalProfit, totalLoss, net } = await getProfitLossData(month, year);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Profit & Loss Report');

        worksheet.columns = [
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Profit (R)', key: 'profit', width: 20 },
            { header: 'Loss (R)', key: 'loss', width: 20 },
            { header: 'Net (R)', key: 'net', width: 20 },
        ];

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

        worksheet.insertRow(1, [`Profit & Loss Report - ${month} ${year}`]);
        worksheet.mergeCells('A1:E1');
        worksheet.getRow(1).font = { bold: true, size: 14 };
        worksheet.getRow(1).alignment = { horizontal: 'center' };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD4E6F1' },
        };

        profitDetails.forEach(detail => {
            worksheet.addRow({
                category: detail.source,
                date: detail.date,
                profit: `R ${detail.amount.toFixed(2)}`,
                loss: '',
                net: '',
            });
        });

        lossDetails.forEach(detail => {
            worksheet.addRow({
                category: detail.source,
                date: detail.date,
                profit: '',
                loss: `R ${Math.abs(detail.amount).toFixed(2)}`,
                net: '',
            });
        });

        const startRow = worksheet.rowCount + 1;
        worksheet.addRow({
            category: 'Totals',
            date: '',
            profit: `R ${totalProfit.toFixed(2)}`,
            loss: `R ${Math.abs(totalLoss).toFixed(2)}`,
            net: net >= 0 ? `R ${net.toFixed(2)}` : `R -${Math.abs(net).toFixed(2)}`,
        });

        worksheet.getRows(2, worksheet.rowCount - 1).forEach(row => {
            row.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            if (row.number % 2 === 0 && row.number < startRow) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8F9FA' },
                };
            }
        });
        worksheet.getRow(startRow).font = { bold: true, size: 12 };
        worksheet.getRow(startRow).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F3FF' },
        };

        //Generating the file
        const filename = `Profit_Loss_Report_${month}_${year}.xlsx`;
        const buffer = await workbook.xlsx.writeBuffer();
        console.log('Buffer length:', buffer.length);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

export { generateProfitLossReport };