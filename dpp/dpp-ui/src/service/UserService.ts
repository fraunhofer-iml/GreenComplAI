import apiClient, { apiFetch } from '../util/ApiClient';
import { UserProfile } from '../view/ProfileView';

export async function getUserProfile() {
  const res = await apiClient.get<UserProfile>("/api/user/me");
  const res2 = await apiFetch("/api/user/me");
  return res2.data;
}
