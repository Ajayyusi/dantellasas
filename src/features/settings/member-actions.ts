"use server";

import { FieldValue } from "firebase-admin/firestore";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { findOrCreateAuthUser } from "@/lib/auth/accounts";
import { db, orgCol, userRef } from "@/lib/db";
import type { AppContext } from "@/lib/tenancy/context";
import { toMember } from "@/lib/tenancy/mappers";
import type { MemberDTO } from "@/lib/types";

import { inviteMemberInput, memberStatusInput, uidInput, updateMemberInput } from "./schema";
import {
  activeOwnerCount,
  assertStaffLinkable,
  isOwner,
  loadRole,
  memberRoleKey,
  passwordSetupLink,
  resolveBranchAccess,
} from "./service";

export interface SetupLinkResult {
  uid: string;
  email: string;
  displayName: string;
  created: boolean;
  link: string;
}

async function loadMember(ctx: AppContext, uid: string): Promise<MemberDTO> {
  const snap = await orgCol(ctx.org.id, "members").doc(uid).get();
  if (!snap.exists) fail("errors.notFound");
  return toMember(snap.id, snap.data() ?? {});
}

/** Owners can only be managed by owners, and never below one active owner. */
async function assertCanManage(ctx: AppContext, target: MemberDTO, opts: { removesOwner: boolean }) {
  if (target.roleKey === "owner" && !isOwner(ctx)) fail("settings.errors.ownerOnly");
  if (opts.removesOwner && target.roleKey === "owner" && target.status === "active" && (await activeOwnerCount(ctx)) <= 1) {
    fail("errors.lastOwner");
  }
}

