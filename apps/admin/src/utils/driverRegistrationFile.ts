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
  const initialPasswordSource =
    vehicle?.vehicleType === "HABAL_HABAL" ? "Permit Number" : "Body Number";
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
          {
            label: "Initial password",
            value: `${initialPasswordSource} - change anytime for security`,
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
          {
            label: "Province",
            value: driver.address?.provinceName ?? "Not recorded",
          },
          {
            label: "Municipality / City",
            value: driver.address?.municipalityName ?? "Not recorded",
          },
          {
            label: "Barangay",
            value: driver.address?.barangayName ?? "Not recorded",
          },
          { label: "Purok", value: driver.address?.purok ?? "Not recorded" },
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
      (section, index) => `
      <section class="record-section">
        <h2><b>${index + 1}</b>${escapeHtml(section.title)}</h2>
        <div class="field-grid">
          ${section.fields.map((field) => `<div class="field"><span>${escapeHtml(field.label)}</span>${htmlFieldValue(field)}</div>`).join("")}
        </div>
      </section>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(data.title)}</title>
<style>
  *{box-sizing:border-box}body{margin:0;padding:32px;background:#f4f7f5;color:#151b17;font-family:Inter,"Segoe UI",Arial,sans-serif}.page{max-width:760px;margin:0 auto;border:1px solid #d8ded9;border-radius:12px;padding:34px 38px;background:#fff;box-shadow:0 18px 46px rgba(29,47,34,.12)}
  .document-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.brand{display:flex;align-items:center;gap:10px;color:#287b37}.brand svg{width:40px;height:40px}.brand div{display:grid;gap:2px}.brand strong{font-size:17px;letter-spacing:.08em}.brand span,.tagline{color:#34463b;font-size:9px;font-weight:700;letter-spacing:.05em;line-height:1.45;text-transform:uppercase}.tagline{text-align:right}
  h1{margin:24px 0 4px;font-size:27px;letter-spacing:-.025em}.meta{margin:0 0 18px;color:#627069;font-size:11px;font-weight:500}.record-section{overflow:hidden;margin-top:14px;border:1px solid #dce4de;border-radius:7px}.record-section h2{display:flex;align-items:center;gap:9px;margin:0;padding:8px 10px;color:#1a642b;background:linear-gradient(90deg,#e4f2e4,#f1f8f1);font-size:11px}.record-section h2 b{display:grid;width:21px;height:21px;place-items:center;border-radius:50%;color:#fff;background:#4ca65b;font-size:10px}.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.field{display:grid;grid-template-columns:minmax(100px,.8fr) minmax(0,1.2fr);min-height:42px;border-top:1px solid #e1e6e2}.field:nth-child(odd){border-right:1px solid #e1e6e2}.field>span,.field>strong{display:flex;align-items:center;min-width:0;padding:9px 10px;font-size:10px;overflow-wrap:anywhere}.field>span{color:#4f5a53;font-weight:500}.field>strong{border-left:1px solid #e1e6e2;color:#151b17;font-weight:700}.status{display:inline-flex!important;align-items:center;gap:6px}.status i{flex:0 0 7px;width:7px;height:7px;border-radius:50%;background:currentColor}.status.positive{color:#17652a}.status.negative{color:#cb2d3e}.document-footer{display:flex;justify-content:space-between;gap:24px;margin-top:24px;border-top:1px solid #dce3de;padding-top:15px;color:#69756e;font-size:9px;line-height:1.5}.document-footer strong{flex:0 0 auto;color:#25362c}
  @media print{body{padding:0;background:#fff}.page{max-width:none;border:0;border-radius:0;padding:14mm;box-shadow:none}@page{size:A4;margin:0}}
  @media(max-width:650px){body{padding:0}.page{border:0;border-radius:0;padding:24px 16px;box-shadow:none}.field-grid{grid-template-columns:1fr}.field:nth-child(odd){border-right:0}.document-footer{flex-direction:column}}
</style></head><body><main class="page">
  <header class="document-header"><div class="brand"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 5 6v5c0 4.8 2.9 8.2 7 10 4.1-1.8 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg><div><strong>TRISAFE</strong><span>BPLO Driver Registry</span></div></div><div class="tagline">Safe transport<br>A stronger Trinidad</div></header>
  <h1>Driver Registration Record</h1><p class="meta">Generated ${escapeHtml(formatDateTime(data.generatedAt))} from the live TriSafe registry</p>
  ${sections}
  <footer class="document-footer"><span>This record was generated from the live TriSafe registry. Verify all information before relying on a downloaded copy.</span><strong>TriSafe · BPLO Trinidad, Bohol</strong></footer>
</main></body></html>`;
}

