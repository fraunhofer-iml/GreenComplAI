import React, { useEffect, useState } from 'react';
import '../css/App.css';
import { getUserProfile } from '../service/UserService';

export type UserProfile = {
  username: string;
  email?: string;
  roles?: string[];
};

export default function ProfileView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserProfile()
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div>Auth check failed: {error}</div>;
  if (!profile) return <div>Loading profile...</div>;
  return <div>Welcome, {profile.username ?? profile.email ?? 'User'}</div>;
}
