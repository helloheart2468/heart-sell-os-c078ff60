/** Branded Word + PDF document building, client side. */

export const BRAND = {
  pink: "F21882",
  ink: "222226",
  grey: "6B6B73",
};

export type DocBlock =
  | { type: "title"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "bullet"; text: string }
  | { type: "quote"; text: string }
  | { type: "rule" }
  | { type: "pagebreak" };

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(?!\s)(.+?)\*/g, "$1$2")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

/** Turn a section of agent markdown into printable blocks. */
export function markdownToBlocks(markdown: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", text: stripInline(paragraph.join(" ").trim()) });
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) {
      flush();
      blocks.push({ type: "h2", text: stripInline(line.replace(/^#{1,6}\s+/, "")) });
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      flush();
      blocks.push({ type: "bullet", text: stripInline(line.replace(/^\s*[-*•]\s+/, "")) });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flush();
      blocks.push({ type: "bullet", text: stripInline(line.trim()) });
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      blocks.push({ type: "quote", text: stripInline(line.replace(/^>\s?/, "")) });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue;
      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => stripInline(cell.trim()));
      blocks.push({ type: "bullet", text: cells.join("  ·  ") });
      continue;
    }
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

/* ---------------------------------- Word ---------------------------------- */

export async function downloadDocx(filename: string, blocks: DocBlock[]) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
    LevelFormat,
    PageBreak,
  } = await import("docx");

  const children = blocks.map((block) => {
    switch (block.type) {
      case "title":
        return new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { after: 160 },
          children: [new TextRun({ text: block.text, font: "Prata", size: 44, color: BRAND.pink })],
        });
      case "subtitle":
        return new Paragraph({
          spacing: { after: 320 },
          children: [new TextRun({ text: block.text, font: "Montserrat", size: 24, color: BRAND.grey })],
        });
      case "h2":
        return new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 140 },
          children: [new TextRun({ text: block.text, font: "Prata", size: 30, color: BRAND.ink })],
        });
      case "bullet":
        return new Paragraph({
          numbering: { reference: "hs-bullets", level: 0 },
          spacing: { after: 100 },
          children: [new TextRun({ text: block.text, font: "Montserrat", size: 22, color: BRAND.ink })],
        });
      case "quote":
        return new Paragraph({
          spacing: { before: 120, after: 160 },
          indent: { left: 360 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: BRAND.pink, space: 12 },
          },
          children: [new TextRun({ text: block.text, font: "Montserrat", size: 22, color: BRAND.ink })],
        });
      case "rule":
        return new Paragraph({
          spacing: { before: 200, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E6E0E2", space: 1 } },
          children: [new TextRun({ text: "", font: "Montserrat", size: 2 })],
        });
      case "pagebreak":
        return new Paragraph({ children: [new PageBreak()] });
      default:
        return new Paragraph({
          spacing: { after: 160, line: 300 },
          children: [new TextRun({ text: block.text, font: "Montserrat", size: 22, color: BRAND.ink })],
        });
    }
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: "Montserrat", size: 22 } } } },
    numbering: {
      config: [
        {
          reference: "hs-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(filename, blob);
}

/* ----------------------------------- PDF ---------------------------------- */

export async function downloadPdf(filename: string, blocks: DocBlock[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const margin = 64;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  let y = margin;

  const pink: [number, number, number] = [242, 24, 130];
  const ink: [number, number, number] = [34, 34, 38];
  const grey: [number, number, number] = [107, 107, 115];

  const ensureRoom = (needed: number) => {
    if (y + needed > bottom) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLines = (
    text: string,
    options: {
      size: number;
      font: [string, string];
      color: [number, number, number];
      leading: number;
      after: number;
      indent?: number;
    },
  ) => {
    doc.setFont(options.font[0], options.font[1]);
    doc.setFontSize(options.size);
    doc.setTextColor(...options.color);
    const indent = options.indent ?? 0;
    const lines = doc.splitTextToSize(text, width - indent) as string[];
    for (const line of lines) {
      ensureRoom(options.leading);
      doc.text(line, margin + indent, y);
      y += options.leading;
    }
    y += options.after;
  };

  for (const block of blocks) {
    switch (block.type) {
      case "title":
        ensureRoom(60);
        writeLines(block.text, { size: 26, font: ["times", "bold"], color: pink, leading: 32, after: 6 });
        break;
      case "subtitle":
        writeLines(block.text, { size: 11, font: ["helvetica", "normal"], color: grey, leading: 16, after: 14 });
        break;
      case "h2":
        ensureRoom(52);
        y += 10;
        writeLines(block.text, { size: 16, font: ["times", "bold"], color: ink, leading: 22, after: 8 });
        break;
      case "bullet": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...pink);
        ensureRoom(16);
        doc.text("•", margin + 4, y);
        writeLines(block.text, {
          size: 11,
          font: ["helvetica", "normal"],
          color: ink,
          leading: 16,
          after: 4,
          indent: 20,
        });
        break;
      }
      case "quote": {
        const lines = doc.splitTextToSize(block.text, width - 24) as string[];
        ensureRoom(lines.length * 16 + 12);
        const top = y - 12;
        doc.setDrawColor(...pink);
        doc.setLineWidth(2);
        doc.line(margin, top, margin, top + lines.length * 16 + 8);
        writeLines(block.text, {
          size: 11,
          font: ["helvetica", "italic"],
          color: ink,
          leading: 16,
          after: 10,
          indent: 16,
        });
        break;
      }
      case "rule":
        ensureRoom(18);
        doc.setDrawColor(230, 224, 226);
        doc.setLineWidth(1);
        doc.line(margin, y, margin + width, y);
        y += 18;
        break;
      case "pagebreak":
        doc.addPage();
        y = margin;
        break;
      default:
        writeLines(block.text, { size: 11, font: ["helvetica", "normal"], color: ink, leading: 16, after: 10 });
    }
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grey);
    doc.text(`${page} / ${pages}`, doc.internal.pageSize.getWidth() - margin, bottom + 28, {
      align: "right",
    });
  }

  triggerDownload(filename, doc.output("blob"));
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
