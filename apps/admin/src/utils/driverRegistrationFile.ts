import type { Driver } from "../api";
import { displayPersonName } from "./personName";

export type DriverFileFormat = "pdf" | "docx" | "html";

export type DriverRegistrationFileData = {
  generatedAt: string;
  title: string;
  subtitle: string;
  sections: {
    title: string;
    fields: { label: string; value: string }[];
  }[];
};

export const driverFileFormats: {
  value: DriverFileFormat;
  label: string;
  extension: string;
}[] = [
  { value: "pdf", label: "PDF document", extension: ".pdf" },
  { value: "docx", label: "Microsoft Word", extension: ".docx" },
  { value: "html", label: "Web page", extension: ".html" },
];

export function createDriverRegistrationFileData(
  driver: Driver,
): DriverRegistrationFileData {
  const vehicle = driver.vehicles[0];
  return {
    generatedAt: new Date().toISOString(),
    title: "Driver registration file",
    subtitle: "Current record from the TriSafe LGU Driver Registry",
    sections: [
      {
        title: "Driver account and contact",
        fields: [
          { label: "Driver name", value: displayPersonName(driver.fullName) },
          {
            label: "Login identifier",
            value: driver.username ?? "Not assigned",
          },
          { label: "Mobile number", value: driver.phone ?? "Not recorded" },
          { label: "Account status", value: driver.accountStatus ?? "ACTIVE" },
          { label: "Driver ID", value: driver.id },
        ],
      },
      {
        title: "Owner and transport eligibility",
        fields: [
          {
            label: "Owner / organization leader",
            value: driver.owner
              ? `${driver.owner.lastName}, ${driver.owner.firstName}${driver.owner.middleName ? ` ${driver.owner.middleName}` : ""}`
              : "Not recorded",
          },
          { label: "Transport status", value: driver.verification },
        ],
      },
      {
        title: "Registered address",
        fields: [
          { label: "Purok", value: driver.address?.purok ?? "Not recorded" },
          {
            label: "Barangay",
            value: driver.address?.barangayName ?? "Not recorded",
          },
          {
            label: "Municipality / City",
            value: driver.address?.municipalityName ?? "Not recorded",
          },
          {
            label: "Province",
            value: driver.address?.provinceName ?? "Not recorded",
          },
        ],
      },
      {
        title: "Franchise details",
        fields: [
          {
            label: "Franchise number",
            value: driver.franchise?.franchiseNumber ?? "Not assigned",
          },
          {
            label: "Franchise issued",
            value: formatDate(driver.franchise?.issuedAt),
          },
          {
            label: "Franchise expiration",
            value: formatDate(driver.franchise?.expiresAt),
          },
          {
            label: "Franchise status",
            value: driver.franchise?.status ?? "Not assigned",
          },
        ],
      },
      {
        title: "Vehicle and QR identity",
        fields: [
          {
            label: "Plate number",
            value: vehicle?.plateNumber ?? "Not assigned",
          },
          {
            label: "Vehicle type",
            value: vehicle?.vehicleType?.replaceAll("_", " ") ?? "Not assigned",
          },
          {
            label:
              vehicle?.vehicleType === "HABAL_HABAL"
                ? "Permit number"
                : "Body number",
            value:
              vehicle?.permitNumber ?? vehicle?.bodyNumber ?? "Not assigned",
          },
          {
            label: "Engine number",
            value: vehicle?.engineNumber ?? "Not assigned",
          },
          {
            label: "Chassis number",
            value: vehicle?.chassisNumber ?? "Not assigned",
          },
          {
            label: "LGU QR status",
            value: vehicle?.qrCode?.token ? "Generated" : "Not generated",
          },
        ],
      },
    ],
  };
}

export function downloadDriverRegistrationFile(
  driver: Driver,
  format: DriverFileFormat,
) {
  const data = createDriverRegistrationFileData(driver);
  const baseName = `trisafe-driver-${safeFileName(driver.fullName)}`;
  const extension =
    driverFileFormats.find((item) => item.value === format)?.extension ??
    ".html";
  downloadBlob(
    createDriverRegistrationFileBlob(data, format),
    `${baseName}${extension}`,
  );
}

export function createDriverRegistrationFileBlob(
  data: DriverRegistrationFileData,
  format: DriverFileFormat,
) {
  if (format === "pdf") return createPdf(data);
  if (format === "docx") return createDocx(data);
  return new Blob([createHtml(data)], { type: "text/html;charset=utf-8" });
}

