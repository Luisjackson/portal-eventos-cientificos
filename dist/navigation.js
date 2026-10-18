(() => {
  const organizationLinks = [...document.querySelectorAll('[data-organization-nav]')];
  if (!organizationLinks.length || !window.supabase) return;

  const client = window.supabase.createClient(
    'https://tgcaycijcaoemaztkwfn.supabase.co',
    'sb_publishable_s2DegO56caEwHGt2Op_Szg_F3dR6i5c',
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );

  async function updateOrganizationNavigation() {
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) return;
    const { data, error } = await client.from('organizations').select('id').limit(1);
    const visible = !error && Boolean(data?.length);
    organizationLinks.forEach((link) => { link.hidden = !visible; });
  }

  client.auth.onAuthStateChange(() => updateOrganizationNavigation());
  updateOrganizationNavigation();
})();
