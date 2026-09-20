export type VehicleQrPosterDetails = {
  plateNumber: string;
  vehicleType: string;
};

const posterWidth = 1275;
const posterHeight = 1770;

export async function downloadVehicleQrPoster(
  qrCanvas: HTMLCanvasElement,
  details: VehicleQrPosterDetails,
) {
  const [hall, triSafeLogo, bploLogo] = await Promise.all([
    loadImage("/images/dashboard/TRI-Hall.webp"),
    loadImage("/Logo/Trisafe-logo-icon.webp"),
    loadImage("/Logo/LOGO-transparent.webp"),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = posterWidth;
  canvas.height = posterHeight;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("The printable QR layout could not be created.");

  context.fillStyle = "#fff";
  context.fillRect(0, 0, posterWidth, posterHeight);
  drawImageCover(context, hall);

  // Match the live poster's soft top-to-bottom and side-edge fades.
  const verticalFade = context.createLinearGradient(0, 0, 0, posterHeight);
  for (const [stop, opacity] of [
    [0, 1],
    [0.18, 0.95],
    [0.5, 0.48],
    [0.76, 0.42],
    [1, 0.9],
  ]) {
    verticalFade.addColorStop(stop, `rgba(255,255,255,${opacity})`);
  }
  context.fillStyle = verticalFade;
  context.fillRect(0, 0, posterWidth, posterHeight);
  const edgeFade = context.createLinearGradient(0, 0, posterWidth, 0);
  edgeFade.addColorStop(0, "rgba(255,255,255,.75)");
  edgeFade.addColorStop(0.16, "rgba(255,255,255,0)");
  edgeFade.addColorStop(0.84, "rgba(255,255,255,0)");
  edgeFade.addColorStop(1, "rgba(255,255,255,.75)");
  context.fillStyle = edgeFade;
  context.fillRect(0, 0, posterWidth, posterHeight);

  context.save();
  context.beginPath();
  context.arc(160, 160, 85, 0, Math.PI * 2);
  context.clip();
  context.drawImage(triSafeLogo, 75, 75, 170, 170);
  context.restore();
  context.drawImage(bploLogo, 1030, 75, 170, 170);
  context.textAlign = "center";
  context.fillStyle = "#164c35";
  context.font = "700 64px Inter, Arial, sans-serif";
  context.fillText("TriSafe", posterWidth / 2, 139);
  context.fillStyle = "#132137";
  context.font = "700 34px Inter, Arial, sans-serif";
  context.fillText("OFFICIAL VEHICLE QR", posterWidth / 2, 189);
  context.fillStyle = "#5c6b7e";
  context.font = "400 29px Inter, Arial, sans-serif";
  context.fillText("BPLO Trinidad, Bohol", posterWidth / 2, 231);

  context.save();
  context.shadowColor = "rgba(22,69,47,.12)";
  context.shadowBlur = 65;
  context.shadowOffsetY = 28;
  roundedRect(context, 190, 330, 895, 1110, 54, "#fff", "#dfe8e8", 2);
  context.restore();
  context.imageSmoothingEnabled = false;
  context.drawImage(qrCanvas, 292, 410, 690, 690);
  context.imageSmoothingEnabled = true;

  roundedRect(context, 230, 1170, 815, 225, 34, "#eaf7ef");
  context.fillStyle = "#152333";
  context.font = "700 42px Inter, Arial, sans-serif";
  context.fillText("SCAN TO VERIFY", posterWidth / 2, 1242);
  context.fillStyle = "#1b3140";
  context.font = "700 32px Inter, Arial, sans-serif";
  context.fillText(
    fitText(
      context,
      `${details.plateNumber} · ${formatVehicleType(details.vehicleType)}`,
      770,
    ),
    posterWidth / 2,
    1299,
  );
  context.fillStyle = "#586b68";
  context.font = "400 28px Inter, Arial, sans-serif";
  context.fillText("TriSafe Registry", posterWidth / 2, 1351);

  context.save();
  context.translate(85, 1560);
  context.rotate((-8 * Math.PI) / 180);
  context.textAlign = "left";
  context.fillStyle = "#123f39";
  context.font = '400 53px "Segoe Script", "Brush Script MT", cursive';
  context.fillText("Biyahing", 0, 0);
  context.fillText("Ligtas.", 0, 58);
  context.fillText("Trinidad!", 0, 116);
  context.restore();

  context.textAlign = "right";
  context.fillStyle = "#5b687a";
  context.font = "400 27px Inter, Arial, sans-serif";
  context.fillText("Place this QR code inside the vehicle", 1190, 1650);
  context.fillText("where passengers can easily scan it.", 1190, 1690);

  const link = document.createElement("a");
  link.download = `trisafe-${safeFilename(details.plateNumber)}-official-qr.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(`The printable QR layout image could not be loaded: ${src}`),
      );
    image.src = src;
  });
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
) {
  const scale = Math.max(
    posterWidth / image.width,
    posterHeight / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(
    image,
    (posterWidth - width) / 2,
    posterHeight - height,
    width,
    height,
  );
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
