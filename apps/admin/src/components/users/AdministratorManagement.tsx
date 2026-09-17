import { UserDirectory } from "./UserDirectory";
import type { ToastMessage } from "../shared/ToastNotification";

/** Dedicated BPLO Administrator Management workspace. */
export function AdministratorManagement({
  onNotify,
}: {
  onNotify: (type: ToastMessage["type"], message: string) => void;
}) {
  return <UserDirectory managementRole="LGU_ADMIN" onNotify={onNotify} />;
}
