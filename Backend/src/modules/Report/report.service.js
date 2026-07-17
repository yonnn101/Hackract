import PDFDocument from 'pdfkit';
import prisma from '../../database/prismaClient.js';
import fs from 'fs';
import path from 'path';

async function downloadImageHelper(url) {
  // Check if it's a local upload
  const match = url.match(/uploads\/([^\s\/?#]+)/);
  if (match) {
    const filename = match[1];
    const localPath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (fs.existsSync(localPath)) {
      try {
        const buffer = fs.readFileSync(localPath);
        return { buffer, url };
      } catch (err) {
        console.error(`Failed to read local file ${localPath}:`, err);
      }
    }
  }

  // Otherwise fetch it
  try {
    const res = await fetch(url);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        const arrayBuffer = await res.arrayBuffer();
        return { buffer: Buffer.from(arrayBuffer), url };
      }
    }
  } catch (err) {
    console.error(`Failed to fetch remote image from ${url}:`, err);
  }
  return null;
}

// ── Color palette ──────────────────────────────────────────────────────────────
const C = {
  bg:          '#0a0a0a',
  surface:     '#141518',
  border:      '#2a2b30',
  white:       '#ffffff',
  textMain:    '#d1d5db',
  textMuted:   '#6b7280',
  accent:      '#00c477',
  critical:    '#ef4444',
  high:        '#f97316',
  medium:      '#eab308',
  low:         '#3b82f6',
  info:        '#6b7280',
};

const SEVERITY_COLOR = {
  CRITICAL: C.critical,
  HIGH:     C.high,
  MEDIUM:   C.medium,
  LOW:      C.low,
  INFO:     C.info,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function drawHRule(doc, { y, color = C.border, width = 1 } = {}) {
  const pageY = y ?? doc.y;
  doc
    .moveTo(doc.page.margins.left, pageY)
    .lineTo(doc.page.width - doc.page.margins.right, pageY)
    .lineWidth(width)
    .strokeColor(color)
    .stroke();
}

function sectionTitle(doc, text) {
  doc.x = doc.page.margins.left; // Reset text pointer to left margin
  doc.moveDown(0.5);
  doc
    .fontSize(14)
    .fillColor(C.white)
    .font('Helvetica-Bold')
    .text(text.toUpperCase(), { characterSpacing: 2 });
  drawHRule(doc, { y: doc.y , color: C.accent, width: 1.5 });
  doc.moveDown(1.5);
}

function bodyText(doc, text) {
  doc.x = doc.page.margins.left; // Reset text pointer to left margin
  doc
    .fontSize(10)
    .fillColor(C.textMain)
    .font('Helvetica')
    .text(text, { align: 'justify', lineGap: 3 });
}

function label(doc, key, value, x) {
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(C.textMuted)
    .text(key, x, doc.y, { continued: true })
    .font('Helvetica')
    .fillColor(C.textMain)
    .text('  ' + (value || '—'));
}

function addFooter(doc, pageNum, totalPages) {
  if (pageNum === 1) return; // Skip cover page

  const y = doc.page.height - 40;
  const left  = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;

  // Draw header accent line (neon green) at the top of content
  doc.save();
  doc.rect(left, 30, right - left, 2).fill(C.accent);
  doc.restore();

  doc
    .fontSize(8)
    .fillColor(C.textMuted)
    .font('Helvetica-Bold');

  drawHRule(doc, { y: y - 8, color: C.border });

  doc.text('HACKRACT SENTINEL PROTOCOL  ·  CONFIDENTIAL', left, y, {
    align: 'left',
    lineBreak: false,
    width: (right - left) / 2,
    characterSpacing: 1
  });

  doc.text(`PAGE ${pageNum} // ${totalPages}`, left, y, {
    align: 'right',
    lineBreak: false,
    width: right - left,
    characterSpacing: 1
  });
}

function fillPageBackground(doc) {
  // Fill the entire page with the dark background color
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.bg);
  doc.restore();
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function generatePdfReport(projectId, modules = {}) {
  // ── 1. Fetch data ─────────────────────────────────────────────────────────
  const project = await prisma.pentest.findUnique({
    where: { id: projectId },
    include: {
      organization: { select: { name: true, slug: true } },
      leadPentester: { select: { fullName: true, email: true } },
      collaborators: {
        include: { user: { select: { fullName: true, handle: true, email: true } } },
      },
      findings: {
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        include: {
          reporter: { select: { fullName: true, handle: true } },
        },
      },
    },
  });

  if (!project) throw new Error('Project not found');

  const findings = project.findings || [];
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const counts = severityOrder.reduce((a, s) => {
    a[s] = findings.filter(f => f.severity === s).length;
    return a;
  }, {});

  const today = new Date().toISOString().replace('T', ' // ').substring(0, 19);
  const refId = projectId.split('-')[0].toUpperCase();
  const projectName = project.name || 'NEXUS_CORE';
  const orgName = project.organization?.name || 'QUANTUM_DYNAMICS_INTL';

  // ── 2. Build PDF ──────────────────────────────────────────────────────────
  const doc = new PDFDocument({
    size:    'A4',
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    info: {
      Title:    `Hackract Security Report – ${projectName}`,
      Author:   'Hackract Sentinel Protocol',
      Subject:  'Penetration Test Assessment Report',
      Keywords: 'security, pentest, vulnerability, assessment',
    },
    bufferPages: true,
  });

  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  // Fill background on every new page
  doc.on('pageAdded', () => {
    fillPageBackground(doc);
  });

  const pw = doc.page.width;
  const ph = doc.page.height;
  const ml = doc.page.margins.left;
  const mr = doc.page.margins.right;
  const contentW = pw - ml - mr;

  // Fill first page background manually since pageAdded already fired
  fillPageBackground(doc);

  // ── PAGE 1 — Cover ────────────────────────────────────────────────────────

  doc.y = 80;

  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor(C.accent)
    .text('HACKRACT', ml, doc.y, { characterSpacing: 4 });

  doc.moveDown(0.2);
  doc
    .fontSize(10)
    .fillColor(C.textMuted)
    .font('Courier')
    .text('SYNTHETIC_SENTINEL_V4.0', ml, doc.y, { characterSpacing: 2 });

  doc.y = 250;

  doc
    .fontSize(12)
    .fillColor(C.accent)
    .font('Helvetica-Bold')
    .text('PROJECT_MANIFEST', ml, doc.y, { characterSpacing: 2 });

  doc.moveDown(0.5);
  doc
    .font('Helvetica-Bold')
    .fontSize(42)
    .fillColor(C.white)
    .text(`${projectName.toUpperCase()}\nSECURITY_AUDIT`, ml, doc.y, {
      width: contentW,
      lineGap: 4,
    });

  // Vertical line block
  doc.y = ph - 160;
  doc.rect(ml, doc.y, 2, 80).fill(C.accent);

  doc
    .fontSize(9)
    .fillColor(C.textMuted)
    .font('Helvetica-Bold')
    .text('GENERATED_FOR', ml + 12, doc.y, { continued: true, characterSpacing: 1 })
    .fillColor(C.accent)
    .text('                 CONFIDENTIAL');

  doc.moveDown(0.4);
  doc
    .fontSize(14)
    .fillColor(C.white)
    .text(orgName.toUpperCase(), ml + 12, doc.y);

  doc.moveDown(1.5);
  doc
    .fontSize(9)
    .fillColor(C.textMuted)
    .text('DATE_ISSUED', ml + 12, doc.y, { characterSpacing: 1 });

  doc.moveDown(0.2);
  doc
    .fontSize(11)
    .fillColor(C.textMain)
    .font('Courier')
    .text(today, ml + 12, doc.y);

  // ── PAGE 2+ — Dynamic Modules ─────────────────────────────────────────────

  // Executive Summary
  if (modules.execSummary !== false) {
    doc.addPage();
    sectionTitle(doc, '1. Executive Summary');

    bodyText(
      doc,
      `The security assessment for "${projectName}" was conducted on behalf of ` +
      `${orgName}. ` +
      `A total of ${findings.length} unique vulnerabilities were identified across the defined scope. ` +
      `This document provides a structured breakdown of each finding, their potential impact, ` +
      `and recommended remediation steps to reduce organizational risk exposure.`
    );

    doc.moveDown(1);

    // Severity grid
    doc
      .fontSize(10)
      .fillColor(C.white)
      .font('Helvetica-Bold')
      .text('Vulnerability Distribution by Severity', { characterSpacing: 1 });

    doc.moveDown(1);

    const boxW  = (contentW - 30) / 4;
    const boxH  = 70;
    const startX = ml;
    const startY = doc.y;

    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach((sev, i) => {
      const x = startX + i * (boxW + 10);
      const color = SEVERITY_COLOR[sev];

      doc.rect(x, startY, boxW, boxH).fillAndStroke(C.surface, C.border);
      doc.rect(x, startY, 4, boxH).fill(color);

      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .fillColor(color)
        .text(String(counts[sev] || 0), x + 16, startY + 12, { width: boxW - 20 });

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(C.textMuted)
        .text(sev, x + 16, startY + 50, { width: boxW - 20, characterSpacing: 1 });
    });

    doc.y = startY + boxH + 30;
    doc.x = ml; // Reset text pointer to left margin
  }

  // Technical Scope
  if (modules.techScope !== false) {
    if (!modules.execSummary) doc.addPage();

    sectionTitle(doc, '2. Technical Scope');

    bodyText(doc, 'The following assets were authorized and included in the scope of this security audit. Any asset not explicitly listed here was considered out of bounds and was not tested.');

    doc.moveDown(1);

    if (project.targetDomains?.length) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white).text('Authorized Domains:', { characterSpacing: 1 });
      doc.moveDown(0.5);
      project.targetDomains.slice(0, 3).forEach(d => {
        doc.fontSize(10).font('Courier').fillColor(C.accent).text(`> ${d}`);
      });
      if (project.targetDomains.length > 3) {
        doc.fontSize(9).font('Courier').fillColor(C.textMuted).text(`> ... and ${project.targetDomains.length - 3} other target domains`);
      }
      doc.moveDown(1);
    }

    if (project.ipRanges?.length) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white).text('Authorized IP Ranges:', { characterSpacing: 1 });
      doc.moveDown(0.5);
      project.ipRanges.slice(0, 3).forEach(ip => {
        doc.fontSize(10).font('Courier').fillColor(C.accent).text(`> ${ip}`);
      });
      if (project.ipRanges.length > 3) {
        doc.fontSize(9).font('Courier').fillColor(C.textMuted).text(`> ... and ${project.ipRanges.length - 3} other network ranges`);
      }
      doc.moveDown(1);
    }

    if (project.excludedAssets) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.critical).text('Strict Exclusions:', { characterSpacing: 1 });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor(C.textMain).text(project.excludedAssets);
      doc.moveDown(1);
    }

    if (!project.targetDomains?.length && !project.ipRanges?.length) {
      doc.fontSize(10).font('Courier').fillColor(C.textMuted).text('No specific technical scope parameters were defined for this project.');
    }
  }

  // Vulnerability Matrix
  if (modules.vulnMatrix !== false) {
    doc.addPage();
    sectionTitle(doc, '3. Vulnerability Matrix');

    if (findings.length === 0) {
      doc
        .fontSize(10)
        .fillColor(C.textMuted)
        .font('Courier')
        .text('> NO VULNERABILITIES DETECTED IN THIS ASSESSMENT.', { align: 'center' });
    } else {
      // Table header
      const cols = {
        id:     { x: ml,         w: 50  },
        sev:    { x: ml + 50,    w: 60  },
        title:  { x: ml + 110,   w: 220 },
        asset:  { x: ml + 330,   w: 100 },
        cvss:   { x: ml + 430,   w: 50  },
      };
      const rowH = 28;
      let headerY = doc.y;

      doc.rect(ml, headerY, contentW, rowH).fill(C.surface);

      doc.moveTo(ml, headerY + rowH).lineTo(ml + contentW, headerY + rowH).lineWidth(1).strokeColor(C.border).stroke();

      Object.entries({
        'ID': cols.id,
        'SEVERITY': cols.sev,
        'VULNERABILITY': cols.title,
        'ASSET': cols.asset,
        'CVSS': cols.cvss,
      }).forEach(([text, col]) => {
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(C.textMuted)
          .text(text, col.x + 8, headerY + 10, { width: col.w - 16, characterSpacing: 1 });
      });

      doc.y = headerY + rowH;

      const sorted = [...findings].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
      const displayFindings = sorted.slice(0, 12);
      const remainingCount = sorted.length - displayFindings.length;

      displayFindings.forEach((f, idx) => {
        const rowY = doc.y;
        const bg = idx % 2 === 0 ? C.bg : C.surface;
        doc.rect(ml, rowY, contentW, rowH).fill(bg);

        // ID
        doc.fontSize(8).font('Courier-Bold').fillColor(C.accent).text(`RX-${String(idx+1).padStart(3, '0')}`, cols.id.x + 8, rowY + 10);

        // Severity
        const sColor = SEVERITY_COLOR[f.severity] || C.info;
        doc.fontSize(8).font('Helvetica-Bold').fillColor(sColor).text(f.severity || '—', cols.sev.x + 8, rowY + 10);

        // Title
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.textMain).text(f.title || '—', cols.title.x + 8, rowY + 9, { width: cols.title.w - 16, lineBreak: false, ellipsis: true });

        // Asset
        doc.fontSize(8).font('Courier').fillColor(C.textMuted).text(f.affectedAsset || '—', cols.asset.x + 8, rowY + 10, { width: cols.asset.w - 16, lineBreak: false, ellipsis: true });

        // CVSS
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white).text(f.cvssScore != null ? Number(f.cvssScore).toFixed(1) : '—', cols.cvss.x + 8, rowY + 9);

        doc.moveTo(ml, rowY + rowH).lineTo(ml + contentW, rowY + rowH).lineWidth(0.5).strokeColor(C.border).stroke();
        doc.y = rowY + rowH;
      });

      if (remainingCount > 0) {
        const rowY = doc.y;
        doc.rect(ml, rowY, contentW, rowH).fill(C.surface);
        
        doc.fontSize(8).font('Courier-Bold').fillColor(C.textMuted).text(`RX-OVR`, cols.id.x + 8, rowY + 10);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(C.info).text('INFO', cols.sev.x + 8, rowY + 10);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.accent).text(`... AND ${remainingCount} MORE ACTIVE FINDINGS IN PORTAL DATABASE`, cols.title.x + 8, rowY + 9, { width: cols.title.w - 16, lineBreak: false, ellipsis: true });
        doc.fontSize(8).font('Courier').fillColor(C.textMuted).text('portal.hackract.com', cols.asset.x + 8, rowY + 10, { width: cols.asset.w - 16, lineBreak: false, ellipsis: true });
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white).text('—', cols.cvss.x + 8, rowY + 9);

        doc.moveTo(ml, rowY + rowH).lineTo(ml + contentW, rowY + rowH).lineWidth(0.5).strokeColor(C.border).stroke();
        doc.y = rowY + rowH;
      }
      doc.x = ml; // Reset X pointer to left margin
    }
  }

  // Detailed Findings + Remediation Roadmap
  if (modules.remedPath !== false) {
    doc.addPage();
    sectionTitle(doc, '4. Remediation Roadmap');

    if (findings.length === 0) {
      doc.y += 40;
      doc
        .fontSize(10)
        .fillColor(C.textMuted)
        .font('Courier')
        .text('> NO VULNERABILITIES DETECTED. SYSTEM ROADMAP SECURED.', { align: 'center' });
    } else {
      const displayRoadmap = findings.slice(0, 2);
      const remainingRoadmap = findings.length - displayRoadmap.length;

      for (let idx = 0; idx < displayRoadmap.length; idx++) {
        const f = displayRoadmap[idx];
        const sevColor = SEVERITY_COLOR[f.severity] || C.info;

        doc.rect(ml, doc.y, contentW, 36).fill(C.surface);
        doc.rect(ml, doc.y, 4, 36).fill(sevColor);

        doc.fontSize(8).font('Courier-Bold').fillColor(C.textMuted).text(`RX-${String(idx+1).padStart(3, '0')}`, ml + 16, doc.y + 8);
        doc.fontSize(12).font('Helvetica-Bold').fillColor(C.white).text(f.title, ml + 16, doc.y + 18, { width: contentW - 100 });

        doc.fontSize(9).font('Helvetica-Bold').fillColor(sevColor).text(f.severity, ml + contentW - 80, doc.y - 20, { width: 64, align: 'right', characterSpacing: 1 });

        doc.moveDown(1.5);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.textMuted).text('AFFECTED ASSET: ', ml, doc.y, { continued: true })
           .font('Courier').fillColor(C.accent).text(f.affectedAsset || 'Not specified', { continued: true })
           .font('Helvetica-Bold').fillColor(C.textMuted).text('    CVSS: ', { continued: true })
           .font('Helvetica-Bold').fillColor(C.white).text(f.cvssScore != null ? Number(f.cvssScore).toFixed(1) : 'N/A');

        doc.moveDown(1);

        let desc = f.description || 'No description provided.';
        let impactText = '';
        
        if (desc.includes('### Severity & Impact')) {
          const parts = desc.split('### Severity & Impact');
          desc = parts[0].replace('### Description', '').trim();
          impactText = parts[1].trim();
        } else if (desc.includes('### Impact')) {
          const parts = desc.split('### Impact');
          desc = parts[0].replace('### Description', '').trim();
          impactText = parts[1].trim();
        }

        doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white).text('Technical Description', { characterSpacing: 1 });
        doc.moveDown(0.5);
        bodyText(doc, desc);

        if (impactText) {
          doc.moveDown(1);
          doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white).text('Severity & Business Impact', { characterSpacing: 1 });
          doc.moveDown(0.5);
          bodyText(doc, impactText);
        }

        if (f.proof) {
          let proofText = f.proof;
          try {
            const parsedProof = JSON.parse(f.proof);
            if (Array.isArray(parsedProof)) {
              proofText = parsedProof.join('\n');
            }
          } catch (e) {
            // Treat as raw text
          }
          if (proofText.trim()) {
            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white).text('Evidence / Proof', { characterSpacing: 1 });
            doc.moveDown(0.5);

            // Extract all image/URL items
            const imgRegex = /(data:image\/[a-zA-Z+\-\/]+;base64,[^\s]+|https?:\/\/[^\s]+)/gi;
            const matches = proofText.match(imgRegex) || [];
            
            // Clean up the text by removing the matched URLs/data URIs
            let cleanText = proofText;
            matches.forEach(m => {
              cleanText = cleanText.replace(m, '');
            });
            cleanText = cleanText.replace(/\n\s*\n/g, '\n').trim(); // clean extra newlines

            if (cleanText) {
              bodyText(doc, cleanText);
              doc.moveDown(0.5);
            }

            // Render each image match
            for (const match of matches) {
              let imgInfo = null;
              if (match.startsWith('data:')) {
                // Parse base64
                const dataMatch = match.match(/^data:(image\/[a-zA-Z+\-\/]+);base64,(.+)$/i);
                if (dataMatch) {
                  imgInfo = {
                    buffer: Buffer.from(dataMatch[2], 'base64'),
                    url: 'base64 data'
                  };
                }
              } else {
                // Download URL
                imgInfo = await downloadImageHelper(match);
              }

              if (imgInfo && imgInfo.buffer) {
                try {
                  doc.moveDown(0.5);
                  // Ensure there is enough space on page or add page if needed
                  if (doc.y + 220 > doc.page.height - doc.page.margins.bottom) {
                    doc.addPage();
                  }
                  doc.image(imgInfo.buffer, {
                    fit: [contentW, 200],
                    align: 'center'
                  });
                  doc.moveDown(0.5);
                  doc.fontSize(8).font('Courier').fillColor(C.textMuted).text(`[Evidence Image: ${imgInfo.url.substring(0, 80)}]`, { align: 'center' });
                  doc.moveDown(0.5);
                } catch (imgErr) {
                  console.error("Failed to render image in PDF:", imgErr);
                  // Fallback: print URL/text since rendering failed
                  doc.fontSize(9).font('Courier').fillColor(C.critical).text(`[Failed to render image: ${match.substring(0, 60)}...]`);
                  doc.moveDown(0.5);
                }
              } else {
                // Not an image or failed to fetch, print it as text/link
                doc.fontSize(9).font('Courier').fillColor(C.accent).text(match);
                doc.moveDown(0.5);
              }
            }
          }
        }

        doc.moveDown(1);

        doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white).text('Remediation Instructions', { characterSpacing: 1 });
        doc.moveDown(0.5);
        if (f.remediation) {
          bodyText(doc, f.remediation);
        } else {
          doc.fontSize(9).font('Courier').fillColor(C.textMuted).text('> No specific remediation steps provided.');
        }

        doc.moveDown(2);
        drawHRule(doc, { color: C.border });
        doc.moveDown(1.5);
      }

      if (remainingRoadmap > 0) {
        doc.moveDown(0.5);
        const panelH = 45;
        doc.rect(ml, doc.y, contentW, panelH).fillAndStroke(C.surface, C.border);
        doc.rect(ml, doc.y, 4, panelH).fill(C.accent);

        doc
          .fontSize(9)
          .font('Courier-Bold')
          .fillColor(C.accent)
          .text(`[+] ${remainingRoadmap} MORE DETAILED SECURITY FINDINGS & PROOFS`, ml + 16, doc.y + 12);
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(C.textMain)
          .text(`These additional items are fully documented with exploit payloads in the secure online workspace.`, ml + 16, doc.y + 24);

        doc.y += panelH;
      }
    }
  }

  // ── Back-patch footers ───────────────────────────────────────────────────
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    addFooter(doc, i + 1, totalPages);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
