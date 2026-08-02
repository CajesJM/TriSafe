import { useCallback, useEffect, useState } from "react";
import {
  api,
  AuditLog,
  Dashboard,
  Driver,
  DriverStatus,
  FareRule,
  Incident,
  IncidentReviewInput,
  LocationOption,
  SessionUser,
  UpdateFranchiseInput,
  AdminUser,
  RoleDefinition,
  CreateUserInput,
  UpdateUserInput,
  getSessionUser,
  hasAuthToken,
  logout,
  updateSessionUser,
} from "./api";
import { LoginScreen } from "./components/auth/LoginScreen";
import { DashboardHome } from "./components/dashboard/DashboardHome";
import { DriverList, QrCodePanel } from "./components/drivers/DriverList";
import { DriverRegistrationForm } from "./components/drivers/DriverRegistrationForm";
import { FranchiseEditor } from "./components/drivers/FranchiseEditor";
import { FareMatrixPanel } from "./components/fares/FareMatrixPanel";
import { AnnouncementComposer } from "./components/announcements/AnnouncementComposer";
import { IncidentReview } from "./components/incidents/IncidentReview";
import { AuditLogPanel } from "./components/audit/AuditLogPanel";
import { UserDirectory } from "./components/users/UserDirectory";
import { PageHeader } from "./components/layout/PageHeader";
import { Sidebar } from "./components/layout/Sidebar";
import {
  ErrorMessage,
  LoadingState,
  SuccessMessage,
} from "./components/shared/Feedback";
import { Tab } from "./types/admin";
import { AdminProfilePanel } from "./components/profile/AdminProfilePanel";
import { UserForm } from "./components/users/UserForm";