function createHtml(data: DriverRegistrationFileData) {
  const sections = data.sections
    .map(
      (section) => `
    <section><h2>${escapeHtml(section.title)}</h2><div class="grid">
      ${section.fields.map((field) => `<div class="row"><span>${escapeHtml(field.label)}</span><strong>${escapeHtml(field.value)}</strong></div>`).join("")}
    </div></section>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(data.title)}</title><style>body{margin:0;background:#f8f8f8;color:#202020;font-family:Arial,sans-serif}.page{max-width:760px;margin:32px auto;border-top:8px solid #337418;padding:40px;background:#fff;box-shadow:0 10px 35px #0001}.brand{color:#337418;font-size:13px;font-weight:800;letter-spacing:.12em}h1{margin:8px 0 4px;font-size:28px}.meta{color:#666;font-size:12px}.notice{margin:24px 0;padding:14px 16px;border-radius:8px;background:#eef8e9;color:#245b11;font-size:12px;line-height:1.5}section{margin-top:18px;border:1px solid #ddd}h2{margin:0;padding:10px 14px;color:#245b11;background:#eef8e9;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.grid{display:grid;grid-template-columns:1fr 1fr}.row{min-width:0;border-top:1px solid #eee;padding:12px 14px}.row:nth-child(odd){border-right:1px solid #eee}.row span{display:block;color:#777;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.row strong{display:block;margin-top:5px;font-size:13px;overflow-wrap:anywhere}.footer{margin-top:24px;border-top:1px solid #ddd;padding-top:14px;color:#777;font-size:10px;line-height:1.5}@media print{body{background:#fff}.page{margin:0;box-shadow:none}}@media(max-width:600px){.page{margin:0;padding:24px}.grid{grid-template-columns:1fr}.row:nth-child(odd){border-right:0}}</style></head><body><main class="page"><div class="brand">TRISAFE · LGU DRIVER REGISTRY</div><h1>${escapeHtml(data.title)}</h1><div class="meta">Generated ${escapeHtml(formatDateTime(data.generatedAt))} from live registry data</div><div class="notice"><strong>Current database record.</strong> Temporary passwords are intentionally excluded because TriSafe stores only secure password hashes.</div>${sections}<p class="footer">This document reflects the TriSafe record at the generation time shown above. Confirm current account and transport eligibility through the live LGU registry before relying on a previously downloaded copy.</p></main></body></html>`;
}

function createPdf(data: DriverRegistrationFileData) {
  const commands: string[] = [];
  const text = (
    value: string,
    x: number,
    y: number,
    size = 9,
    bold = false,
    color = "0.125 0.125 0.125",
  ) => {
    commands.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg ${x} ${y} Td (${pdfEscape(value)}) Tj ET`,
    );
  };
  commands.push("0.2 0.455 0.094 rg 0 820 595 22 re f");
  text("TRISAFE  |  LGU DRIVER REGISTRY", 42, 791, 9, true, "0.2 0.455 0.094");
  text(data.title, 42, 764, 22, true);
  text(
    `Generated ${formatDateTime(data.generatedAt)} from live registry data`,
    42,
    745,
    8,
    false,
    "0.4 0.4 0.4",
  );
  commands.push("0.933 0.973 0.914 rg 42 695 511 36 re f");
  text("CURRENT DATABASE RECORD", 54, 717, 8, true, "0.137 0.357 0.067");
  text(
    "Temporary passwords are excluded because TriSafe stores secure password hashes only.",
    54,
    704,
    7,
    false,
    "0.25 0.35 0.22",
  );
  let y = 671;
  for (const section of data.sections) {
    commands.push(`0.933 0.973 0.914 rg 42 ${y - 4} 511 22 re f`);
    text(section.title.toUpperCase(), 52, y + 3, 8, true, "0.137 0.357 0.067");
    y -= 28;
    for (const field of section.fields) {
      text(field.label.toUpperCase(), 52, y + 7, 6.5, true, "0.45 0.45 0.45");
      text(shorten(field.value, 72), 192, y + 7, 8.5, true);
      commands.push(`0.88 0.88 0.88 RG 42 ${y} m 553 ${y} l S`);
      y -= 25;
    }
    y -= 8;
  }
  commands.push("0.88 0.88 0.88 RG 42 48 m 553 48 l S");
  text(
    "Confirm current account and transport eligibility through the live TriSafe registry.",
    42,
    32,
    7,
    false,
    "0.42 0.42 0.42",
  );
  return pdfBlob(commands.join("\n"));
}

function pdfBlob(stream: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n%TriSafe\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function createDocx(data: DriverRegistrationFileData) {
  const sectionXml = data.sections
    .map(
      (section) => `
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${xml(section.title)}</w:t></w:r></w:p>
    <w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="110" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9E2D5"/><w:left w:val="single" w:sz="4" w:color="D9E2D5"/><w:bottom w:val="single" w:sz="4" w:color="D9E2D5"/><w:right w:val="single" w:sz="4" w:color="D9E2D5"/><w:insideH w:val="single" w:sz="4" w:color="E7ECE5"/><w:insideV w:val="single" w:sz="4" w:color="E7ECE5"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6360"/></w:tblGrid>
      ${section.fields.map((field) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:fill="F1F7EE"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="337418"/><w:sz w:val="17"/></w:rPr><w:t>${xml(field.label.toUpperCase())}</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="6360" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="19"/></w:rPr><w:t>${xml(field.value)}</w:t></w:r></w:p></w:tc></w:tr>`).join("")}
    </w:tbl>`,
    )
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
    <w:p><w:pPr><w:pStyle w:val="Brand"/></w:pPr><w:r><w:t>TRISAFE  |  LGU DRIVER REGISTRY</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${xml(data.title)}</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:t>Generated ${xml(formatDateTime(data.generatedAt))} from live registry data</w:t></w:r></w:p>
    <w:p><w:pPr><w:shd w:fill="EEF8E9"/><w:spacing w:before="180" w:after="180"/><w:ind w:left="180" w:right="180"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="245B11"/></w:rPr><w:t>Current database record. </w:t></w:r><w:r><w:rPr><w:color w:val="3F5737"/></w:rPr><w:t>Temporary passwords are intentionally excluded because TriSafe stores only secure password hashes.</w:t></w:r></w:p>
    ${sectionXml}
    <w:p><w:pPr><w:spacing w:before="220"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="8" w:color="D9E2D5"/></w:pBdr></w:pPr><w:r><w:rPr><w:color w:val="6B7468"/><w:sz w:val="16"/></w:rPr><w:t>Confirm current account and transport eligibility through the live TriSafe registry before relying on a previously downloaded copy.</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1440" w:bottom="1080" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:color w:val="202020"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Brand"><w:name w:val="Brand"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:b/><w:color w:val="337418"/><w:sz w:val="18"/><w:spacing w:val="18"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="70"/></w:pPr><w:rPr><w:b/><w:color w:val="202020"/><w:sz w:val="38"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="100"/></w:pPr><w:rPr><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="90"/></w:pPr><w:rPr><w:b/><w:color w:val="337418"/><w:sz w:val="20"/><w:caps/></w:rPr></w:style></w:styles>`;
  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    { name: "word/document.xml", data: documentXml },
    { name: "word/styles.xml", data: stylesXml },
    {
      name: "word/_rels/document.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "docProps/core.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(data.title)}</dc:title><dc:creator>TriSafe LGU Admin Portal</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${data.generatedAt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${data.generatedAt}</dcterms:modified></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>TriSafe</Application></Properties>`,
    },
  ];
  return zipBlob(files);
}

function zipBlob(files: { name: string; data: string }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.data);
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    writeZipHeader(localView, 0x04034b50, crc, data.length, name.length);
    localHeader.set(name, 30);
    localParts.push(localHeader, data);
    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob(
    [
      ...localParts.map(toArrayBuffer),
      ...centralParts.map(toArrayBuffer),
      toArrayBuffer(end),
    ],
    {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  );
}

function writeZipHeader(
  view: DataView,
  signature: number,
  crc: number,
  size: number,
  nameLength: number,
) {
  view.setUint32(0, signature, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameLength, true);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toArrayBuffer(value: Uint8Array) {
  return value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength,
  ) as ArrayBuffer;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not recorded";
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function shorten(value: string, max: number) {
  const text = toAscii(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}
function toAscii(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}
function pdfEscape(value: string) {
  return toAscii(value).replace(/([\\()])/g, "\\$1");
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );
}
function xml(value: string) {
  return escapeHtml(value);
}
