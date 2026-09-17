import { UserDirectory } from "./UserDirectory";
import type { ToastMessage } from "../shared/ToastNotification";

export function PassengerManagement({
  onNotify,
}: {
  onNotify: (type: ToastMessage["type"], message: string) => void;
}) {
  return <UserDirectory managementRole="PASSENGER" onNotify={onNotify} />;
}
