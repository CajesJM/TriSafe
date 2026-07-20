import { useEffect, useState } from 'react';
import { api, AuditLog, Dashboard, Driver, FareRule, Incident, IncidentReviewInput, LocationOption, UpdateFranchiseInput, hasAuthToken, logout } from './api';
import { LoginScreen } from './components/auth/LoginScreen';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { DriverList, QrCodePanel } from './components/drivers/DriverList';
import { DriverRegistrationForm } from './components/drivers/DriverRegistrationForm';
import { FranchiseEditor } from './components/drivers/FranchiseEditor';
import { FareMatrixPanel } from './components/fares/FareMatrixPanel';
import { AnnouncementComposer } from './components/announcements/AnnouncementComposer';
import { IncidentReview } from './components/incidents/IncidentReview';
import { AuditLogPanel } from './components/audit/AuditLogPanel';
import { PageHeader } from './components/layout/PageHeader';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorMessage, SuccessMessage } from './components/shared/Feedback';
import { Tab } from './types/admin';

export function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [fareRules, setFareRules] = useState<FareRule[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState('');
  const [announcementNotice, setAnnouncementNotice] = useState('');
  const [qrDriver, setQrDriver] = useState<Driver | null>(null);
  const [franchiseDriver, setFranchiseDriver] = useState<Driver | null>(null);
  const [authenticated, setAuthenticated] = useState(hasAuthToken());

  useEffect(() => {
    if (!authenticated) return;
    void Promise.all([api.dashboard().then(setDashboard), api.drivers().then(setDrivers), api.incidents().then(setIncidents), api.fareRules().then(setFareRules), api.locations().then(setLocations), api.auditLogs().then(setAuditLogs)]).catch((requestError: Error) => setError(requestError.message));
  }, [authenticated]);

  useEffect(() => {
    const expireSession = () => setAuthenticated(false);
    window.addEventListener('trisafe-auth-expired', expireSession);
    return () => window.removeEventListener('trisafe-auth-expired', expireSession);
  }, []);

  if (!authenticated) return <LoginScreen onSuccess={() => setAuthenticated(true)} />;

  function openRegistration() { setError(''); setRegistrationNotice(''); setTab('drivers'); setShowRegistration(true); }

  function handleDriverCreated(driver: Driver) {
    setDrivers((current) => [driver, ...current]);
    setShowRegistration(false);
    setQrDriver(driver);
    setRegistrationNotice(`${driver.fullName} was registered and approved successfully.`);
    setDashboard((current) => current ? { ...current, drivers: current.drivers + 1, verifiedDrivers: current.verifiedDrivers + 1 } : current);
  }

  async function reviewIncident(id: string, review: IncidentReviewInput) {
    await api.reviewIncident(id, review);
    setIncidents((items) => items.map((item) => item.id === id ? { ...item, status: review.status, category: review.category ?? item.category, reviewerNotes: review.reviewerNotes ?? item.reviewerNotes } : item));
    setAuditLogs(await api.auditLogs());
  }

  async function refreshFareData() {
    const [nextRules, nextLocations] = await Promise.all([api.fareRules(), api.locations()]);
    setFareRules(nextRules);
    setLocations(nextLocations);
  }

  async function updateFranchise(input: UpdateFranchiseInput) {
    if (!franchiseDriver) return;
    const updated = await api.updateFranchise(franchiseDriver.id, input);
    setDrivers((items) => items.map((driver) => driver.id === updated.id ? updated : driver));
    setFranchiseDriver(null);
    setAuditLogs(await api.auditLogs());
    setRegistrationNotice(`${updated.fullName}'s franchise record was updated.`);
  }

  return <main className="shell"><Sidebar tab={tab} onChange={setTab} onLogout={() => { logout(); setAuthenticated(false); }} /><section className="content"><PageHeader tab={tab} />{error && <ErrorMessage message={error} />}{registrationNotice && <SuccessMessage message={registrationNotice} />}
    {tab === 'overview' && dashboard && <DashboardHome dashboard={dashboard} onRegister={openRegistration} onReview={() => setTab('incidents')} />}
    {tab === 'drivers' && (showRegistration ? <DriverRegistrationForm onCancel={() => setShowRegistration(false)} onCreated={handleDriverCreated} /> : <DriverList drivers={drivers} onRegister={openRegistration} onViewQr={setQrDriver} onUpdateFranchise={setFranchiseDriver} />)}
    {tab === 'drivers' && franchiseDriver && <FranchiseEditor driver={franchiseDriver} onCancel={() => setFranchiseDriver(null)} onSave={updateFranchise} />}
    {tab === 'drivers' && qrDriver && <QrCodePanel driver={qrDriver} onClose={() => setQrDriver(null)} />}
    {tab === 'fares' && <FareMatrixPanel rules={fareRules} locations={locations} onChanged={refreshFareData} />}
    {tab === 'announcements' && <AnnouncementComposer onPublished={setAnnouncementNotice} />}
    {tab === 'announcements' && announcementNotice && <SuccessMessage message={announcementNotice} />}
    {tab === 'incidents' && <IncidentReview incidents={incidents} onReview={reviewIncident} />}
    {tab === 'audit' && <AuditLogPanel logs={auditLogs} />}
  </section></main>;
}
