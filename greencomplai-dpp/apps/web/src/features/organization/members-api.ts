import type {
	CreatedInvitationResponse,
	InvitationResponse,
	MemberResponse,
	MembershipStatus,
} from "@dpp/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "#/features/api/client";

import type { OrganizationRole } from "./organizations-api";

// Derived from the response schemas: member, invitation and the one-off
// invitation reply are shapes of the API, not of the UI.
export type { MembershipStatus };
export type Member = MemberResponse;
export type Invitation = InvitationResponse;
export type CreatedInvitation = CreatedInvitationResponse;

const membersKey = ["organization", "members"];
const invitationsKey = ["organization", "invitations"];

export function useMembers(enabled: boolean) {
	return useQuery({
		queryKey: membersKey,
		queryFn: async () =>
			(await apiRequest<{ result: Member[] }>("/members")).result,
		enabled,
	});
}

export function useInvitations(enabled: boolean) {
	return useQuery({
		queryKey: invitationsKey,
		queryFn: async () =>
			(await apiRequest<{ result: Invitation[] }>("/invitations")).result,
		enabled,
	});
}

export function useInviteMember() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: { email: string; role: OrganizationRole }) =>
			(
				await apiRequest<{ result: CreatedInvitation }>("/invitations", {
					method: "POST",
					body: input,
				})
			).result,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: invitationsKey });
		},
	});
}

export function useRevokeInvitation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (invitationId: string) =>
			apiRequest<{ result: { id: string } }>(
				`/invitations/${encodeURIComponent(invitationId)}`,
				{ method: "DELETE" },
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: invitationsKey });
		},
	});
}

export function useChangeMemberRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: { userId: string; role: OrganizationRole }) =>
			apiRequest(`/members/${encodeURIComponent(input.userId)}`, {
				method: "PATCH",
				body: { role: input.role },
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: membersKey });
		},
	});
}

export function useChangeMemberStatus() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			userId: string;
			status: "active" | "disabled";
		}) =>
			apiRequest(`/members/${encodeURIComponent(input.userId)}`, {
				method: "PATCH",
				body: { status: input.status },
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: membersKey });
		},
	});
}