export const inviteMemberAction = action(
  { schema: inviteMemberInput, permission: "manage_users" },
  async (input, ctx): Promise<SetupLinkResult> => {
    const role = await loadRole(ctx, input.roleId);
    if (role.key === "owner" && !isOwner(ctx)) fail("settings.errors.ownerOnly");
    const access = await resolveBranchAccess(ctx, role, input);
    const { uid, created } = await findOrCreateAuthUser(input.email, input.displayName);

    const memberRef = orgCol(ctx.org.id, "members").doc(uid);
    if ((await memberRef.get()).exists) fail("errors.validation", { email: "settings.errors.alreadyMember" });
    await assertStaffLinkable(ctx, input.staffId, uid);

    const now = FieldValue.serverTimestamp();
    const roleKey = memberRoleKey(role);
    const batch = db().batch();
    batch.set(memberRef, {
      uid,
      email: input.email,
      displayName: input.displayName,
      roleId: role.id,
      roleKey,
      roleName: role.name,
      permissions: role.permissions,
      allBranches: access.allBranches,
      branchIds: access.branchIds,
      staffId: input.staffId,
      status: "active",
      invitedByUid: ctx.session.uid,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(
      userRef(uid),
      {
        uid,
        email: input.email,
        ...(created ? { displayName: input.displayName, lastOrgId: ctx.org.id, createdAt: now } : {}),
        updatedAt: now,
      },
      { merge: true },
    );
    batch.set(userRef(uid).collection("orgs").doc(ctx.org.id), {
      orgId: ctx.org.id,
      orgName: ctx.org.name,
      roleKey,
      createdAt: now,
    });
    if (input.staffId) {
      batch.update(orgCol(ctx.org.id, "staff").doc(input.staffId), { memberUid: uid, updatedAt: now });
    }
    audit(
      ctx,
      {
        action: "member.invited",
        entity: "member",
        entityId: uid,
        summary: `${input.displayName} <${input.email}> · ${role.name}`,
      },
      batch,
    );
    await batch.commit();

    const link = await passwordSetupLink(input.email);
    return { uid, email: input.email, displayName: input.displayName, created, link };
  },
);

export const memberSetupLinkAction = action(
  { schema: uidInput, permission: "manage_users", revalidate: false },
  async ({ uid }, ctx): Promise<SetupLinkResult> => {
    const member = await loadMember(ctx, uid);
    if (!member.email) fail("errors.notFound");
    const link = await passwordSetupLink(member.email);
    return { uid, email: member.email, displayName: member.displayName, created: false, link };
  },
);

const AUDITED = ["displayName", "roleId", "roleName", "allBranches", "branchIds", "staffId"];

export const updateMemberAction = action(
  { schema: updateMemberInput, permission: "manage_users" },
  async (input, ctx) => {
    const before = await loadMember(ctx, input.uid);
    const role = await loadRole(ctx, input.roleId);
    const roleKey = memberRoleKey(role);
    if (roleKey === "owner" && !isOwner(ctx)) fail("settings.errors.ownerOnly");
    await assertCanManage(ctx, before, { removesOwner: roleKey !== "owner" });
    const access = await resolveBranchAccess(ctx, role, input);
    if (input.staffId !== before.staffId) await assertStaffLinkable(ctx, input.staffId, input.uid);

    const now = FieldValue.serverTimestamp();
    const data = {
      displayName: input.displayName,
      roleId: role.id,
      roleKey,
      roleName: role.name,
      permissions: role.permissions,
      allBranches: access.allBranches,
      branchIds: access.branchIds,
      staffId: input.staffId,
      updatedAt: now,
    };
    const batch = db().batch();
    batch.update(orgCol(ctx.org.id, "members").doc(input.uid), data);
    batch.set(userRef(input.uid).collection("orgs").doc(ctx.org.id), { roleKey }, { merge: true });
    if (input.staffId !== before.staffId) {
      if (before.staffId) {
        const old = await orgCol(ctx.org.id, "staff").doc(before.staffId).get();
        if (old.exists && old.get("memberUid") === input.uid) batch.update(old.ref, { memberUid: null, updatedAt: now });
      }
      if (input.staffId) batch.update(orgCol(ctx.org.id, "staff").doc(input.staffId), { memberUid: input.uid, updatedAt: now });
    }
    audit(
      ctx,
      {
        action: "member.updated",
        entity: "member",
        entityId: input.uid,
        summary: `${input.displayName} · ${role.name}`,
        changes: diff({ ...before }, data, AUDITED),
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);

export const setMemberStatusAction = action(
  { schema: memberStatusInput, permission: "manage_users" },
  async ({ uid, status }, ctx) => {
    if (uid === ctx.session.uid) fail("settings.errors.cannotChangeSelf");
    const member = await loadMember(ctx, uid);
    await assertCanManage(ctx, member, { removesOwner: status === "suspended" });
    const batch = db().batch();
    batch.update(orgCol(ctx.org.id, "members").doc(uid), { status, updatedAt: FieldValue.serverTimestamp() });
    audit(
      ctx,
      {
        action: status === "suspended" ? "member.suspended" : "member.reactivated",
        entity: "member",
        entityId: uid,
        summary: `${member.displayName || member.email}`,
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);

export const removeMemberAction = action(
  { schema: uidInput, permission: "manage_users" },
  async ({ uid }, ctx) => {
    if (uid === ctx.session.uid) fail("settings.errors.cannotChangeSelf");
    const member = await loadMember(ctx, uid);
    await assertCanManage(ctx, member, { removesOwner: true });
    const batch = db().batch();
    batch.delete(orgCol(ctx.org.id, "members").doc(uid));
    batch.delete(userRef(uid).collection("orgs").doc(ctx.org.id));
    const user = await userRef(uid).get();
    if (user.exists && user.get("lastOrgId") === ctx.org.id) batch.update(user.ref, { lastOrgId: FieldValue.delete() });
    if (member.staffId) {
      const staff = await orgCol(ctx.org.id, "staff").doc(member.staffId).get();
      if (staff.exists && staff.get("memberUid") === uid) {
        batch.update(staff.ref, { memberUid: null, updatedAt: FieldValue.serverTimestamp() });
      }
    }
    audit(
      ctx,
      {
        action: "member.removed",
        entity: "member",
        entityId: uid,
        summary: `${member.displayName || member.email} <${member.email}>`,
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);
