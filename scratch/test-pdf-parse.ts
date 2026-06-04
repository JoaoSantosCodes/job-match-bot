// @ts-ignore
import pdf from '../lib/db'; // Wait, let's import the actual pdf function
// @ts-ignore
import pdfParser from '../node_modules/pdf-parse/lib/pdf-parse.js';

async function test() {
  try {
    console.log('Testing pdf-parse library...');
    
    // A minimal valid PDF representation
    const minimalPdfBuffer = Buffer.from(
      '%PDF-1.4\n' +
      '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n' +
      '2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n' +
      '3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources <<>> /Contents 4 0 R>> endobj\n' +
      '4 0 obj <</Length 47>> stream\n' +
      'BT /F1 12 Tf 72 712 Td (Hello World) Tj ET\n' +
      'endstream\n' +
      'endobj\n' +
      'xref\n' +
      '0 5\n' +
      '0000000000 65535 f\n' +
      '0000000009 00000 n\n' +
      '0000000056 00000 n\n' +
      '0000000111 00000 n\n' +
      '0000000212 00000 n\n' +
      'trailer <</Size 5 /Root 1 0 R>>\n' +
      'startxref\n' +
      '310\n' +
      '%%EOF'
    );

    const result = await pdfParser(minimalPdfBuffer);
    console.log('Success! Extracted text:', JSON.stringify(result.text));
  } catch (error: any) {
    console.error('Error occurred during pdf-parse run:', error);
  }
}

test();
