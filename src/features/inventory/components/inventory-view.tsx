"use client";

import { BoxesIcon, HistoryIcon, Loader2Icon, PackagePlusIcon, PlusIcon, TruckIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { PageContainer, PageHeader } from "@/components/common/page-header";
import { useOrg } from "@/components/providers/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoriesDialog } from "@/features/expenses/components/categories-dialog";
import type { DateRange, RangePreset } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { ProductCategoryDTO, SupplierDTO } from "@/lib/types";

import { saveProductCategoryAction, setProductCategoryActiveAction } from "../actions";
import { stockStatus, type MovementRow, type ProductRow, type StockOperation } from "../types";
import { MovementsTab } from "./movements-tab";
import { ProductFormSheet } from "./product-form-sheet";
import { ProductsTab } from "./products-tab";
import { StockOperationDialog } from "./stock-operation-dialog";
import { SupplierDialog } from "./supplier-dialog";
import { SuppliersTab } from "./suppliers-tab";

export type InventoryTab = "products" | "movements" | "suppliers";

export function InventoryView({
  tab,
  products,
  categories,
  suppliers,
  movements,
  preset,
  range,
  openProductId,
}: {
  tab: InventoryTab;
  products: ProductRow[];
  categories: ProductCategoryDTO[];
  suppliers: SupplierDTO[];
  /** Loaded only for the movements tab. */
  movements: MovementRow[] | null;
  preset: RangePreset;
  range: DateRange;
  openProductId: string | null;
}) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Tab follows the URL; the local copy switches instantly while the server renders.
  const [activeTab, setActiveTab] = useState(tab);
  const [syncedTab, setSyncedTab] = useState(tab);
  if (syncedTab !== tab) {
    setSyncedTab(tab);
    setActiveTab(tab);
  }

  // `?product=<id>` (e.g. from a low-stock notification) opens that product.
  const [productSheet, setProductSheet] = useState<{ open: boolean; id: string | null }>({ open: !!openProductId, id: openProductId });
  const [syncedProductParam, setSyncedProductParam] = useState(openProductId);
  if (syncedProductParam !== openProductId) {
    setSyncedProductParam(openProductId);
    if (openProductId) setProductSheet({ open: true, id: openProductId });
  }
  const sheetProduct = productSheet.id ? (products.find((p) => p.id === productSheet.id) ?? null) : null;

  const [operation, setOperation] = useState<{ open: boolean; productId: string | null; op: StockOperation }>({
    open: false,
    productId: null,
    op: "receive",
  });
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [supplierDialog, setSupplierDialog] = useState<{ open: boolean; supplier: SupplierDTO | null }>({ open: false, supplier: null });

  const branchIds = org.branches.map((b) => b.id);
  const lowCount = products.filter((p) => p.active && ["low", "out"].includes(stockStatus(p, org.branchId, branchIds))).length;

  function replaceParams(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function changeTab(value: string) {
    const next = value as InventoryTab;
    setActiveTab(next);
    replaceParams({ tab: next === "products" ? null : next, product: null });
  }

  function openOperation(product: ProductRow | null, op: StockOperation) {
    setOperation({ open: true, productId: product?.id ?? null, op });
  }

  const actions =
    activeTab === "suppliers" ? (
      <Button onClick={() => setSupplierDialog({ open: true, supplier: null })}>
        <PlusIcon />
        {t("inventory.addSupplier")}
      </Button>
    ) : (
      <>
        <Button variant="outline" onClick={() => openOperation(null, "receive")} disabled={products.length === 0}>
          <PackagePlusIcon />
          {t("inventory.receiveStock")}
        </Button>
        <Button onClick={() => setProductSheet({ open: true, id: null })}>
          <PlusIcon />
          {t("inventory.addProduct")}
        </Button>
      </>
    );

  return (
    <PageContainer>
      <PageHeader title={t("inventory.title")} description={t("inventory.description")} actions={actions} />

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList>
          <TabsTrigger value="products">
            <BoxesIcon className="hidden sm:block" />
            {t("inventory.tabs.products")}
            {lowCount > 0 ? <Badge variant="warning">{lowCount}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="movements">
            <HistoryIcon className="hidden sm:block" />
            {t("inventory.tabs.movements")}
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <TruckIcon className="hidden sm:block" />
            {t("inventory.tabs.suppliers")}
          </TabsTrigger>
          {pending ? <Loader2Icon className="ms-2 animate-spin text-muted-foreground" aria-label={t("common.loading")} /> : null}
        </TabsList>

        <TabsContent value="products">
          <ProductsTab
            products={products}
            categories={categories}
            onOpen={(p) => setProductSheet({ open: true, id: p.id })}
            onNew={() => setProductSheet({ open: true, id: null })}
            onOperation={openOperation}
          />
        </TabsContent>
        <TabsContent value="movements">
          {movements ? (
            <MovementsTab movements={movements} preset={preset} range={range} />
          ) : (
            <div className="grid gap-4">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-96 rounded-xl" />
            </div>
          )}
        </TabsContent>
        <TabsContent value="suppliers">
          <SuppliersTab
            suppliers={suppliers}
            products={products}
            onEdit={(s) => setSupplierDialog({ open: true, supplier: s })}
            onNew={() => setSupplierDialog({ open: true, supplier: null })}
          />
        </TabsContent>
      </Tabs>

      <ProductFormSheet
        open={productSheet.open}
        onOpenChange={(open) => {
          setProductSheet((s) => ({ ...s, open }));
          if (!open && params.get("product")) replaceParams({ product: null });
        }}
        product={sheetProduct}
        categories={categories}
        suppliers={suppliers}
        onManageCategories={() => setCategoriesOpen(true)}
        onOperation={(p, op) => openOperation(p, op)}
      />
      <StockOperationDialog
        open={operation.open}
        onOpenChange={(open) => setOperation((s) => ({ ...s, open }))}
        products={products}
        productId={operation.productId}
        op={operation.op}
      />
      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        actions={{ save: saveProductCategoryAction, setActive: setProductCategoryActiveAction }}
        labels={{
          title: t("inventory.manageCategories"),
          description: t("inventory.categoriesHint"),
          add: t("inventory.addCategory"),
          placeholder: t("inventory.categoryNamePlaceholder"),
          saved: t("inventory.categorySaved"),
          activated: t("inventory.categoryActivated"),
          deactivated: t("inventory.categoryDeactivated"),
        }}
      />
      <SupplierDialog
        open={supplierDialog.open}
        onOpenChange={(open) => setSupplierDialog((s) => ({ ...s, open }))}
        supplier={supplierDialog.supplier}
      />
    </PageContainer>
  );
}
