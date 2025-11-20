'use client';

import { OrganizationSwitcher } from '@clerk/nextjs';

export function OrgSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal
      afterCreateOrganizationUrl={(org) => `/${org.id}/projects`}
      afterSelectOrganizationUrl={(org) => `/${org.id}/projects`}
      appearance={{
        elements: {
          rootBox: 'flex items-center',
          organizationSwitcherTrigger: 'px-4 py-2 rounded-lg border hover:bg-slate-50',
        },
      }}
    />
  );
}