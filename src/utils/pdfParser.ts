
import { toast } from "sonner";

export const extractResumeText = async (file: File): Promise<string> => {
    try {
        toast.info("Reading resume content...");
        const arrayBuffer = await file.arrayBuffer();

        // Dynamic import for pdfjs
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();

        // Validation: Check for PDF magic bytes
        const header = new TextDecoder().decode(arrayBuffer.slice(0, 5));
        if (header !== '%PDF-' && !header.startsWith('%PDF')) {
            throw new Error("Invalid PDF file. Please use 'Export to PDF' or 'Print to PDF' instead of renaming the file extension.");
        }

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let resumeText = '';
        const uniqueUrls = new Set<string>(); // To store strictly unique URLs
        for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            let lastY = -1;
            let lastX = -1;
            let lastWidth = 0;
            let pageText = '';

            // Sort items by Y (descending) then X (ascending) to ensure reading order
            const items = textContent.items.map((item: any) => ({
                str: item.str,
                y: item.transform[5],
                x: item.transform[4],
                width: item.width,
                height: item.height || 0
            })).sort((a: any, b: any) => {
                if (Math.abs(a.y - b.y) > 5) return b.y - a.y; // Different lines
                return a.x - b.x; // Same line
            });

            for (const item of items) {
                if (lastY !== -1 && Math.abs(item.y - lastY) > 5) {
                    pageText += '\n';
                    lastX = -1; // Reset X tracking on new line
                } else if (lastX !== -1) {
                    // Calculate horizontal gap
                    const gap = item.x - (lastX + lastWidth);
                    // If gap is significant (e.g., > 10% of font size approx, or just > 2-3 units), add space.
                    // PDF units are usually 1/72 inch. A space char width varies.
                    // A safe heuristic is usually around 2-4 units depending on font size, but checking for > 0 is risky due to kerning.
                    // We'll use a threshold of 3.5 which is conservative for normal text. 
                    if (gap > 3.5) {
                        if (!pageText.endsWith(' ') && !item.str.startsWith(' ')) {
                            pageText += ' ';
                        }
                    }
                }
                pageText += item.str;
                lastY = item.y;
                lastX = item.x;
                lastWidth = item.width;
            }
            resumeText += pageText + '\n';

            // Extract annotations (links)
            const annotations = await page.getAnnotations();
            annotations
                .filter((a: any) => a.subtype === 'Link' && a.url)
                .map((a: any) => a.url)
                .forEach((url: string) => uniqueUrls.add(url)); // Add to set for uniqueness
        }

        // Append strictly unique URLs after processing all pages
        if (uniqueUrls.size > 0) {
            resumeText += '\n--- Extracted Links ---\n';
            uniqueUrls.forEach(url => {
                resumeText += url + '\n';
            });
        }

        // Improve formatting: preserve newlines but collapse multiple spaces
        resumeText = resumeText
            .replace(/  +/g, ' ') // Collapse multiple spaces to single space
            .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines to double newline
            .trim()
            .substring(0, 15000); // Increased limit significantly
        console.log("Extracted resume text length:", resumeText.length);

        // OCR Fallback if text is insufficient
        if (resumeText.length < 50) {
            toast.info("No text layer found. Attempting OCR on image...", { duration: 5000 });
            console.log("Starting OCR fallback...");

            // Dynamic import Tesseract
            const Tesseract = await import('tesseract.js');

            let ocrText = '';
            for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    const renderContext: any = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    await page.render(renderContext).promise;
                    const { data: { text } } = await Tesseract.default.recognize(canvas, 'eng');
                    ocrText += text + '\n';
                    toast.info(`Scanned page ${i}/${Math.min(pdf.numPages, 3)}...`);
                }
            }

            // Improve formatting for OCR text as well
            resumeText = ocrText
                .replace(/  +/g, ' ')
                .replace(/\n\s*\n/g, '\n\n')
                .trim()
                .substring(0, 15000);
            console.log("OCR extracted text length:", resumeText.length);

            if (resumeText.length < 50) {
                throw new Error("Could not extract readable text even with OCR. Please upload a clearer PDF or a text-based document.");
            }
        }

        return resumeText;
    } catch (error: any) {
        console.error("Error extracting text from PDF:", error);
        throw error;
    }
};