export function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [fareRules, setFareRules] = useState<FareRule[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(hasAuthToken());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState("");
  const [announcementNotice, setAnnouncementNotice] = useState("");
  const [qrDriver, setQrDriver] = useState<Driver | null>(null);
  const [franchiseDriver, setFranchiseDriver] = useState<Driver | null>(null);
  const [authenticated, setAuthenticated] = useState(hasAuthToken());
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(
    getSessionUser(),
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [driverProfileId, setDriverProfileId] = useState<string | null>(null);
  const [editingDriverAccount, setEditingDriverAccount] = useState<AdminUser | null>(null);
  const [driverAccountRoles, setDriverAccountRoles] = useState<RoleDefinition[]>([]);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [
        nextDashboard,
        nextDrivers,
        nextIncidents,
        nextRules,
        nextLocations,
        nextLogs,
      ] = await Promise.all([
        api.dashboard(),
        api.drivers(),
        api.incidents(),
        api.fareRules(),
        api.locations(),
        api.auditLogs(),
      ]);
      setDashboard(nextDashboard);
      setDrivers(nextDrivers);
      setIncidents(nextIncidents);
      setFareRules(nextRules);
      setLocations(nextLocations);
      setAuditLogs(nextLogs);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load admin data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) void loadData();
  }, [authenticated, loadData]);
  useEffect(() => {
    if (!authenticated) return;
    const refreshSession = window.setInterval(() => {
      void loadData(true);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(refreshSession);
  }, [authenticated, loadData]);
  useEffect(() => {
    const expireSession = () => {
      setAuthenticated(false);
      setSessionUser(null);
    };
    window.addEventListener("trisafe-auth-expired", expireSession);
    return () =>
      window.removeEventListener("trisafe-auth-expired", expireSession);
  }, []);

  if (!authenticated)
    return (
      <LoginScreen
        onSuccess={(user) => {
          setSessionUser(user);
          setAuthenticated(true);
        }}
      />
    );

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    if (nextTab !== "drivers") setDriverProfileId(null);
    if (nextTab !== "drivers") setEditingDriverAccount(null);
    setRegistrationNotice("");
    setAnnouncementNotice("");
  }
  async function openDriverAccount(driver: Driver) {
    setError("");
    try {
      const [account, roles] = await Promise.all([api.user(driver.userId), api.roles()]);
      setDriverAccountRoles(roles);
      setEditingDriverAccount(account);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to open the driver account.");
    }
  }
  async function saveDriverAccount(input: CreateUserInput | UpdateUserInput) {
    if (!editingDriverAccount) return;
    const updated = await api.updateUser(editingDriverAccount.id, input as UpdateUserInput);
    setDrivers((items) => items.map((driver) => driver.userId === updated.id ? {
      ...driver,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone ?? undefined,
      accountStatus: updated.status,
    } : driver));
    setEditingDriverAccount(null);
    setRegistrationNotice(`${updated.fullName}'s driver account was updated.`);
    setAuditLogs(await api.auditLogs());
  }
  function openRegistration() {
    setError("");
    setRegistrationNotice("");
    setTab("drivers");
    setShowRegistration(true);
  }
  function handleDriverCreated(driver: Driver) {
    setDrivers((current) => [driver, ...current]);
    setShowRegistration(false);
    setQrDriver(driver);
    setRegistrationNotice(
      `${driver.fullName} was registered and approved successfully.`,
    );
    void Promise.all([
      api.dashboard().then(setDashboard),
      api.auditLogs().then(setAuditLogs),
    ]);
  }
  async function reviewIncident(id: string, review: IncidentReviewInput) {
    await api.reviewIncident(id, review);
    setIncidents((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: review.status,
              category: review.category ?? item.category,
              reviewerNotes: review.reviewerNotes ?? item.reviewerNotes,
            }
          : item,
      ),
    );
    const [nextDashboard, nextLogs] = await Promise.all([
      api.dashboard(),
      api.auditLogs(),
    ]);
    setDashboard(nextDashboard);
    setAuditLogs(nextLogs);
  }
  async function refreshFareData() {
    const [nextRules, nextLocations, nextLogs] = await Promise.all([
      api.fareRules(),
      api.locations(),
      api.auditLogs(),
    ]);
    setFareRules(nextRules);
    setLocations(nextLocations);
    setAuditLogs(nextLogs);
  }
  async function updateFranchise(input: UpdateFranchiseInput) {
    if (!franchiseDriver) return;
    const updated = await api.updateFranchise(franchiseDriver.id, input);
    setDrivers((items) =>
      items.map((driver) => (driver.id === updated.id ? updated : driver)),
    );
    setFranchiseDriver(null);
    setAuditLogs(await api.auditLogs());
    setRegistrationNotice(
      `${updated.fullName}'s franchise record was updated.`,
    );
  }

  async function updateDriverStatus(driver: Driver, status: DriverStatus) {
    const updated = await api.updateDriverStatus(driver.id, status);
    setDrivers((items) =>
      items.map((item) => (item.id === updated.id ? updated : item)),
    );
    setAuditLogs(await api.auditLogs());
    setRegistrationNotice(`${updated.fullName} is now ${status.toLowerCase()}.`);
  }

  return (
    <main className="shell">
      <Sidebar
        tab={tab}
        open={sidebarOpen}
        incidentCount={dashboard?.openIncidents ?? 0}
        onChange={changeTab}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => {
          logout();
          setAuthenticated(false);
          setSessionUser(null);
        }}
      />
      <section className="content">
        <PageHeader
          tab={tab}
          user={sessionUser}
          openIncidents={dashboard?.openIncidents ?? 0}
          onMenu={() => setSidebarOpen(true)}
          onProfile={() => setProfileOpen(true)}
        />
        <AdminProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} onSaved={(user) => { setSessionUser(user); updateSessionUser(user); }} />
        {error && (
          <ErrorMessage message={error} onRetry={() => void loadData()} />
        )}
        {registrationNotice && <SuccessMessage message={registrationNotice} />}
        {loading ? (
          <LoadingState label="Loading TriSafe operations…" rows={6} />
        ) : (
          <>
            {tab === "overview" && dashboard && (
              <DashboardHome
                dashboard={dashboard}
                drivers={drivers}
                auditLogs={auditLogs}
                user={sessionUser}
                onNavigate={changeTab}
                onRegister={openRegistration}
              />
            )}
            {tab === "users" && <UserDirectory />}
            {tab === "drivers" &&
              (showRegistration ? (
                <DriverRegistrationForm
                  onCancel={() => setShowRegistration(false)}
                  onCreated={handleDriverCreated}
                />
              ) : (
                <DriverList
                  drivers={drivers}
                  onRegister={openRegistration}
                  onViewQr={setQrDriver}
                  onUpdateFranchise={setFranchiseDriver}
                  onUpdateStatus={updateDriverStatus}
                  selectedDriverId={driverProfileId}
                  onViewProfile={setDriverProfileId}
                  onCloseProfile={() => setDriverProfileId(null)}
                  onEditAccount={openDriverAccount}
                />
              ))}
            {tab === "drivers" && franchiseDriver && (
              <FranchiseEditor
                driver={franchiseDriver}
                onCancel={() => setFranchiseDriver(null)}
                onSave={updateFranchise}
              />
            )}
            {tab === "drivers" && qrDriver && (
              <QrCodePanel
                driver={qrDriver}
                onClose={() => setQrDriver(null)}
              />
            )}
            {tab === "drivers" && editingDriverAccount && (
              <UserForm
                user={editingDriverAccount}
                roles={driverAccountRoles}
                defaultRole="DRIVER"
                onCancel={() => setEditingDriverAccount(null)}
                onSave={saveDriverAccount}
                onError={(message) => setError(message)}
              />
            )}
            {tab === "fares" && (
              <FareMatrixPanel
                rules={fareRules}
                locations={locations}
                onChanged={refreshFareData}
              />
            )}
            {tab === "announcements" && (
              <AnnouncementComposer onPublished={setAnnouncementNotice} />
            )}
            {tab === "announcements" && announcementNotice && (
              <SuccessMessage message={announcementNotice} />
            )}
            {tab === "incidents" && (
              <IncidentReview incidents={incidents} onReview={reviewIncident} />
            )}
            {tab === "audit" && <AuditLogPanel logs={auditLogs} />}
          </>
        )}
      </section>
    </main>
  );
}
