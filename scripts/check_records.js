const auth = 'Basic ' + Buffer.from('test@liferay.com:test').toString('base64');
async function run() {
  const [lRes, dRes] = await Promise.all([
    fetch('http://localhost:8080/o/c/leads?pageSize=-1', { headers: { 'Authorization': auth } }),
    fetch('http://localhost:8080/o/c/deals?pageSize=-1', { headers: { 'Authorization': auth } })
  ]);
  const leads = (await lRes.json()).items || [];
  const deals = (await dRes.json()).items || [];
  console.log('=== LEADS (' + leads.length + ') ===');
  leads.forEach(l => console.log('Lead ID: ' + l.id + ' | Name: ' + l.leadName + ' | Phone: ' + l.leadPhone));
  console.log('=== DEALS (' + deals.length + ') ===');
  deals.forEach(d => console.log('Deal ID: ' + d.id + ' | Code: ' + d.dealId + ' | Status: ' + d.dealStatus + ' | LeadId: ' + d.r_leadDeals_c_leadId));
}
run();
