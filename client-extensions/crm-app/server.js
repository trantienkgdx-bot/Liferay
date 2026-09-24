const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LIFERAY_BASE_URL = process.env.LIFERAY_BASE_URL || 'http://localhost:8080';
const AUTH_HEADER = 'Basic ' + Buffer.from('test@liferay.com:test').toString('base64');

async function liferayFetch(endpoint, options = {}) {
  const url = `${LIFERAY_BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': AUTH_HEADER,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Liferay API Error [${response.status}] ${url}: ${errorText}`);
  }
  if (response.status === 204) return null;
  return await response.json();
}

// Helper: Phân bổ Sale theo thuật toán Least Recently Assigned (Chức năng 1.2)
async function getAssignedSaleStaff() {
  try {
    const staffRes = await liferayFetch('/o/c/salestaffs?pageSize=-1');
    const activeStaffs = (staffRes.items || []).filter(s => s.saleIsDuty === true);
    if (activeStaffs.length === 0) return null;

    activeStaffs.sort((a, b) => {
      const tA = a.saleLastAssignedTime ? new Date(a.saleLastAssignedTime).getTime() : 0;
      const tB = b.saleLastAssignedTime ? new Date(b.saleLastAssignedTime).getTime() : 0;
      return tA - tB;
    });
    return activeStaffs[0];
  } catch (err) {
    console.error('Lỗi lấy SaleStaff:', err.message);
    return null;
  }
}

