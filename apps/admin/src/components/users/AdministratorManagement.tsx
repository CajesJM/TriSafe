import { UserDirectory } from "./UserDirectory";

/** Dedicated BPLO Administrator Management workspace. */
export function AdministratorManagement() {
  return <UserDirectory managementRole="LGU_ADMIN" />;
}