function htmlFieldValue(field: { label: string; value: string }) {
  if (!isStatusField(field.label))
    return `<strong>${escapeHtml(field.value)}</strong>`;
  const tone = isNegativeStatus(field.value) ? "negative" : "positive";
  return `<strong class="status ${tone}"><i></i>${escapeHtml(titleCase(field.value))}</strong>`;
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
  const fillRect = (x: number, y: number, width: number, height: number, color: string) =>
    commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
  const strokeRect = (x: number, y: number, width: number, height: number, color = "0.86 0.89 0.87") =>
    commands.push(`${color} RG ${x} ${y} ${width} ${height} re S`);
  const line = (x1: number, y1: number, x2: number, y2: number, color = "0.88 0.9 0.89") =>
    commands.push(`${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);

  text("TRISAFE", 48, 794, 13, true, "0.12 0.45 0.19");
  text("BPLO DRIVER REGISTRY", 48, 781, 6.5, true, "0.2 0.28 0.23");
  text("SAFE TRANSPORT", 472, 794, 7, true, "0.2 0.28 0.23");
  text("A STRONGER TRINIDAD", 451, 783, 7, true, "0.2 0.28 0.23");
  text("Driver Registration Record", 48, 746, 21, true);
  text(
    `Generated ${formatDateTime(data.generatedAt)} from the live TriSafe registry`,
    48,
    727,
    8,
    false,
    "0.36 0.42 0.38",
  );

  const pageX = 48;
  const pageWidth = 499;
  const cellWidth = pageWidth / 2;
  const labelWidth = 87;
  let y = 699;
  data.sections.forEach((section, sectionIndex) => {
    const headerBottom = y - 22;
    fillRect(pageX, headerBottom, pageWidth, 22, "0.89 0.95 0.89");
    strokeRect(pageX, headerBottom, pageWidth, 22);
    fillRect(pageX + 8, headerBottom + 4, 14, 14, "0.3 0.65 0.36");
    text(String(sectionIndex + 1), pageX + 13, headerBottom + 8, 7, true, "1 1 1");
    text(section.title, pageX + 29, headerBottom + 8, 8, true, "0.1 0.39 0.17");
    y = headerBottom;

    for (let fieldIndex = 0; fieldIndex < section.fields.length; fieldIndex += 2) {
      const rowBottom = y - 28;
      strokeRect(pageX, rowBottom, pageWidth, 28);
      line(pageX + cellWidth, rowBottom, pageX + cellWidth, y);
      section.fields.slice(fieldIndex, fieldIndex + 2).forEach((field, columnIndex) => {
        const cellX = pageX + cellWidth * columnIndex;
        line(cellX + labelWidth, rowBottom, cellX + labelWidth, y);
        text(shorten(field.label, 28), cellX + 7, rowBottom + 10, 5.6, false, "0.3 0.35 0.32");
        const valueX = cellX + labelWidth + 8;
        if (isStatusField(field.label)) {
          const negative = isNegativeStatus(field.value);
          const color = negative ? "0.78 0.16 0.22" : "0.09 0.4 0.16";
          fillRect(valueX, rowBottom + 12, 4, 4, color);
          text(shorten(titleCase(field.value), 28), valueX + 8, rowBottom + 10, 7.2, true, color);
        } else {
          const isPasswordGuidance =
            field.label === "Initial password" && field.value.length > 30;
          text(
            shorten(field.value, isPasswordGuidance ? 48 : 30),
            valueX,
            rowBottom + 10,
            isPasswordGuidance ? 5.8 : 7.2,
            true,
          );
        }
      });
      y = rowBottom;
    }
    y -= 10;
  });

  line(48, 55, 547, 55, "0.84 0.88 0.85");
  text(
    "This record was generated from the live TriSafe registry. Verify all information before relying on a downloaded copy.",
    48,
    39,
    6.5,
    false,
    "0.4 0.46 0.42",
  );
  text("TriSafe  |  BPLO Trinidad, Bohol", 416, 27, 6.5, true, "0.15 0.23 0.18");
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

function docxFieldRows(fields: { label: string; value: string }[]) {
  const rows: string[] = [];
  for (let index = 0; index < fields.length; index += 2) {
    const pair = fields.slice(index, index + 2);
    rows.push(`<w:tr><w:trPr><w:cantSplit/></w:trPr>${pair.map(docxFieldCells).join("")}${pair.length === 1 ? docxEmptyFieldCells() : ""}</w:tr>`);
  }
  return rows.join("");
}

function docxFieldCells(field: { label: string; value: string }) {
  const status = isStatusField(field.label);
  const statusColor = isNegativeStatus(field.value) ? "C72A38" : "17662B";
  const valueRun = status
    ? `<w:r><w:rPr><w:b/><w:color w:val="${statusColor}"/><w:sz w:val="17"/></w:rPr><w:t>&#9679; ${xml(titleCase(field.value))}</w:t></w:r>`
    : `<w:r><w:rPr><w:b/><w:color w:val="151B17"/><w:sz w:val="17"/></w:rPr><w:t>${xml(field.value)}</w:t></w:r>`;
  return `<w:tc><w:tcPr><w:tcW w:w="1680" w:type="dxa"/><w:shd w:fill="FAFCFA"/></w:tcPr><w:p><w:r><w:rPr><w:color w:val="4F5A53"/><w:sz w:val="16"/></w:rPr><w:t>${xml(field.label)}</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr><w:p>${valueRun}</w:p></w:tc>`;
}

function docxEmptyFieldCells() {
  return `<w:tc><w:tcPr><w:tcW w:w="1680" w:type="dxa"/><w:shd w:fill="FAFCFA"/></w:tcPr><w:p/></w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr><w:p/></w:tc>`;
}

function createDocx(data: DriverRegistrationFileData) {
  const sectionXml = data.sections
    .map(
      (section, index) => `
    <w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="85" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="85" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9E2D5"/><w:left w:val="single" w:sz="4" w:color="D9E2D5"/><w:bottom w:val="single" w:sz="4" w:color="D9E2D5"/><w:right w:val="single" w:sz="4" w:color="D9E2D5"/><w:insideH w:val="single" w:sz="4" w:color="E1E6E2"/><w:insideV w:val="single" w:sz="4" w:color="E1E6E2"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="1680"/><w:gridCol w:w="3000"/><w:gridCol w:w="1680"/><w:gridCol w:w="3000"/></w:tblGrid>
      <w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:gridSpan w:val="4"/><w:tcW w:w="9360" w:type="dxa"/><w:shd w:fill="E4F2E4"/></w:tcPr><w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="4CA65B"/><w:sz w:val="17"/></w:rPr><w:t xml:space="preserve">${index + 1}   </w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="1A642B"/><w:sz w:val="18"/></w:rPr><w:t>${xml(section.title)}</w:t></w:r></w:p></w:tc></w:tr>
      ${docxFieldRows(section.fields)}
    </w:tbl><w:p><w:pPr><w:spacing w:after="70"/></w:pPr></w:p>`,
    )
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
    <w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="6000"/><w:gridCol w:w="3360"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="287B37"/><w:sz w:val="28"/><w:spacing w:val="20"/></w:rPr><w:t>TRISAFE</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="34463B"/><w:sz w:val="14"/></w:rPr><w:t>BPLO DRIVER REGISTRY</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="3360" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="34463B"/><w:sz w:val="14"/></w:rPr><w:t>SAFE TRANSPORT</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="34463B"/><w:sz w:val="14"/></w:rPr><w:t>A STRONGER TRINIDAD</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Driver Registration Record</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:t>Generated ${xml(formatDateTime(data.generatedAt))} from the live TriSafe registry</w:t></w:r></w:p>
    ${sectionXml}
    <w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="DCE3DE"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="140" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="6500"/><w:gridCol w:w="2860"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="6500" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:color w:val="69756E"/><w:sz w:val="14"/></w:rPr><w:t>This record was generated from the live TriSafe registry. Verify all information before relying on a downloaded copy.</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="2860" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="25362C"/><w:sz w:val="13"/></w:rPr><w:t>TriSafe | BPLO Trinidad, Bohol</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1440" w:bottom="1080" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/><w:color w:val="151B17"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="70" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="260" w:after="45"/></w:pPr><w:rPr><w:b/><w:color w:val="111713"/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="170"/></w:pPr><w:rPr><w:color w:val="627069"/><w:sz w:val="16"/></w:rPr></w:style></w:styles>`;
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
function isStatusField(label: string) {
  return label.toLowerCase().includes("status");
}
function isNegativeStatus(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("expired") ||
    normalized.includes("suspend") ||
    normalized.includes("inactive") ||
    normalized.includes("not ")
  );
}
function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
