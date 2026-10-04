import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, isSupabaseConfigured, appMode } from '@/lib/env';
import { getUser, demoStore } from '../_utils';
import { canModerate, getUserRole } from '../_helpers';
import { getSupabaseServer } from '@/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, departmentId, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Demo mode: actually create the invited teammate in the demo store so
    // the workspace (members lists, Get Started progress) reflects it.
    if (appMode !== 'supabase') {
      console.log(`[DEMO] Invitation sent to ${email}`);
      const existing = demoStore.users.find((u: { email: string }) => u.email === email);
      if (existing) {
        return NextResponse.json({
          success: true,
          message: `Demo invitation sent to ${email}`,
          user: existing,
        });
      }
      const invitedUser = {
        id: `usr-${Date.now()}`,
        name: name || email.split('@')[0] || 'New Member',
        email,
        avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 100)}?w=150&auto=format&fit=crop&q=80`,
        role: role || 'MEMBER',
        title: '',
        departmentId: departmentId || null,
        status: 'online' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      demoStore.users.push(invitedUser);
      return NextResponse.json({
        success: true,
        message: `Demo invitation sent to ${email}`,
        inviteToken: `demo-token-${Date.now()}`,
        user: invitedUser,
      });
    }

    // Only moderators/admins may invite people to the workspace.
    const supabase = await getSupabaseServer();
    const role0 = await getUserRole(supabase ?? null, user.id);
    if (!canModerate(role0)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isSupabaseConfigured || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Supabase not fully configured. Set SUPABASE_SERVICE_ROLE_KEY to send real invitations.' 
      }, { status: 500 });
    }

    // Use admin client to send invitation
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create the user invitation
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: name || '',
        department_id: departmentId,
        role: role || 'MEMBER',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup`,
    });

    if (inviteError) {
      console.error('Invite error:', inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Log the activity
    try {
      await supabaseAdmin.from('activity_logs').insert({
        user_id: inviteData.user?.id || 'system',
        action: 'Sent Invitation',
        target_type: 'USER',
        target_title: email,
        details: `Invited ${name || email} as ${role || 'MEMBER'}`,
      });
    } catch (logError) {
      // Non-critical, just log
      console.warn('Failed to log activity:', logError);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Invitation sent to ${email}`,
      user: inviteData.user 
    });

  } catch (error) {
    console.error('Invite API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}