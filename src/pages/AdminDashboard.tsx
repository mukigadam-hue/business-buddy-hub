import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Shield, ArrowLeft, Crown, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  is_premium: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  async function checkAdminAndLoad() {
    if (!user) return;
    const { data: roleCheck } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!roleCheck) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);
    const { data, error } = await supabase.rpc('admin_list_profiles');
    if (error) {
      toast.error('Failed to load users');
    } else {
      setProfiles((data as ProfileRow[]) || []);
    }
    setLoading(false);
  }

  async function togglePremium(userId: string, newValue: boolean) {
    setToggling(userId);
    const { error } = await supabase.rpc('admin_set_premium', { _user_id: userId, _is_premium: newValue });
    if (error) {
      toast.error('Failed to update premium status');
    } else {
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_premium: newValue } : p));
      toast.success(newValue ? 'Premium access granted' : 'Premium access revoked');
    }
    setToggling(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Shield className="h-16 w-16 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-sm">You do not have admin privileges.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const premiumCount = profiles.filter(p => p.is_premium).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Manage users and premium access</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" /> Total Users
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{profiles.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Crown className="h-4 w-4 text-amber-500" /> Premium Users
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{premiumCount}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Premium</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map(profile => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.full_name || 'No Name'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{profile.email}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {profile.is_premium && <Crown className="h-4 w-4 text-amber-500" />}
                      <Switch
                        checked={profile.is_premium}
                        disabled={toggling === profile.id}
                        onCheckedChange={(val) => togglePremium(profile.id, val)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No registered users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
