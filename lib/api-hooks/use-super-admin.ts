import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  listClients,
  updateClient,
  createClient,
  listClientPayments,
  recordClientPayment,
  getClientLogs,
  listSuperAdminUsers,
  createSuperAdminUser,
  updateSuperAdminUser,
  deleteSuperAdminUser,
  getPlatformStats,
  updateProfile,
  getActivityLogs,
  type UpdateClientDto,
  type CreateClientDto,
  type CreatePaymentDto,
  type UpdateProfileDto,
} from "@/lib/super-admin-api";

export function useSuperAdminClients() {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.superAdmin.clients,
    queryFn: () => listClients(accessToken!),
    enabled: !!accessToken,
  });
}

export function useUpdateClient() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      dto,
    }: {
      clientId: string;
      dto: UpdateClientDto;
    }) => updateClient(clientId, dto, accessToken!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.superAdmin.clients });
    },
  });
}

export function useCreateClient() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateClientDto) => createClient(dto, accessToken!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.superAdmin.clients });
    },
  });
}

export function useClientPayments(clientId: string) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.superAdmin.clientPayments(clientId),
    queryFn: () => listClientPayments(clientId, accessToken!),
    enabled: !!accessToken && !!clientId,
  });
}

export function useRecordClientPayment() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      dto,
    }: {
      clientId: string;
      dto: CreatePaymentDto;
    }) => recordClientPayment(clientId, dto, accessToken!),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.superAdmin.clientPayments(vars.clientId),
      });
    },
  });
}

export function useClientLogs(clientId: string, skip = 0, take = 100) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.superAdmin.clientLogs(clientId),
    queryFn: () => getClientLogs(clientId, accessToken!, skip, take),
    enabled: !!accessToken && !!clientId,
  });
}

export function useSuperAdminUsers() {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.superAdmin.users,
    queryFn: () => listSuperAdminUsers(accessToken!),
    enabled: !!accessToken,
  });
}

export function useCreateSuperAdminUser() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      name: string;
      identifier: string;
      password: string;
    }) => createSuperAdminUser(dto, accessToken!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.superAdmin.users });
    },
  });
}

export function useUpdateSuperAdminUser() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      dto,
    }: {
      userId: string;
      dto: { name?: string; password?: string };
    }) => updateSuperAdminUser(userId, dto, accessToken!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.superAdmin.users });
    },
  });
}

export function useDeleteSuperAdminUser() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      deleteSuperAdminUser(userId, accessToken!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.superAdmin.users });
    },
  });
}

export function usePlatformStats() {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.superAdmin.platformStats,
    queryFn: () => getPlatformStats(accessToken!),
    enabled: !!accessToken,
  });
}

export function useUpdateProfile() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateProfileDto) => updateProfile(accessToken!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.superAdmin.all });
    },
  });
}

export function useActivityLogs(
  clientId: string,
  params?: { actorType?: string; action?: string; skip?: number; take?: number },
) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.superAdmin.activityLogs(clientId),
    queryFn: () => getActivityLogs(clientId, accessToken!, params),
    enabled: !!accessToken && !!clientId,
  });
}