// Helper: Gán Deal cho Sale và cập nhật thời gian
async function assignSaleToDeal(dealId, saleId) {
  try {
    await liferayFetch('/o/c/dealassignments', {
      method: 'POST',
      body: JSON.stringify({
        assignAt: new Date().toISOString(),
        assignStatus: 'ACTIVE',
        r_dealAssignments_c_dealId: dealId,
        r_saleAssignments_c_saleStaffId: saleId
      })
    });

    await liferayFetch(`/o/c/salestaffs/${saleId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        saleLastAssignedTime: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error('Lỗi phân công DealAssignment:', err.message);
  }
}

// 1. API: Danh sách Khóa học / Lớp học (Chức năng Quản lý Lớp)
app.get('/api/courses', async (req, res) => {
  try {
    const data = await liferayFetch('/o/c/courses?pageSize=-1');
    res.json(data.items || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm Khóa học / Lớp học mới
app.post('/api/courses', async (req, res) => {
  try {
    const { courseId, courseName, courseTuitionFee, courseDepositFee } = req.body;
    if (!courseName) return res.status(400).json({ error: 'Tên khóa học / lớp học là bắt buộc!' });

    const code = courseId || `CLASS-${Date.now().toString().slice(-6)}`;
    const created = await liferayFetch('/o/c/courses', {
      method: 'POST',
      body: JSON.stringify({
        courseId: code,
        courseName: courseName.trim(),
        courseTuitionFee: Number(courseTuitionFee) || 0,
        courseDepositFee: Number(courseDepositFee) || 0
      })
    });
    res.json({ success: true, course: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa Khóa học / Lớp học
app.delete('/api/courses/:id', async (req, res) => {
  try {
    await liferayFetch(`/o/c/courses/${req.params.id}`, { method: 'DELETE' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. API: Danh sách Nhân viên Sale
app.get('/api/staff', async (req, res) => {
  try {
    const data = await liferayFetch('/o/c/salestaffs?pageSize=-1');
    res.json(data.items || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. API Dành cho Landing Page Khách hàng (Chức năng 0.1 & 0.2: Chống trùng SĐT toàn diện)
app.post('/api/register', async (req, res) => {
  try {
    let { leadName, leadPhone, leadEmail, leadBirthday, courseId, leadSource, note } = req.body;

    if (!leadName || !leadPhone) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Họ tên và Số điện thoại!' });
    }

    const cleanPhone = leadPhone.trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ!' });
    }

    // Lấy thông tin khóa học nếu có
    let courseObj = null;
    if (courseId) {
      try {
        courseObj = await liferayFetch(`/o/c/courses/${courseId}`);
      } catch (e) {}
    }
    const courseName = courseObj ? courseObj.courseName : 'Chưa chọn';

    // --- BƯỚC 1: KIỂM TRA SĐT ĐÃ TỒN TẠI TRONG BẢNG LEAD CHƯA (Chống trùng 0.2) ---
    let leadRecord = null;
    try {
      const searchRes = await liferayFetch(`/o/c/leads?filter=leadPhone%20eq%20'${cleanPhone}'`);
      if (searchRes.items && searchRes.items.length > 0) {
        leadRecord = searchRes.items[0];
      }
    } catch (e) {
      console.log('Query lead phone err:', e.message);
    }

    if (leadRecord) {
      // SỐ ĐIỆN THOẠI ĐÃ TỒN TẠI TRONG CSDL:
      // Cập nhật thông tin bổ sung nếu trước đó còn thiếu
      const patchData = {};
      if (leadEmail && !leadRecord.leadEmail) patchData.leadEmail = leadEmail;
      if (leadBirthday && !leadRecord.leadBirthday) patchData.leadBirthday = leadBirthday;
      if (Object.keys(patchData).length > 0) {
        try {
          await liferayFetch(`/o/c/leads/${leadRecord.id}`, { method: 'PATCH', body: JSON.stringify(patchData) });
        } catch (e) {}
      }

      // Lấy tất cả các Deal hiện có của Lead này
      let existingDeals = [];
      try {
        const dealsRes = await liferayFetch(`/o/c/leads/${leadRecord.id}/leadDeals?pageSize=-1`);
        existingDeals = dealsRes.items || [];
      } catch (e) {
        try {
          const dealsRes = await liferayFetch(`/o/c/deals?filter=r_leadDeals_c_leadERC%20eq%20'${leadRecord.externalReferenceCode}'&pageSize=-1`);
          existingDeals = dealsRes.items || [];
        } catch (e2) {}
      }

      // Kiểm tra xem khách có Deal nào ĐANG TRONG PHỄU (ACTIVE) ở bất kỳ cột nào không:
      // NEW (Mới), PENDING_CONSULT (Chờ tư vấn), PENDING_DEPOSIT (Chờ cọc)
      const ACTIVE_STATUSES = ['NEW', 'PENDING_CONSULT', 'PENDING_DEPOSIT'];
      const activeDeal = existingDeals.find(d => ACTIVE_STATUSES.includes(d.dealStatus));

      if (activeDeal) {
        // === TRƯỜNG HỢP 1: ĐÃ CÓ DEAL ĐANG XỬ LÝ TRÊN PHỄU (NẰM Ở BẤT KỲ CỘT NÀO) ===
        // TUYỆT ĐỐI KHÔNG TẠO DEAL MỚI để tránh rác phễu và trùng lặp!
        // Ghi thêm nhật ký SaleLog thông báo cho Sale đang phụ trách
        const logContent = `[KHÁCH GỬI LẠI YÊU CẦU TỪ WEB FORM] Khách vừa gửi lại yêu cầu tư vấn. Khóa học quan tâm: "${courseName}". Ghi chú: "${note || 'Không có ghi chú'}"`;

        await liferayFetch('/o/c/salelogs', {
          method: 'POST',
          body: JSON.stringify({
            logChannel: 'Website Form',
            logOutcome: 'Khách gửi lại thông tin',
            logNoteContent: logContent,
            logCreatedAt: new Date().toISOString(),
            r_dealSaleLogs_c_dealId: activeDeal.id
          })
        });

        // Cập nhật dealLastContactDate
        await liferayFetch(`/o/c/deals/${activeDeal.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            dealLastContactDate: new Date().toISOString()
          })
        });

        return res.json({
          success: true,
          isExistingActive: true,
          message: `Chào bạn ${leadRecord.leadName}! Hệ thống nhận thấy bạn đã có hồ sơ tư vấn đang được xử lý. Yêu cầu mới của bạn đã được cập nhật thêm vào hồ sơ, chuyên viên tư vấn sẽ liên hệ lại với bạn ngay!`
        });
      }

      // === TRƯỜNG HỢP 2: TẤT CẢ DEALS CŨ ĐÃ KẾT THÚC (COMPLETED hoặc CANCELLED) ===
      // Khách cũ quay lại đăng ký khóa học mới -> Tái sử dụng Lead cũ, tạo 1 Deal mới trên phễu
      const assignedSale = await getAssignedSaleStaff();

      const dealPayload = {
        dealId: `DEAL-${Date.now().toString().slice(-6)}`,
        dealStatus: 'NEW',
        assignStatus: assignedSale ? 'ASSIGNED' : 'WAITING',
        dealTestScore: 0,
        dealPaidAmount: 0,
        dealCreatedAt: new Date().toISOString(),
        dealLastContactDate: new Date().toISOString(),
        r_leadDeals_c_leadId: leadRecord.id
      };
      if (courseId) dealPayload.r_courseDeals_c_courseId = courseId;

      const createdDeal = await liferayFetch('/o/c/deals', {
        method: 'POST',
        body: JSON.stringify(dealPayload)
      });

      if (assignedSale) {
        await assignSaleToDeal(createdDeal.id, assignedSale.id);
      }

      // Ghi log ghi nhận khách cũ quay lại
      await liferayFetch('/o/c/salelogs', {
        method: 'POST',
        body: JSON.stringify({
          logChannel: 'Website Form',
          logOutcome: 'Khách cũ quay lại',
          logNoteContent: `Khách hàng cũ (đã từng có ${existingDeals.length} đợt tư vấn trước) quay lại đăng ký khóa học: "${courseName}". Ghi chú: "${note || 'Không có'}"`,
          logCreatedAt: new Date().toISOString(),
          r_dealSaleLogs_c_dealId: createdDeal.id
        })
      });

      return res.json({
        success: true,
        isReturningCustomer: true,
        message: `Chào mừng bạn ${leadRecord.leadName} quay trở lại với Meko! Yêu cầu tư vấn khóa học mới của bạn đã được chuyển đến chuyên viên tư vấn.`
      });
    }

    // === TRƯỜNG HỢP 3: KHÁCH HÀNG HOÀN TOÀN MỚI (SĐT chưa từng tồn tại) ===
    leadRecord = await liferayFetch('/o/c/leads', {
      method: 'POST',
      body: JSON.stringify({
        leadId: `LEAD-${Date.now().toString().slice(-6)}`,
        leadName: leadName.trim(),
        leadPhone: cleanPhone,
        leadEmail: leadEmail ? leadEmail.trim() : '',
        leadBirthday: leadBirthday || null,
        leadSource: 'Form',
        leadCreatedAt: new Date().toISOString()
      })
    });

    const assignedSale = await getAssignedSaleStaff();

    const dealPayload = {
      dealId: `DEAL-${Date.now().toString().slice(-6)}`,
      dealStatus: 'NEW',
      assignStatus: assignedSale ? 'ASSIGNED' : 'WAITING',
      dealTestScore: 0,
      dealPaidAmount: 0,
      dealCreatedAt: new Date().toISOString(),
      dealLastContactDate: new Date().toISOString(),
      r_leadDeals_c_leadId: leadRecord.id
    };
    if (courseId) dealPayload.r_courseDeals_c_courseId = courseId;

    const createdDeal = await liferayFetch('/o/c/deals', {
      method: 'POST',
      body: JSON.stringify(dealPayload)
    });

    if (assignedSale) {
      await assignSaleToDeal(createdDeal.id, assignedSale.id);
    }

    if (note) {
      await liferayFetch('/o/c/salelogs', {
        method: 'POST',
        body: JSON.stringify({
          logChannel: 'Website Form',
          logOutcome: 'Đăng ký mới',
          logNoteContent: `Ghi chú nguyện vọng ban đầu: "${note}"`,
          logCreatedAt: new Date().toISOString(),
          r_dealSaleLogs_c_dealId: createdDeal.id
        })
      });
    }

    res.json({
      success: true,
      isNewCustomer: true,
      message: `Cảm ơn bạn ${leadName}! Yêu cầu tư vấn của bạn đã được tiếp nhận thành công. Chuyên viên tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất!`
    });
  } catch (err) {
    console.error('Lỗi /api/register:', err);
    res.status(500).json({ success: false, message: 'Hệ thống đang bận, vui lòng thử lại sau!' });
  }
});

