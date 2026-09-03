/**
 * hooks/permissions/usePermissions.ts
 * UPDATED — adds getUserEffectivePermissions (PERM-08)
 * Place at: hooks/permissions/usePermissions.ts (replace existing)
 */
"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  GetRoleTemplatesResponse,
  CreateRoleTemplateResponse,
  UpdateRoleTemplateResponse,
  GrantPermissionResponse,
  RevokePermissionResponse,
  AssignRoleTemplateResponse,
  GetAuditLogResponse,
  GetUserEffectivePermissionsResponse,  // ← NEW
  ApiErrorResponse,
  CreateRoleTemplateRequest,
  UpdateRoleTemplateRequest,
  GrantPermissionRequest,
  RevokePermissionRequest,
  AssignRoleTemplateRequest,
  GetRoleTemplatesQuery,
  GetAuditLogQuery,
  PermissionScope,                       // ← NEW
} from "@/types/api";

// ─── State ────────────────────────────────────────────────────────────────────

interface PermissionsState {
  roleTemplates:       GetRoleTemplatesResponse | null;
  auditLog:            GetAuditLogResponse | null;
  userEffective:       GetUserEffectivePermissionsResponse | null;  // ← NEW
  loading:             boolean;
  error:               string | null;
}

// ─── Query string helper ──────────────────────────────────────────────────────

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ) as [string, string][];
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions(masjidId: string) {
  const [state, setState] = useState<PermissionsState>({
    roleTemplates:  null,
    auditLog:       null,
    userEffective:  null,
    loading:        false,
    error:          null,
  });

  const base = `/api/masjids/${masjidId}/permissions`;

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── PERM-01: GET role templates ───────────────────────────────────────────

  const getRoleTemplates = useCallback(
    async (query: GetRoleTemplatesQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetRoleTemplatesResponse>(
          `${base}/role-templates${qs}`
        );
        setState((prev) => ({ ...prev, roleTemplates: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch role templates.");
        return null;
      }
    },
    [base]
  );

  // ── PERM-02: POST create role template ────────────────────────────────────

  const createRoleTemplate = useCallback(
    async (body: CreateRoleTemplateRequest) => {
      startLoading();
      try {
        const data = await apiFetch<CreateRoleTemplateResponse>(
          `${base}/role-templates`,
          { method: "POST", body: JSON.stringify(body) }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create role template.");
        return null;
      }
    },
    [base]
  );

  // ── PERM-03: PUT update role template ─────────────────────────────────────

  const updateRoleTemplate = useCallback(
    async (templateId: string, body: UpdateRoleTemplateRequest) => {
      startLoading();
      try {
        const data = await apiFetch<UpdateRoleTemplateResponse>(
          `${base}/role-templates/${templateId}`,
          { method: "PUT", body: JSON.stringify(body) }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update role template.");
        return null;
      }
    },
    [base]
  );

  // ── PERM-04: POST grant permission ────────────────────────────────────────

  const grantPermission = useCallback(
    async (body: GrantPermissionRequest) => {
      startLoading();
      try {
        const data = await apiFetch<GrantPermissionResponse>(
          `${base}/grant`,
          { method: "POST", body: JSON.stringify(body) }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to grant permission.");
        return null;
      }
    },
    [base]
  );

  // ── PERM-05: POST revoke permission ───────────────────────────────────────

  const revokePermission = useCallback(
    async (body: RevokePermissionRequest) => {
      startLoading();
      try {
        const data = await apiFetch<RevokePermissionResponse>(
          `${base}/revoke`,
          { method: "POST", body: JSON.stringify(body) }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to revoke permission.");
        return null;
      }
    },
    [base]
  );

  // ── PERM-06: POST assign role template ───────────────────────────────────

  const assignRoleTemplate = useCallback(
    async (body: AssignRoleTemplateRequest) => {
      startLoading();
      try {
        const data = await apiFetch<AssignRoleTemplateResponse>(
          `${base}/assign-role-template`,
          { method: "POST", body: JSON.stringify(body) }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign role template.");
        return null;
      }
    },
    [base]
  );

  // ── PERM-07: GET audit log ────────────────────────────────────────────────

  const getAuditLog = useCallback(
    async (query: GetAuditLogQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetAuditLogResponse>(
          `${base}/audit-log${qs}`
        );
        setState((prev) => ({ ...prev, auditLog: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch audit log.");
        return null;
      }
    },
    [base]
  );

  // ── PERM-08: GET user effective permissions ───────────────────────────────

  const getUserEffectivePermissions = useCallback(
    async (userId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetUserEffectivePermissionsResponse>(
          `${base}/user/${userId}`
        );
        setState((prev) => ({ ...prev, userEffective: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user permissions.");
        return null;
      }
    },
    [base]
  );

  // ── Scope check helper ────────────────────────────────────────────────────
  // Usage: const canManageDonations = hasScope("donations:manage")

  const hasScope = useCallback(
    (scope: PermissionScope): boolean => {
      const scopes = state.userEffective?.data?.effective_scopes ?? [];
      return scopes.includes(scope);
    },
    [state.userEffective]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    roleTemplates:  state.roleTemplates,
    auditLog:       state.auditLog,
    userEffective:  state.userEffective,   // ← NEW
    loading:        state.loading,
    error:          state.error,

    // Actions
    getRoleTemplates,
    createRoleTemplate,
    updateRoleTemplate,
    grantPermission,
    revokePermission,
    assignRoleTemplate,
    getAuditLog,
    getUserEffectivePermissions,           // ← NEW
    hasScope,                              // ← NEW helper
    clearError,
  };
}