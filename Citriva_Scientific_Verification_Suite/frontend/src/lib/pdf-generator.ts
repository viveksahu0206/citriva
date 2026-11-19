import type { ClaimVerification, DocumentRecord, ReviewEntry } from '@/types/verification';
import { VERDICT_META } from './utils';

type ReviewLookup = (claimId: string) => ReviewEntry | undefined;

/**
 * Generates an auditable, academic-grade PDF 1.4 binary document
 * formatted specifically for scholarly peer review and research audit committees.
 * Strictly outputs application/pdf binary stream.
 */
export function generateAcademicPdfBlob(
  doc: DocumentRecord,
  lookup?: ReviewLookup,
): Blob {
  const title = doc.title || 'Scholarly Claim Verification Audit Report';
  const claims = doc.items || [];
  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate summary counts
  const total = claims.length;
  const supported = claims.filter((c) => c.verdict_status === 'SUPPORTED').length;
  const partial = claims.filter((c) => c.verdict_status === 'PARTIALLY_SUPPORTED').length;
  const unsupported = claims.filter((c) => c.verdict_status === 'UNSUPPORTED').length;
  const contradictory = claims.filter((c) => c.verdict_status === 'CONTRADICTORY').length;
  const outdated = claims.filter((c) => c.verdict_status === 'POTENTIALLY_OUTDATED').length;
  const needsReview = claims.filter((c) => c.needs_human_review).length;
  const avgConf = total > 0 ? Math.round((claims.reduce((s, c) => s + c.confidence, 0) / total) * 100) : 0;

  // Build clean text-based PDF streams
  const escapePdf = (str: string): string => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E\t\n\r]/g, ' '); // sanitize non-ascii
  };

  const wrapText = (text: string, maxCharsPerLine: number = 85): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const w of words) {
      if (!currentLine) {
        currentLine = w;
      } else if ((currentLine + ' ' + w).length <= maxCharsPerLine) {
        currentLine += ' ' + w;
      } else {
        lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Build page contents
  const pages: string[] = [];
  let currentOps: string[] = [];
  let y = 730; // standard letter page height 792 pt, 1 inch margins

  const pushOp = (op: string) => currentOps.push(op);

  const newPage = (pageNumber: number) => {
    if (currentOps.length > 0) {
      // Add page footer
      currentOps.push('BT /F1 8 Tf 54 36 Td (Citriva Verification Engine - Page ' + (pages.length + 1) + ') Tj ET');
      currentOps.push('BT /F1 8 Tf 420 36 Td (CONFIDENTIAL AUDIT REPORT) Tj ET');
      pages.push(currentOps.join('\n'));
    }
    currentOps = [];
    y = 730;

    // Header banner on every page
    currentOps.push('0.1 0.4 0.8 rg 54 750 504 1.5 re f');
    currentOps.push('BT /F2 9 Tf 0.2 0.3 0.4 rg 54 756 Td (CITRIVA | SCIENTIFIC CLAIM & CITATION VERIFICATION SUITE) Tj ET');
  };

  // Start page 1
  newPage(1);

  // Document Title
  currentOps.push(`BT /F2 18 Tf 0.05 0.1 0.2 rg 54 ${y} Td (${escapePdf(title.slice(0, 50))}) Tj ET`);
  y -= 22;

  // Subtitle & Metadata
  currentOps.push(`BT /F1 9 Tf 0.3 0.4 0.5 rg 54 ${y} Td (Audit Generated: ${generatedDate} | Document ID: ${escapePdf(doc.id)}) Tj ET`);
  y -= 16;
  currentOps.push(`BT /F1 8 Tf 0.4 0.4 0.4 rg 54 ${y} Td (Disclaimer: Automated verification assists human scholarly review and does not constitute a final academic judgment.) Tj ET`);
  y -= 26;

  // KPI Scorecard Box
  currentOps.push(`0.95 0.97 1.0 rg 54 ${y - 45} 504 55 re f`);
  currentOps.push(`0.7 0.8 0.95 RG 0.7 w 54 ${y - 45} 504 55 re s`);

  currentOps.push(`BT /F2 11 Tf 0.1 0.25 0.5 rg 66 ${y - 12} Td (VERIFICATION INTEGRITY METRICS) Tj ET`);
  currentOps.push(`BT /F1 9 Tf 0.15 0.2 0.3 rg 66 ${y - 28} Td (Total Claims: ${total}   |   Supported: ${supported}   |   Partially Supported: ${partial}   |   Unsupported: ${unsupported}) Tj ET`);
  currentOps.push(`BT /F1 9 Tf 0.15 0.2 0.3 rg 66 ${y - 40} Td (Contradictory: ${contradictory}   |   Potentially Outdated: ${outdated}   |   Needs Human Review: ${needsReview}   |   Avg Confidence: ${avgConf}%) Tj ET`);
  y -= 65;

  // Render Each Claim
  claims.forEach((claim, index) => {
    const claimReview = lookup ? lookup(claim.id) : undefined;
    const meta = VERDICT_META[claim.verdict_status] || { label: claim.verdict_status };

    // Estimate height needed for this claim block (~130pt)
    if (y < 160) {
      newPage(pages.length + 1);
    }

    // Claim Header bar
    currentOps.push(`0.94 0.96 0.98 rg 54 ${y - 18} 504 20 re f`);
    currentOps.push(`0.8 0.85 0.9 RG 0.5 w 54 ${y - 18} 504 20 re s`);
    currentOps.push(`BT /F2 10 Tf 0.1 0.2 0.35 rg 62 ${y - 13} Td (CLAIM #${index + 1} - VERDICT: ${meta.label.toUpperCase()} [Confidence: ${Math.round(claim.confidence * 100)}%]) Tj ET`);
    if (claim.needs_human_review) {
      currentOps.push(`BT /F2 8 Tf 0.7 0.2 0.2 rg 420 ${y - 13} Td ([FLAGGED FOR REVIEW]) Tj ET`);
    }
    y -= 30;

    // Claim Text
    currentOps.push(`BT /F2 9 Tf 0.15 0.15 0.15 rg 62 ${y} Td (Claim in Manuscript:) Tj ET`);
    y -= 12;
    const claimLines = wrapText(claim.claim_text, 80);
    claimLines.forEach((line) => {
      currentOps.push(`BT /F1 9 Tf 0.2 0.2 0.2 rg 62 ${y} Td (${escapePdf(line)}) Tj ET`);
      y -= 11;
    });
    y -= 4;

    // Citation & Source
    currentOps.push(`BT /F2 8.5 Tf 0.2 0.3 0.4 rg 62 ${y} Td (Cited Reference: ${escapePdf(claim.raw_citation)}) Tj ET`);
    y -= 11;
    const paperTitle = claim.source_paper?.title || 'Unknown Title';
    const paperYear = claim.source_paper?.year ? ` (${claim.source_paper.year})` : '';
    const paperDoi = claim.source_paper?.doi ? ` [DOI: ${claim.source_paper.doi}]` : '';
    const sourceSummary = `${paperTitle}${paperYear}${paperDoi}`;
    const sourceLines = wrapText(sourceSummary, 85);
    sourceLines.forEach((line) => {
      currentOps.push(`BT /F1 8 Tf 0.3 0.35 0.4 rg 62 ${y} Td (${escapePdf(line)}) Tj ET`);
      y -= 10;
    });
    y -= 4;

    // Verbatim Evidence Quote
    currentOps.push(`BT /F2 8.5 Tf 0.1 0.4 0.25 rg 62 ${y} Td (Verbatim Retrieved Evidence Quote:) Tj ET`);
    y -= 11;
    const quoteLines = wrapText(`"${claim.evidence_quote}"`, 80);
    quoteLines.forEach((line) => {
      currentOps.push(`BT /F3 8 Tf 0.1 0.3 0.2 rg 66 ${y} Td (${escapePdf(line)}) Tj ET`);
      y -= 10;
    });
    y -= 4;

    // Analytical Explanation
    currentOps.push(`BT /F2 8.5 Tf 0.2 0.25 0.3 rg 62 ${y} Td (Verification Analysis:) Tj ET`);
    y -= 11;
    const explanationLines = wrapText(claim.explanation, 82);
    explanationLines.forEach((line) => {
      currentOps.push(`BT /F1 8 Tf 0.25 0.25 0.25 rg 62 ${y} Td (${escapePdf(line)}) Tj ET`);
      y -= 10;
    });

    // Innovation notes (Overclaim, Research Gap, Evidence Trace)
    if (claim.overclaim_detected && claim.overclaim_explanation) {
      y -= 2;
      currentOps.push(`BT /F2 8 Tf 0.8 0.3 0.1 rg 62 ${y} Td (Overclaim Warning: ${escapePdf(claim.overclaim_explanation.slice(0, 85))}) Tj ET`);
      y -= 10;
    }
    if (claim.research_gap) {
      y -= 2;
      currentOps.push(`BT /F2 8 Tf 0.6 0.4 0.1 rg 62 ${y} Td (Research Gap: ${escapePdf(claim.research_gap.slice(0, 85))}) Tj ET`);
      y -= 10;
    }

    if (claimReview?.reviewed) {
      y -= 2;
      currentOps.push(`BT /F2 8 Tf 0.1 0.5 0.3 rg 62 ${y} Td ([X] Auditor Verified - Reviewer Note: ${escapePdf((claimReview.note || 'Confirmed').slice(0, 75))}) Tj ET`);
      y -= 10;
    }

    // Divider line between claims
    y -= 14;
    currentOps.push(`0.85 0.88 0.92 RG 0.5 w 54 ${y + 6} 504 0.5 re s`);
    y -= 10;
  });

  // Finalize last page
  if (currentOps.length > 0) {
    currentOps.push('BT /F1 8 Tf 54 36 Td (Citriva Verification Engine - Page ' + (pages.length + 1) + ') Tj ET');
    currentOps.push('BT /F1 8 Tf 420 36 Td (CONFIDENTIAL AUDIT REPORT) Tj ET');
    pages.push(currentOps.join('\n'));
  }

  // Construct PDF structure
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  let objCount = 1;

  // Obj 1: Catalog
  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  objCount++;

  // Obj 2: Pages tree
  const pageObjIds: number[] = [];
  // Fonts will be objects 3, 4, 5
  // F1 = Helvetica (regular)
  // F2 = Helvetica-Bold
  // F3 = Courier-Oblique
  const fontRegularId = 3;
  const fontBoldId = 4;
  const fontCourierId = 5;

  let currentObjId = 6;
  const pageStreamPairs: Array<{ pageId: number; streamId: number }> = [];

  for (let i = 0; i < pages.length; i++) {
    const pageId = currentObjId++;
    const streamId = currentObjId++;
    pageObjIds.push(pageId);
    pageStreamPairs.push({ pageId, streamId });
  }

  // Write Pages Object (Obj 2)
  offsets.push(pdf.length);
  pdf += `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`;

  // Write Standard Fonts
  offsets.push(pdf.length);
  pdf += `${fontRegularId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  offsets.push(pdf.length);
  pdf += `${fontBoldId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  offsets.push(pdf.length);
  pdf += `${fontCourierId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Oblique >>\nendobj\n`;

  // Write Page and Stream Objects
  for (let i = 0; i < pages.length; i++) {
    const pair = pageStreamPairs[i];
    const streamContent = pages[i];
    const streamBytes = unescape(encodeURIComponent(streamContent)).length;

    // Page object
    offsets.push(pdf.length);
    pdf += `${pair.pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${pair.streamId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontCourierId} 0 R >> >> >>\nendobj\n`;

    // Stream object
    offsets.push(pdf.length);
    pdf += `${pair.streamId} 0 obj\n<< /Length ${streamBytes} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  }

  // Cross-reference table
  const startXref = pdf.length;
  pdf += `xref\n0 ${currentObjId}\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    const offsetStr = String(offsets[i]).padStart(10, '0');
    pdf += `${offsetStr} 00000 n \n`;
  }

  // Trailer
  pdf += `trailer\n<< /Size ${currentObjId} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return new Blob([pdf], { type: 'application/pdf' });
}
