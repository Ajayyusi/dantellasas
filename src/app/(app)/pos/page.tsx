import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PageContainer, PageHeader } from "@/components/common/page-header";
import { BranchPrompt } from "@/features/appointments/components/branch-prompt";
import { getAppointment } from "@/features/appointments/queries";
import { listMembershipPlans, listPackages } from "@/features/catalog/queries";
import { getClient, listClientMemberships, listClientPackages } from "@/features/clients/queries";
import { listProducts } from "@/features/inventory/queries";
import { PosView, type PosInitial } from "@/features/sales/components/pos-view";
import type { PosCatalog, PosLine, PosWallet } from "@/features/sales/components/pos-types";
import { listCategories, listServices, servicesForBranch } from "@/features/services/queries";
import { listStaff, staffForBranch } from "@/features/staff/queries";
import { minutesOfDay } from "@/lib/dates";
import { formatClock, formatDuration } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { localName } from "@/lib/localize";
import { taxRateFor } from "@/lib/settings";
import { requirePagePermission, type AppContext } from "@/lib/tenancy/context";

export const metadata: Metadata = { title: "Checkout" };

async function walletFor(ctx: AppContext, clientId: string): Promise<PosWallet> {
  const now = Date.now();
  const [packages, memberships] = await Promise.all([listClientPackages(ctx.org.id, clientId), listClientMemberships(ctx.org.id, clientId)]);
  return {
    packages: packages.filter((p) => p.status === "active" && (!p.expiresAt || Date.parse(p.expiresAt) > now)),
    membership: memberships.find((m) => m.status === "active" && (!m.endAt || Date.parse(m.endAt) > now)) ?? null,
  };
}

export default async function PosPage({ searchParams }: PageProps<"/pos">) {
  const ctx = await requirePagePermission("create_sales");
  const { t, locale } = await getI18n();
  const params = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  if (!ctx.branchId) {
    return (
      <PageContainer>
        <PageHeader title={t("pos.title")} />
        <BranchPrompt />
      </PageContainer>
    );
  }
  const branchId = ctx.branchId;

  const [services, categories, staff, products, packages, plans] = await Promise.all([
    listServices(ctx.org.id),
    listCategories(ctx.org.id),
    listStaff(ctx.org.id),
    listProducts(ctx.org.id),
    listPackages(ctx.org.id),
    listMembershipPlans(ctx.org.id),
  ]);

  const branchServices = servicesForBranch(services, branchId).filter((s) => s.active);
  const catalog: PosCatalog = {
    services: branchServices,
    categories: categories.filter((c) => c.active && branchServices.some((s) => s.categoryId === c.id)),
    products: products
      .filter((p) => p.active && p.usage !== "professional")
      .map((p) => ({
        id: p.id,
        name: localName(p, locale),
        brand: p.brand,
        priceMinor: p.priceMinor,
        taxRateId: p.taxRateId,
        taxExempt: p.taxExempt,
        categoryId: p.categoryId,
        stock: p.stock[branchId] ?? 0,
        trackStock: p.trackStock,
        barcode: p.barcode,
        sku: p.sku,
      })),
    packages: packages.filter((p) => p.active),
    plans: plans.filter((p) => p.active),
    staff: staffForBranch(staff, branchId)
      .filter((s) => s.status === "active")
      .map((s) => ({ id: s.id, displayName: s.displayName, color: s.color, photoUrl: s.photoUrl })),
  };

  let initial: PosInitial = { client: null, wallet: null, lines: [], appointmentId: null, appointmentLabel: null };

  const appointmentId = str(params.appointment);
  const clientId = str(params.client);
  if (appointmentId) {
    const appt = await getAppointment(ctx, appointmentId);
    // Opening the checkout of a paid appointment shows its invoice instead — but not
    // while the sale that just paid it re-renders this page, or the success panel
    // (with the change to give) would be replaced before the cashier reads it.
    if (appt && appt.transactionId && !(await headers()).has("next-action")) redirect(`/sales/${appt.transactionId}`);
    if (appt && appt.branchId === branchId && !["cancelled", "no_show"].includes(appt.status)) {
      const lines: PosLine[] = appt.items.map((item) => {
        const service = services.find((s) => s.id === item.serviceId);
        return {
          key: item.id,
          type: "service",
          refId: item.serviceId,
          name: service ? localName(service, locale) : item.serviceName,
          detail: formatDuration(item.durationMin, locale),
          staffId: catalog.staff.some((s) => s.id === item.staffId) ? item.staffId : null,
          quantity: 1,
          unitPriceMinor: item.priceMinor,
          catalogPriceMinor: service?.priceMinor ?? null,
          discountMinor: item.discountMinor,
          taxRateBps: service ? taxRateFor(ctx.settings, service) : 0,
          redeemClientPackageId: null,
          appointmentLineId: item.id,
          giftCard: null,
        };
      });
      const client = appt.clientId ? await getClient(ctx.org.id, appt.clientId) : null;
      initial = {
        client: client
          ? { mode: "client", client: { id: client.id, fullName: client.fullName, phone: client.phone, stats: client.stats, tags: client.tags } }
          : { mode: "walkin", name: appt.clientName },
        wallet: client ? await walletFor(ctx, client.id) : null,
        lines,
        appointmentId: appt.id,
        appointmentLabel: t("pos.fromAppointment", { time: formatClock(minutesOfDay(new Date(appt.startAt), ctx.timezone), locale) }),
      };
    }
  } else if (clientId) {
    const client = await getClient(ctx.org.id, clientId);
    if (client) {
      initial = {
        ...initial,
        client: { mode: "client", client: { id: client.id, fullName: client.fullName, phone: client.phone, stats: client.stats, tags: client.tags } },
        wallet: await walletFor(ctx, client.id),
      };
    }
  }

  return (
    <PageContainer className="flex lg:h-[calc(100dvh-3.5rem)] flex-col lg:overflow-hidden">
      <PageHeader title={t("pos.title")} />
      <PosView key={initial.appointmentId ?? initial.client?.mode ?? "new"} catalog={catalog} initial={initial} branchId={branchId} />
    </PageContainer>
  );
}
