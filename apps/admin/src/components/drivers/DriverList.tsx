import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Driver } from '../../api';
import { EmptyState } from '../shared/Feedback';

export function DriverList({ drivers, onRegister, onViewQr, onUpdateFranchise }: { drivers: Driver[]; onRegister: () => void; onViewQr: (driver: Driver) => void; onUpdateFranchise: (driver: Driver) => void }) {
  return <section className="card"><div className="section-heading"><div><span className="eyebrow">REGISTRY</span><h3>Approved driver accounts</h3><p className="section-description">Only LGU-approved drivers can receive TriSafe accounts and vehicle QR codes.</p></div><button className="primary" onClick={onRegister} type="button">+ Register driver</button></div><div className="table">{drivers.map((driver) => <DriverRow driver={driver} onViewQr={onViewQr} onUpdateFranchise={onUpdateFranchise} key={driver.id} />)}{drivers.length === 0 && <EmptyState text="No approved drivers have been registered yet." />}</div></section>;
}

function DriverRow({ driver, onViewQr, onUpdateFranchise }: { driver: Driver; onViewQr: (driver: Driver) => void; onUpdateFranchise: (driver: Driver) => void }) { return <div className="row"><div className="avatar">{driver.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="grow"><b>{driver.fullName}</b><span>{driver.vehicles[0]?.plateNumber ?? 'No vehicle'} · {driver.franchise?.franchiseNumber ?? 'No franchise'} · expires {driver.franchise?.expiresAt?.slice(0, 10) ?? '—'}</span></div><span className={`status ${(driver.franchise?.status ?? driver.verification).toLowerCase()}`}>{driver.franchise?.status ?? driver.verification}</span><button className="row-action" onClick={() => onUpdateFranchise(driver)} type="button">Manage franchise</button><button className="row-action" onClick={() => onViewQr(driver)} type="button">View QR</button></div>; }

export function QrCodePanel({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehicle = driver.vehicles[0];
  const token = vehicle?.qrCode?.token;
  if (!vehicle || !token) return null;
  const qrValue = `trisafe://verify/${token}`;

  function downloadQr() { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement('a'); link.download = `trisafe-${vehicle.plateNumber}-qr.png`; link.href = canvas.toDataURL('image/png'); link.click(); }

  return <section className="card qr-panel"><div className="qr-copy"><span className="eyebrow">QR IDENTITY · LGU ISSUED</span><h3>Vehicle QR code is ready</h3><p>Print this code and place it where passengers can scan it safely. It is linked to the verified driver and franchise record.</p><div className="qr-details"><div><span>Driver</span><b>{driver.fullName}</b></div><div><span>Vehicle</span><b>{vehicle.plateNumber} · {vehicle.vehicleType}</b></div><div><span>Franchise</span><b>{driver.franchise?.franchiseNumber ?? '—'}</b></div></div><code className="qr-token">{qrValue}</code><div className="qr-actions"><button className="primary" onClick={downloadQr} type="button">Download PNG</button><button className="secondary" onClick={onClose} type="button">Close</button></div></div><div className="qr-preview"><QRCodeCanvas ref={canvasRef} value={qrValue} size={196} bgColor="#ffffff" fgColor="#153f38" level="H" includeMargin /></div></section>;
}
