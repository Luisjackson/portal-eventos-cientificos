(() => {
  const organizationLinks = [...document.querySelectorAll('[data-organization-nav]')];

  window.setupOrganizationNavigation = async function setupOrganizationNavigation(client) {
    if (!organizationLinks.length || !client) return;
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) {
      organizationLinks.forEach((link) => { link.hidden = true; });
      return;
    }
    const { data, error } = await client.from('organizations').select('id').limit(1);
    const visible = !error && Boolean(data?.length);
    organizationLinks.forEach((link) => { link.hidden = !visible; });
  };
})();
