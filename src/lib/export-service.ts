import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Attempt to export a Plotly chart via its built-in toImage API.
 * Returns the data URL of the chart image, or null if not a Plotly chart.
 */
async function exportPlotlyChartAsImage(plotElement: HTMLElement): Promise<string | null> {
    try {
        // Plotly stores data on the element's __plotly_plotted property
        // or we can check for the .js-plotly-plot class
        const plotDiv = plotElement.querySelector('.js-plotly-plot') ||
                       (plotElement.classList?.contains('js-plotly-plot') ? plotElement : null);
        if (!plotDiv) return null;

        // Use Plotly's global toImage if available
        const Plotly = (window as any).Plotly;
        if (Plotly && typeof Plotly.toImage === 'function') {
            const dataUrl = await Plotly.toImage(plotDiv, {
                format: 'png',
                width: 1200,
                height: 800,
                scale: 2
            });
            return dataUrl;
        }
        return null;
    } catch {
        return null;
    }
}

export const exportService = {
    async exportToPDF(elementId: string, filename: string = 'dashboard') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with id ${elementId} not found`);
            return;
        }

        try {
            // First, try to capture each Plotly chart individually for best quality
            const plotDivs = element.querySelectorAll('.js-plotly-plot');
            let capturedImages: string[] = [];

            for (const plotDiv of Array.from(plotDivs)) {
                const img = await exportPlotlyChartAsImage(plotDiv as HTMLElement);
                if (img) capturedImages.push(img);
            }

            // If we captured Plotly charts, create PDF from them
            if (capturedImages.length > 0) {
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: 'a4'
                });

                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();

                for (let i = 0; i < capturedImages.length; i++) {
                    if (i > 0) pdf.addPage();

                    const img = new Image();
                    img.src = capturedImages[i];
                    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

                    // Scale image to fit page while maintaining aspect ratio
                    const ratio = Math.min(pageWidth / img.width, pageHeight / img.height) * 0.9;
                    const w = img.width * ratio;
                    const h = img.height * ratio;
                    const x = (pageWidth - w) / 2;
                    const y = (pageHeight - h) / 2;

                    pdf.addImage(capturedImages[i], 'PNG', x, y, w, h);
                }

                pdf.save(`${filename}.pdf`);
                return;
            }

            // Fallback: capture the full element with html2canvas
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#f3f4f6',
                allowTaint: true,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            } as any);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${filename}.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
        }
    },

    async exportToPNG(elementId: string, filename: string = 'dashboard') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with id ${elementId} not found`);
            return;
        }

        try {
            // Try Plotly's built-in export first for chart accuracy
            const plotDivs = element.querySelectorAll('.js-plotly-plot');

            if (plotDivs.length === 1) {
                // Single chart - export it directly
                const img = await exportPlotlyChartAsImage(plotDivs[0] as HTMLElement);
                if (img) {
                    const link = document.createElement('a');
                    link.download = `${filename}.png`;
                    link.href = img;
                    link.click();
                    return;
                }
            } else if (plotDivs.length > 1) {
                // Multiple charts - capture each and combine on a canvas
                const images: HTMLImageElement[] = [];
                for (const plotDiv of Array.from(plotDivs)) {
                    const imgData = await exportPlotlyChartAsImage(plotDiv as HTMLElement);
                    if (imgData) {
                        const img = new Image();
                        img.src = imgData;
                        await new Promise<void>((resolve) => { img.onload = () => resolve(); });
                        images.push(img);
                    }
                }

                if (images.length > 0) {
                    const padding = 20;
                    const chartWidth = 1200;
                    const chartHeight = 800;
                    const cols = Math.min(images.length, 2);
                    const rows = Math.ceil(images.length / cols);

                    const totalWidth = cols * chartWidth + (cols + 1) * padding;
                    const totalHeight = rows * chartHeight + (rows + 1) * padding;

                    const combinedCanvas = document.createElement('canvas');
                    combinedCanvas.width = totalWidth;
                    combinedCanvas.height = totalHeight;
                    const ctx = combinedCanvas.getContext('2d')!;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, totalWidth, totalHeight);

                    images.forEach((img, i) => {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        const x = padding + col * (chartWidth + padding);
                        const y = padding + row * (chartHeight + padding);
                        ctx.drawImage(img, x, y, chartWidth, chartHeight);
                    });

                    const link = document.createElement('a');
                    link.download = `${filename}.png`;
                    link.href = combinedCanvas.toDataURL('image/png');
                    link.click();
                    return;
                }
            }

            // Fallback: html2canvas
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                allowTaint: true,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            } as any);

            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('PNG export failed:', error);
        }
    }
};
