import { Tab } from '../../types/admin';

export function PageHeader({ tab }: { tab: Tab }) {
  return <header className="page-header"><div><p className="eyebrow">LOCAL GOVERNMENT ADMINISTRATION</p><h1>{tab === 'overview' ? 'Good morning, LGU team' : tab === 'drivers' ? 'Drivers & vehicles' : tab === 'fares' ? 'Fare matrix' : tab === 'announcements' ? 'Announcements' : tab === 'incidents' ? 'Incident review' : 'Audit trail'}</h1></div><div className="profile">LGU Administrator <span>LA</span></div></header>;
}
