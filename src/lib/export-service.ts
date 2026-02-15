import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportService = {
    async exportToPDF(elementId: string, filename: string = 'dashboard') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with id ${elementId} not found`);
            return;
        }

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#f3f4f6' // Match dashboard bg
            } as any);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${filename}.pdf`);
        } catch (error) {
            console.error('Export failed:', error);
        }
    },

    async exportToPNG(elementId: string, filename: string = 'dashboard') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with id ${elementId} not found`);
            return;
        }

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            } as any);

            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
        }
    }
};
