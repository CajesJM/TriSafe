export type VehicleQrPosterDetails = {
  driverName: string;
  plateNumber: string;
  vehicleType: string;
  franchiseNumber: string;
  qrReference: string;
};

const posterWidth = 1275;
const posterHeight = 1650;

export function downloadVehicleQrPoster(
  qrCanvas: HTMLCanvasElement,
  details: VehicleQrPosterDetails,
) {
  const canvas = document.createElement("canvas");
  canvas.width = posterWidth;
  canvas.height = posterHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The official QR layout could not be created.");

  context.fillStyle = "#f8f8f8";
  context.fillRect(0, 0, posterWidth, posterHeight);
  context.fillStyle = "#0f0f0f";
  context.fillRect(0, 0, posterWidth, 24);
  context.fillStyle = "#337418";
  context.fillRect(0, 24, posterWidth, 230);

  drawLogoPlaceholder(context, 125, 139, 140, "TriSafe", "LOGO");
  drawLogoPlaceholder(context, 1150, 139, 140, "LGU", "LOGO");

  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = "800 20px Arial, sans-serif";
  context.fillText("REPUBLIC OF THE PHILIPPINES", posterWidth / 2, 79);
  context.font = "900 40px Arial, sans-serif";
  context.fillText("MUNICIPALITY OF TRINIDAD", posterWidth / 2, 132);
  context.font = "700 21px Arial, sans-serif";
  context.fillText("Province of Bohol", posterWidth / 2, 170);
  context.fillStyle = "#c8ff8f";
  context.font = "800 17px Arial, sans-serif";
  context.fillText(
    "TRISAFE TRANSPORT SAFETY & VERIFICATION",
    posterWidth / 2,
    210,
  );

  context.fillStyle = "#0f0f0f";
  context.font = "900 39px Arial, sans-serif";
  context.fillText("OFFICIAL LGU VEHICLE QR", posterWidth / 2, 318);
  context.fillStyle = "#526052";
  context.font = "500 18px Arial, sans-serif";
  context.fillText(
    "Scan before riding to verify this driver and vehicle in the live TriSafe registry.",
    posterWidth / 2,
    354,
  );

  roundedRect(context, 190, 395, 895, 700, 38, "#ffffff", "#dbe5d8", 4);

  const qrSize = 620;
  const qrX = (posterWidth - qrSize) / 2;
  const qrY = 435;
  context.imageSmoothingEnabled = false;
  context.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  context.fillStyle = "#0f0f0f";
  context.font = "900 27px Arial, sans-serif";
  context.fillText("SCAN TO VERIFY BEFORE RIDING", posterWidth / 2, 1145);

  const detailTop = 1190;
  drawDetail(
    context,
    70,
    detailTop,
    550,
    "REGISTERED DRIVER",
    details.driverName,
  );
  drawDetail(context, 655, detailTop, 550, "PLATE NUMBER", details.plateNumber);
  drawDetail(
    context,
    70,
    detailTop + 112,
    550,
    "VEHICLE TYPE",
    formatVehicleType(details.vehicleType),
  );
  drawDetail(
    context,
    655,
    detailTop + 112,
    550,
    "FRANCHISE NUMBER",
    details.franchiseNumber,
  );

  roundedRect(context, 70, 1429, 1135, 88, 16, "#eef6ea", "#cbdcc5", 3);
  context.textAlign = "center";
  context.fillStyle = "#285f14";
  context.font = "800 17px Arial, sans-serif";
  context.fillText(
    "A valid scan must display the same driver, plate number, and active transport status.",
    posterWidth / 2,
    1482,
  );

  context.fillStyle = "#0f0f0f";
  context.fillRect(0, 1585, posterWidth, 65);
  context.fillStyle = "#ffffff";
  context.font = "700 15px Arial, sans-serif";
  context.fillText(
    `TriSafe Registry Ref. ${details.qrReference}  •  LGU Trinidad, Bohol`,
    posterWidth / 2,
    1624,
  );

  const link = document.createElement("a");
  link.download = `trisafe-${safeFilename(details.plateNumber)}-official-qr.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawLogoPlaceholder(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  diameter: number,
  label: string,
  altText: string,
) {
  context.beginPath();
  context.arc(centerX, centerY, diameter / 2, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
  context.strokeStyle = "#c8ff8f";
  context.lineWidth = 4;
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "#173d12";
  context.font = "900 20px Arial, sans-serif";
  context.fillText(label, centerX, centerY - 3);
  context.fillStyle = "#557051";
  context.font = "700 12px Arial, sans-serif";
  context.fillText(altText, centerX, centerY + 20);
}

function drawDetail(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
) {
  roundedRect(context, x, y, width, 90, 16, "#ffffff", "#dbe5d8", 3);
  context.textAlign = "left";
  context.fillStyle = "#697269";
  context.font = "800 14px Arial, sans-serif";
  context.fillText(label, x + 23, y + 30);
  context.fillStyle = "#0f0f0f";
  context.font = "900 21px Arial, sans-serif";
  context.fillText(fitText(context, value, width - 46), x + 23, y + 65);
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string,
  lineWidth = 1,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  if (context.measureText(value).width <= maxWidth) return value;
  let shortened = value;
  while (
    shortened.length > 1 &&
    context.measureText(`${shortened}…`).width > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

function formatVehicleType(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
