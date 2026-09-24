const auth = 'Basic ' + Buffer.from('test@liferay.com:test').toString('base64');

async function cleanDuplicates() {
  const [lRes, dRes, aRes, sRes] = await Promise.all([
    fetch('http://localhost:8080/o/c/leads?pageSize=-1', { headers: { 'Authorization': auth } }),
    fetch('http://localhost:8080/o/c/deals?pageSize=-1', { headers: { 'Authorization': auth } }),
    fetch('http://localhost:8080/o/c/dealassignments?pageSize=-1', { headers: { 'Authorization': auth } }),
    fetch('http://localhost:8080/o/c/salelogs?pageSize=-1', { headers: { 'Authorization': auth } })
  ]);
  const leads = (await lRes.json()).items || [];
  const deals = (await dRes.json()).items || [];
  const assigns = (await aRes.json()).items || [];
  const logs = (await sRes.json()).items || [];

  console.log('Total leads:', leads.length);
  console.log('Total deals:', deals.length);

  // Group deals by leadId
  const leadDeals = {};
  deals.forEach(d => {
    const lid = d.r_leadDeals_c_leadId;
    if (!leadDeals[lid]) leadDeals[lid] = [];
    leadDeals[lid].push(d);
  });

  for (const lid in leadDeals) {
    const dList = leadDeals[lid];
    if (dList.length > 1) {
      console.log(`Lead ${lid} has ${dList.length} deals!`);
      // Keep the first deal (dList[0]), delete the rest (dList[1..])
      for (let i = 1; i < dList.length; i++) {
        const dealToDelete = dList[i];
        console.log(`Cleaning up duplicate deal ${dealToDelete.id} (${dealToDelete.dealId})...`);

        // Delete any dealassignments linked to this deal
        const relatedAssigns = assigns.filter(a => a.r_dealAssignments_c_dealId == dealToDelete.id);
        for (const ra of relatedAssigns) {
          console.log(`Deleting assign ${ra.id}...`);
          await fetch(`http://localhost:8080/o/c/dealassignments/${ra.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': auth }
          });
        }

        // Delete any salelogs linked to this deal
        const relatedLogs = logs.filter(l => l.r_dealSaleLogs_c_dealId == dealToDelete.id);
        for (const rl of relatedLogs) {
          console.log(`Deleting log ${rl.id}...`);
          await fetch(`http://localhost:8080/o/c/salelogs/${rl.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': auth }
          });
        }

        // Delete deal
        const delRes = await fetch(`http://localhost:8080/o/c/deals/${dealToDelete.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': auth }
        });
        console.log(`Deleted deal ${dealToDelete.id}: status ${delRes.status}`);
      }
    }
  }

  // Also check if there are duplicate leads by phone
  const phoneMap = {};
  leads.forEach(l => {
    const p = (l.leadPhone || '').trim();
    if (!phoneMap[p]) phoneMap[p] = [];
    phoneMap[p].push(l);
  });

  for (const p in phoneMap) {
    if (phoneMap[p].length > 1) {
      console.log(`Duplicate phone ${p} has ${phoneMap[p].length} leads!`);
      // Keep the first lead, delete the rest
      for (let i = 1; i < phoneMap[p].length; i++) {
        const leadDel = phoneMap[p][i];
        console.log(`Deleting duplicate lead ${leadDel.id}...`);
        await fetch(`http://localhost:8080/o/c/leads/${leadDel.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': auth }
        });
      }
    }
  }

  console.log('Cleanup finished!');
}

cleanDuplicates();