// 4. API Dành cho Sale: Tra Cứu Khách Hàng Bằng Số Điện Thoại
app.get('/api/leads/lookup', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Thiếu số điện thoại tra cứu!' });

    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    const searchRes = await liferayFetch(`/o/c/leads?filter=leadPhone%20eq%20'${cleanPhone}'`);
    if (!searchRes.items || searchRes.items.length === 0) {
      return res.json({ exists: false, message: 'Số điện thoại này chưa từng có trong hệ thống (Khách hàng mới).' });
    }

    const lead = searchRes.items[0];

    // Lấy toàn bộ lịch sử Deals của khách hàng này
    let deals = [];
    try {
      const dealsRes = await liferayFetch(`/o/c/leads/${lead.id}/leadDeals?pageSize=-1`);
      deals = dealsRes.items || [];
    } catch (e) {
      const dealsRes = await liferayFetch(`/o/c/deals?filter=r_leadDeals_c_leadERC%20eq%20'${lead.externalReferenceCode}'&pageSize=-1`);
      deals = dealsRes.items || [];
    }

    // Lấy thông tin khóa học
    const coursesRes = await liferayFetch('/o/c/courses?pageSize=-1');
    const courseMap = {};
    (coursesRes.items || []).forEach(c => courseMap[c.id] = c);

    // Lấy toàn bộ SaleLogs liên quan
    const logsRes = await liferayFetch('/o/c/salelogs?pageSize=-1');
    const allLogs = logsRes.items || [];

    // Tìm deal đang active (nếu có)
    const ACTIVE_STATUSES = ['NEW', 'PENDING_CONSULT', 'PENDING_DEPOSIT'];
    const activeDeal = deals.find(d => ACTIVE_STATUSES.includes(d.dealStatus));

    const dealsHistory = deals.map(d => {
      const course = courseMap[d.r_courseDeals_c_courseId] || {};
      const logs = allLogs.filter(l => l.r_dealSaleLogs_c_dealId == d.id);
      return {
        id: d.id,
        dealId: d.dealId,
        status: d.dealStatus,
        createdAt: d.dealCreatedAt,
        paidAmount: d.dealPaidAmount || 0,
        lostReason: d.dealLostReason || '',
        lostNote: d.dealLostNote || '',
        testScore: d.dealTestScore || 0,
        courseName: course.courseName || 'Khóa học khác',
        logs: logs
      };
    });

    res.json({
      exists: true,
      isReturning: deals.length > 0,
      totalDeals: deals.length,
      hasActiveDeal: !!activeDeal,
      activeDealId: activeDeal ? activeDeal.id : null,
      activeDealStatus: activeDeal ? activeDeal.dealStatus : null,
      lead: {
        id: lead.id,
        leadId: lead.leadId,
        leadName: lead.leadName,
        leadPhone: lead.leadPhone,
        leadEmail: lead.leadEmail,
        leadBirthday: lead.leadBirthday,
        leadSource: lead.leadSource,
        createdAt: lead.leadCreatedAt
      },
      dealsHistory: dealsHistory
    });
  } catch (err) {
    console.error('Lỗi /api/leads/lookup:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. API Dành cho Sale: Tạo Deal Mới Cho Khách Cũ (hoặc khách gọi hotline)
app.post('/api/deals/create-deal', async (req, res) => {
  try {
    const { leadId, courseId, saleId, source, note } = req.body;

    if (!leadId) return res.status(400).json({ error: 'Thiếu mã khách hàng (leadId)!' });

    const dealPayload = {
      dealId: `DEAL-${Date.now().toString().slice(-6)}`,
      dealStatus: 'NEW',
      assignStatus: saleId ? 'ASSIGNED' : 'WAITING',
      dealTestScore: 0,
      dealPaidAmount: 0,
      dealCreatedAt: new Date().toISOString(),
      dealLastContactDate: new Date().toISOString(),
      r_leadDeals_c_leadId: leadId
    };

    if (courseId) {
      dealPayload.r_courseDeals_c_courseId = courseId;
    }

    const createdDeal = await liferayFetch('/o/c/deals', {
      method: 'POST',
      body: JSON.stringify(dealPayload)
    });

    if (saleId) {
      await assignSaleToDeal(createdDeal.id, saleId);
    }

    // Ghi SaleLog ban đầu
    const logSource = source || 'Tư vấn trực tiếp';
    await liferayFetch('/o/c/salelogs', {
      method: 'POST',
      body: JSON.stringify({
        logChannel: logSource,
        logOutcome: 'Tạo cơ hội mới',
        logNoteContent: note || `Tạo Deal mới từ nguồn: ${logSource}`,
        logCreatedAt: new Date().toISOString(),
        r_dealSaleLogs_c_dealId: createdDeal.id
      })
    });

    res.json({ success: true, deal: createdDeal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. API: Dữ liệu Bảng Kanban (Chức năng 1.3)
app.get('/api/kanban', async (req, res) => {
  try {
    const dealsRes = await liferayFetch('/o/c/deals?pageSize=-1');
    const deals = dealsRes.items || [];

    const [leadsRes, coursesRes, staffRes, assignsRes, logsRes] = await Promise.all([
      liferayFetch('/o/c/leads?pageSize=-1'),
      liferayFetch('/o/c/courses?pageSize=-1'),
      liferayFetch('/o/c/salestaffs?pageSize=-1'),
      liferayFetch('/o/c/dealassignments?pageSize=-1'),
      liferayFetch('/o/c/salelogs?pageSize=-1')
    ]);

    const leadMap = {};
    const leadDealsCount = {};
    (leadsRes.items || []).forEach(l => leadMap[l.id] = l);

    // Đếm số deal của mỗi lead để nhận diện khách cũ
    deals.forEach(d => {
      const lid = d.r_leadDeals_c_leadId;
      if (lid) {
        leadDealsCount[lid] = (leadDealsCount[lid] || 0) + 1;
      }
    });

    const courseMap = {};
    (coursesRes.items || []).forEach(c => courseMap[c.id] = c);

    const staffMap = {};
    (staffRes.items || []).forEach(s => staffMap[s.id] = s);

    const dealAssignMap = {};
    (assignsRes.items || []).forEach(a => {
      if (a.r_dealAssignments_c_dealId) {
        dealAssignMap[a.r_dealAssignments_c_dealId] = a;
      }
    });

    const allLogs = logsRes.items || [];
    const dealLogsMap = {};
    allLogs.forEach(l => {
      const did = l.r_dealSaleLogs_c_dealId;
      if (did) {
        if (!dealLogsMap[did]) dealLogsMap[did] = [];
        dealLogsMap[did].push(l);
      }
    });

    const columns = {
      NEW: [],
      PENDING_CONSULT: [],
      PENDING_DEPOSIT: [],
      COMPLETED: [],
      CANCELLED: []
    };

    deals.forEach(d => {
      const lead = leadMap[d.r_leadDeals_c_leadId] || {};
      const course = courseMap[d.r_courseDeals_c_courseId] || {};
      const assign = dealAssignMap[d.id];
      const sale = assign ? staffMap[assign.r_saleAssignments_c_saleStaffId] : null;

      const totalLeadDeals = leadDealsCount[lead.id] || 1;
      const isReturningLead = totalLeadDeals > 1;

      // Lấy danh sách logs và tìm log gần nhất
      const logs = (dealLogsMap[d.id] || []).sort((a, b) => new Date(b.logCreatedAt).getTime() - new Date(a.logCreatedAt).getTime());
      const latestLog = logs[0] || null;

      // Kiểm tra xem khách có vừa gửi lại yêu cầu khi đang trong phễu không
      const hasRecentResubmit = logs.some(l => (l.logNoteContent || '').includes('[KHÁCH GỬI LẠI YÊU CẦU'));

      const card = {
        id: d.id,
        dealId: d.dealId,
        dealStatus: d.dealStatus || 'NEW',
        paidAmount: d.dealPaidAmount || 0,
        testScore: d.dealTestScore || 0,
        lostReason: d.dealLostReason || '',
        lostNote: d.dealLostNote || '',
        leadId: lead.id,
        leadName: lead.leadName || 'Khách vãng lai',
        leadPhone: lead.leadPhone || '',
        leadEmail: lead.leadEmail || '',
        leadSource: lead.leadSource || 'Website',
        isReturningLead: isReturningLead,
        hasRecentResubmit: hasRecentResubmit,
        totalLeadDeals: totalLeadDeals,
        courseId: course.id || null,
        courseName: course.courseName || 'Chưa chọn khóa học',
        tuitionFee: course.courseTuitionFee || 0,
        depositFee: course.courseDepositFee || 0,
        assignedSaleName: sale ? sale.saleName : 'Chờ phân bổ',
        assignedSalePhone: sale ? sale.salePhone : '',
        createdAt: d.dealCreatedAt,
        lastContactDate: d.dealLastContactDate || d.dealCreatedAt,
        latestLog: latestLog ? {
          channel: latestLog.logChannel,
          outcome: latestLog.logOutcome,
          content: latestLog.logNoteContent,
          at: latestLog.logCreatedAt
        } : null,
        totalLogs: logs.length
      };

      const status = card.dealStatus;
      if (columns[status]) {
        columns[status].push(card);
      } else {
        columns.NEW.push(card);
      }
    });

    res.json(columns);
  } catch (err) {
    console.error('Lỗi /api/kanban:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. API: Chi tiết 1 Deal phục vụ Drawer (Chức năng 1.4)
app.get('/api/deals/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await liferayFetch(`/o/c/deals/${id}`);
    if (!deal) return res.status(404).json({ error: 'Không tìm thấy hồ sơ Deal!' });

    // Lấy thông tin Lead
    let lead = {};
    if (deal.r_leadDeals_c_leadId) {
      try {
        lead = await liferayFetch(`/o/c/leads/${deal.r_leadDeals_c_leadId}`);
      } catch (e) {}
    }

    // Lấy thông tin Khóa học
    let course = {};
    if (deal.r_courseDeals_c_courseId) {
      try {
        course = await liferayFetch(`/o/c/courses/${deal.r_courseDeals_c_courseId}`);
      } catch (e) {}
    }

    // Lấy tất cả SaleLogs của Deal này
    const logsRes = await liferayFetch(`/o/c/salelogs?pageSize=-1`);
    const logs = (logsRes.items || [])
      .filter(l => l.r_dealSaleLogs_c_dealId == id)
      .sort((a, b) => new Date(b.logCreatedAt).getTime() - new Date(a.logCreatedAt).getTime());

    // Lấy thông tin Sale phân công
    const assignsRes = await liferayFetch('/o/c/dealassignments?pageSize=-1');
    const assign = (assignsRes.items || []).find(a => a.r_dealAssignments_c_dealId == id);
    let sale = null;
    if (assign && assign.r_saleAssignments_c_saleStaffId) {
      try {
        sale = await liferayFetch(`/o/c/salestaffs/${assign.r_saleAssignments_c_saleStaffId}`);
      } catch (e) {}
    }

    // Lấy các deal khác của cùng khách này
    let otherDeals = [];
    if (lead.id) {
      try {
        const otherRes = await liferayFetch(`/o/c/leads/${lead.id}/leadDeals?pageSize=-1`);
        otherDeals = (otherRes.items || []).filter(d => d.id != id);
      } catch (e) {}
    }

    res.json({
      deal,
      lead,
      course,
      sale,
      logs,
      otherDeals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. API: Cập nhật trạng thái Deal (Chức năng 1.5 - Hỗ trợ kéo thả & Modal)
app.post('/api/deals/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { dealStatus, paidAmount, lostReason, lostNote, courseId } = req.body;

    const patchBody = { dealStatus };
    if (paidAmount !== undefined) patchBody.dealPaidAmount = Number(paidAmount) || 0;
    if (lostReason) patchBody.dealLostReason = lostReason;
    if (lostNote !== undefined) patchBody.dealLostNote = lostNote;
    if (courseId) patchBody.r_courseDeals_c_courseId = courseId;
    patchBody.dealLastContactDate = new Date().toISOString();

    const updated = await liferayFetch(`/o/c/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patchBody)
    });

    // Tự động ghi 1 dòng log khi chuyển trạng thái
    let logNote = `Chuyển trạng thái sang: [${dealStatus}]`;
    if (dealStatus === 'PENDING_DEPOSIT') {
      logNote = `Khách đồng ý đặt cọc số tiền: ${(Number(paidAmount) || 0).toLocaleString('vi-VN')} đ`;
    } else if (dealStatus === 'CANCELLED') {
      logNote = `Khách hủy hồ sơ. Lý do: ${lostReason}. Ghi chú: ${lostNote || 'Không có'}`;
    } else if (dealStatus === 'COMPLETED') {
      logNote = `Đã hoàn thành hồ sơ! Đã nộp học phí: ${(Number(paidAmount) || 0).toLocaleString('vi-VN')} đ`;
    }

    try {
      await liferayFetch('/o/c/salelogs', {
        method: 'POST',
        body: JSON.stringify({
          logChannel: 'Hệ thống CRM',
          logOutcome: `Đổi trạng thái -> ${dealStatus}`,
          logNoteContent: logNote,
          logCreatedAt: new Date().toISOString(),
          r_dealSaleLogs_c_dealId: id
        })
      });
    } catch (e) {}

    res.json({ success: true, deal: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. API: Ghi nhật ký tư vấn Sale Log (Chức năng 1.4)
app.post('/api/deals/:id/log', async (req, res) => {
  try {
    const { id } = req.params;
    const { logChannel, logOutcome, logNoteContent, nextAppointment } = req.body;

    const log = await liferayFetch('/o/c/salelogs', {
      method: 'POST',
      body: JSON.stringify({
        logChannel: logChannel || 'Điện thoại',
        logOutcome: logOutcome || 'Đã liên hệ',
        logNoteContent: logNoteContent + (nextAppointment ? ` (Hẹn liên hệ lại: ${nextAppointment})` : ''),
        logCreatedAt: new Date().toISOString(),
        r_dealSaleLogs_c_dealId: id
      })
    });

    await liferayFetch(`/o/c/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        dealLastContactDate: new Date().toISOString()
      })
    });

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. NGÂN HÀNG CÂU HỎI & HỆ THỐNG CHẤM ĐIỂM TỰ ĐỘNG (CHỨC NĂNG TEST NĂNG LỰC)
const QUESTION_BANKS = {
  ENGLISH: [
    {
      id: 'q1',
      question: 'Choose the correct form: "By the time the teacher arrived, the students ______ their homework."',
      options: [
        { key: 'A', text: 'finish' },
        { key: 'B', text: 'had finished' },
        { key: 'C', text: 'have finished' },
        { key: 'D', text: 'were finishing' }
      ],
      correct: 'B',
      explanation: 'Thì quá khứ hoàn thành (had finished) diễn tả hành động đã hoàn tất trước một thời điểm/hành động khác trong quá khứ.'
    },
    {
      id: 'q2',
      question: 'Which word is a synonym for "INCREASE"?',
      options: [
        { key: 'A', text: 'Diminish' },
        { key: 'B', text: 'Escalate' },
        { key: 'C', text: 'Plummet' },
        { key: 'D', text: 'Stagnate' }
      ],
      correct: 'B',
      explanation: '"Escalate" đồng nghĩa với "Increase" (tăng trưởng, leo thang).'
    },
    {
      id: 'q3',
      question: 'Complete the sentence: "If she ______ harder, she would have passed the IELTS exam."',
      options: [
        { key: 'A', text: 'studied' },
        { key: 'B', text: 'studies' },
        { key: 'C', text: 'had studied' },
        { key: 'D', text: 'has studied' }
      ],
      correct: 'C',
      explanation: 'Câu điều kiện loại 3 diễn tả giả định trái ngược với quá khứ: If + had + V3/ed, S + would have + V3/ed.'
    },
    {
      id: 'q4',
      question: 'Identify the error: "He is one of the most generous person I have ever known."',
      options: [
        { key: 'A', text: 'is' },
        { key: 'B', text: 'most generous' },
        { key: 'C', text: 'person' },
        { key: 'D', text: 'have ever known' }
      ],
      correct: 'C',
      explanation: 'Sau cụm "one of the..." phải là danh từ số nhiều: "people" thay vì "person".'
    },
    {
      id: 'q5',
      question: 'Choose the best phrase to express an opinion politely: "______, this proposal requires further review."',
      options: [
        { key: 'A', text: 'From my perspective' },
        { key: 'B', text: 'I say that' },
        { key: 'C', text: 'Obviously you know' },
        { key: 'D', text: 'No doubt that' }
      ],
      correct: 'A',
      explanation: '"From my perspective" là cách diễn đạt trang trọng, học thuật phù hợp cho bài thi năng lực.'
    }
  ],
  IT: [
    {
      id: 'q1',
      question: 'Độ phức tạp thời gian (Time Complexity) của thuật toán Binary Search trên mảng đã sắp xếp là gì?',
      options: [
        { key: 'A', text: 'O(1)' },
        { key: 'B', text: 'O(n)' },
        { key: 'C', text: 'O(log n)' },
        { key: 'D', text: 'O(n log n)' }
      ],
      correct: 'C',
      explanation: 'Binary Search chia đôi không gian tìm kiếm sau mỗi bước nên có độ phức tạp O(log n).'
    },
    {
      id: 'q2',
      question: 'Trong JavaScript / Node.js, từ khóa nào dùng để xử lý bất đồng bộ kết hợp với Promise?',
      options: [
        { key: 'A', text: 'try / catch' },
        { key: 'B', text: 'async / await' },
        { key: 'C', text: 'thread / run' },
        { key: 'D', text: 'sync / wait' }
      ],
      correct: 'B',
      explanation: 'Cú pháp async/await giúp viết mã bất đồng bộ đồng bộ hóa và dễ đọc hơn.'
    },
    {
      id: 'q3',
      question: 'Trong Python, kiểu dữ liệu nào sau đây là IMMUTABLE (bất biến, không thể sửa đổi sau khi tạo)?',
      options: [
        { key: 'A', text: 'List' },
        { key: 'B', text: 'Dictionary' },
        { key: 'C', text: 'Tuple' },
        { key: 'D', text: 'Set' }
      ],
      correct: 'C',
      explanation: 'Tuple trong Python là kiểu dữ liệu bất biến (immutable), một khi đã khởi tạo thì không thể thay đổi giá trị phần tử.'
    },
    {
      id: 'q4',
      question: 'Giao thức HTTP sử dụng phương thức nào để gửi yêu cầu CẬP NHẬT MỘT PHẦN tài nguyên?',
      options: [
        { key: 'A', text: 'GET' },
        { key: 'B', text: 'POST' },
        { key: 'C', text: 'PUT' },
        { key: 'D', text: 'PATCH' }
      ],
      correct: 'D',
      explanation: 'Phương thức PATCH dùng để cập nhật từng phần (partial update), còn PUT dùng để thay thế toàn bộ tài nguyên.'
    },
    {
      id: 'q5',
      question: 'Trong hệ quản trị cơ sở dữ liệu quan hệ (RDBMS), khóa ngoại (Foreign Key) dùng để làm gì?',
      options: [
        { key: 'A', text: 'Tăng tốc độ mã hóa dữ liệu' },
        { key: 'B', text: 'Đảm bảo tính toàn vẹn tham chiếu giữa 2 bảng' },
        { key: 'C', text: 'Tự động sao lưu dữ liệu' },
        { key: 'D', text: 'Giới hạn số lượng người dùng truy cập' }
      ],
      correct: 'B',
      explanation: 'Khóa ngoại (Foreign Key) tạo mối liên kết và đảm bảo tính toàn vẹn tham chiếu (referential integrity) giữa hai bảng.'
    }
  ]
};

// API: Lấy thông tin bài kiểm tra năng lực và câu hỏi (ẩn đáp án đúng)
app.get('/api/test/info', async (req, res) => {
  try {
    const { dealId } = req.query;
    if (!dealId) return res.status(400).json({ error: 'Thiếu mã hồ sơ (dealId)!' });

    const deal = await liferayFetch(`/o/c/deals/${dealId}`);
    if (!deal) return res.status(404).json({ error: 'Không tìm thấy hồ sơ Deal!' });

    let lead = {};
    if (deal.r_leadDeals_c_leadId) {
      try { lead = await liferayFetch(`/o/c/leads/${deal.r_leadDeals_c_leadId}`); } catch (e) {}
    }

    let course = {};
    if (deal.r_courseDeals_c_courseId) {
      try { course = await liferayFetch(`/o/c/courses/${deal.r_courseDeals_c_courseId}`); } catch (e) {}
    }

    // Chọn bộ đề thi phù hợp theo khóa học
    const cName = (course.courseName || '').toLowerCase();
    const cCode = (course.courseId || '').toLowerCase();
    let category = 'ENGLISH';
    if (cName.includes('lập trình') || cName.includes('python') || cName.includes('web') || cCode.includes('it')) {
      category = 'IT';
    }

    const questionSet = QUESTION_BANKS[category] || QUESTION_BANKS.ENGLISH;

    // Trả về câu hỏi cho client (ẩn đáp án đúng correct)
    const clientQuestions = questionSet.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options
    }));

    res.json({
      dealId: deal.id,
      dealCode: deal.dealId,
      studentName: lead.leadName || 'Học viên',
      studentPhone: lead.leadPhone || '',
      courseName: course.courseName || 'Khóa học tiêu chuẩn',
      currentScore: deal.dealTestScore || 0,
      category: category,
      totalQuestions: clientQuestions.length,
      questions: clientQuestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Nộp bài kiểm tra & Tự động chấm điểm (Auto-grading)
app.post('/api/test/submit', async (req, res) => {
  try {
    const { dealId, answers } = req.body;
    if (!dealId || !answers) return res.status(400).json({ error: 'Thiếu dữ liệu bài thi!' });

    const deal = await liferayFetch(`/o/c/deals/${dealId}`);
    if (!deal) return res.status(404).json({ error: 'Không tìm thấy hồ sơ Deal!' });

    let course = {};
    if (deal.r_courseDeals_c_courseId) {
      try { course = await liferayFetch(`/o/c/courses/${deal.r_courseDeals_c_courseId}`); } catch (e) {}
    }

    const cName = (course.courseName || '').toLowerCase();
    const cCode = (course.courseId || '').toLowerCase();
    let category = 'ENGLISH';
    if (cName.includes('lập trình') || cName.includes('python') || cName.includes('web') || cCode.includes('it')) {
      category = 'IT';
    }

    const questionSet = QUESTION_BANKS[category] || QUESTION_BANKS.ENGLISH;
    const total = questionSet.length;
    let correctCount = 0;

    const review = questionSet.map(q => {
      const userAns = answers[q.id];
      const isCorrect = userAns === q.correct;
      if (isCorrect) correctCount++;
      return {
        id: q.id,
        question: q.question,
        userAnswer: userAns || 'Chưa chọn',
        correctAnswer: q.correct,
        isCorrect: isCorrect,
        explanation: q.explanation
      };
    });

    // Chấm điểm theo thang điểm 10 (làm tròn 1 chữ số thập phân)
    const score = Math.round((correctCount / total) * 10 * 10) / 10;

    // Đánh giá năng lực tự động
    let evaluation = '';
    let recommendation = '';
    if (score >= 8.0) {
      evaluation = 'Xuất sắc';
      recommendation = 'Năng lực nền tảng vượt trội! Đủ điều kiện xét duyệt vào thẳng lớp Nâng cao / Học bổng tài năng.';
    } else if (score >= 6.0) {
      evaluation = 'Khá';
      recommendation = 'Nền tảng tốt, tư duy vững vàng. Phù hợp theo học đúng tiến độ lớp Tiêu chuẩn.';
    } else {
      evaluation = 'Cơ bản';
      recommendation = 'Cần củng cố thêm kiến thức nền tảng trước khi bắt đầu khóa học chuyên sâu.';
    }

    // CẬP NHẬT TỰ ĐỘNG VÀO LIFERAY OBJECT DEAL (Chức năng test_score)
    await liferayFetch(`/o/c/deals/${dealId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        dealTestScore: score,
        dealLastContactDate: new Date().toISOString()
      })
    });

    // TỰ ĐỘNG GHI NHẬN 1 DÒNG SALE LOG VÀO HỒ SƠ
    await liferayFetch('/o/c/salelogs', {
      method: 'POST',
      body: JSON.stringify({
        logChannel: 'Bài Test Năng Lực Trực Tuyến',
        logOutcome: `Đạt điểm: ${score}/10 (${evaluation})`,
        logNoteContent: `Học viên nộp bài test trực tuyến: ${score}/10 (${correctCount}/${total} câu đúng). Đánh giá: ${evaluation}. Lời khuyên: ${recommendation}`,
        logCreatedAt: new Date().toISOString(),
        r_dealSaleLogs_c_dealId: dealId
      })
    });

    res.json({
      success: true,
      score: score,
      correctCount: correctCount,
      totalQuestions: total,
      evaluation: evaluation,
      recommendation: recommendation,
      review: review
    });
  } catch (err) {
    console.error('Lỗi chấm điểm /api/test/submit:', err);
    res.status(500).json({ error: err.message });
  }
});

// Điều hướng trang
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/crm', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crm.html'));
});

app.get('/courses', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'courses.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

app.listen(PORT, () => {
  console.log(`CRM Server running at http://localhost:${PORT}`);
  console.log(`- Trang Đăng Ký Khách Hàng: http://localhost:${PORT}/register`);
  console.log(`- Trang Phễu Tuyển Sinh CRM: http://localhost:${PORT}/crm`);
  console.log(`- Trang Quản Lý Khóa/Lớp Học: http://localhost:${PORT}/courses`);
  console.log(`- Trang Kiểm Tra Năng Lực (Test Online): http://localhost:${PORT}/test?dealId=33831`);
});

