import type { Driver } from "../api";
import { displayPersonName } from "./personName";

export function downloadDriverRegistrationFile(driver: Driver) {
  const vehicle = driver.vehicles[0];
  const generatedAt = new Date();
  const rows = [
    ["Driver name", displayPersonName(driver.fullName)],
    ["Email address", driver.email ?? "Not recorded"],
    ["Mobile number", driver.phone ?? "Not recorded"],
    ["Account status", driver.accountStatus ?? "ACTIVE"],
    ["Driver ID", driver.id],
    ["License number", driver.licenseNumber],
    ["License renewal", formatDate(driver.renewalDate)],
    ["Transport status", driver.verification],
    ["Franchise number", driver.franchise?.franchiseNumber ?? "Not assigned"],
    ["Franchise issued", formatDate(driver.franchise?.issuedAt)],
    ["Franchise expiration", formatDate(driver.franchise?.expiresAt)],
    ["Franchise status", driver.franchise?.status ?? "Not assigned"],
    ["Plate number", vehicle?.plateNumber ?? "Not assigned"],
    ["Vehicle type", vehicle?.vehicleType?.replaceAll("_", " ") ?? "Not assigned"],
    ["LGU QR status", vehicle?.qrCode?.token ? "Generated" : "Not generated"],
  ];
  const document = `<!doctype html><html><head><meta charset="utf-8"><title>TriSafe Driver Registration File</title><style>body{margin:0;background:#f8f8f8;color:#202020;font-family:Arial,sans-serif}.page{max-width:760px;margin:32px auto;border-top:8px solid #337418;padding:40px;background:#fff;box-shadow:0 10px 35px #0001}.brand{color:#337418;font-size:13px;font-weight:800;letter-spacing:.12em}h1{margin:8px 0 4px;font-size:28px}.meta{color:#666;font-size:12px}.notice{margin:24px 0;padding:14px 16px;border-radius:8px;background:#eef8e9;color:#245b11;font-size:12px;line-height:1.5}.grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ddd}.row{min-width:0;border-bottom:1px solid #eee;padding:12px 14px}.row:nth-child(odd){border-right:1px solid #eee}.row span{display:block;color:#777;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.row strong{display:block;margin-top:5px;font-size:13px;overflow-wrap:anywhere}.footer{margin-top:24px;border-top:1px solid #ddd;padding-top:14px;color:#777;font-size:10px;line-height:1.5}@media print{body{background:#fff}.page{margin:0;box-shadow:none}}@media(max-width:600px){.page{margin:0;padding:24px}.grid{grid-template-columns:1fr}.row:nth-child(odd){border-right:0}}</style></head><body><main class="page"><div class="brand">TRISAFE · LGU DRIVER REGISTRY</div><h1>Driver registration file</h1><div class="meta">Generated ${escapeHtml(generatedAt.toLocaleString("en-PH"))} from live registry data</div><div class="notice"><strong>Current database record.</strong> This file can be regenerated from Drivers &amp; QR. Temporary passwords are intentionally excluded because TriSafe stores only secure password hashes.</div><section class="grid">${rows.map(([label, value]) => `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</section><p class="footer">This document reflects the TriSafe record at the generation time shown above. Confirm current eligibility through the live LGU registry before relying on a previously downloaded copy.</p></main></body></html>`;
  const blob = new Blob([document], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = documentElement("a");
  link.href = url;
  link.download = `trisafe-driver-${safeFileName(driver.fullName)}.html`;
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function documentElement(tag: "a") { return document.createElement(tag); }
function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "Not recorded"; }
function safeFileName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }
