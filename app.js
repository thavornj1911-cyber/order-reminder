/**
 * แอปแจ้งเตือนสั่งของ (Order Reminder Web App)
 * Features:
 * - 4 Statuses: คิดว่าจะสั่ง, สั่งแล้ว (ไลน์/ชอปปี้/ปากเปล่า/โทรศัพท์), เกินวันที่กำหนดแล้ว, มาส่งแล้ว
 * - Auto-delete delivered items older than 2 weeks (14 days)
 * - 1-7 days reminder period selection & countdown
 * - Supplier management with real-time autocomplete search
 * - Interactive collapsible toggle for product item list
 * - Cloud Firebase Firestore sync for 24/7 mobile access even when PC is off
 * - PWA Service Worker support & LocalStorage fallback
 */

// ==================== INITIAL STATE & STORAGE ====================
const STORAGE_KEY_ORDERS = 'order_reminder_orders_v1';
const STORAGE_KEY_SUPPLIERS = 'order_reminder_suppliers_v1';
const STORAGE_KEY_CONFIG = 'order_reminder_firebase_cfg_v1';
const STORAGE_KEY_MODE = 'order_reminder_storage_mode_v1';

// Pre-configured Firebase Config for this project
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAcFVWnv7JysLMgKGJhfTQES3KLC19g8gI",
  authDomain: "my-order-reminder.firebaseapp.com",
  projectId: "my-order-reminder",
  storageBucket: "my-order-reminder.firebasestorage.app",
  messagingSenderId: "450483088141",
  appId: "1:450483088141:web:f5207c0dcef8590c861e44"
};

// Default Suppliers
const DEFAULT_SUPPLIERS = [
  { id: 'supp-1', name: 'ร้านบรรจุภัณฑ์ เคมีภัณฑ์ A', phone: '081-234-5678', line: '@box_supplier_a', note: 'ส่งของทุกวันอังคาร-พฤหัส' },
  { id: 'supp-2', name: 'ตลาดค้าส่งวัตถุดิบ B', phone: '089-876-5432', line: 'fresh_b_market', note: 'สั่งก่อน 10 โมงเช้าได้ของบ่าย' },
  { id: 'supp-3', name: 'โรงงานชิ้นส่วน & อะไหล่ C', phone: '02-999-8888', line: '@parts_direct', note: 'เครดิต 30 วัน' },
  { id: 'supp-4', name: 'ร้านอุปกรณ์สำนักงาน D', phone: '086-555-4321', line: '@office_d', note: 'สั่งใน Shopee หรือ โทร' }
];

// Default Sample Orders (demonstrating all 4 statuses)
function getDefaultSampleOrders() {
  const today = new Date();
  
  // 1 day from now
  const dueTomorrow = new Date();
  dueTomorrow.setDate(today.getDate() + 1);

  // 3 days from now
  const due3Days = new Date();
  due3Days.setDate(today.getDate() + 3);

  // 2 days ago (Overdue)
  const due2DaysAgo = new Date();
  due2DaysAgo.setDate(today.getDate() - 2);

  // Delivered 3 days ago (Will be auto-deleted in 11 days)
  const delivered3DaysAgo = new Date();
  delivered3DaysAgo.setDate(today.getDate() - 3);

  return [
    {
      id: 'ord-sample-1',
      supplierName: 'ร้านบรรจุภัณฑ์ เคมีภัณฑ์ A',
      supplierPhone: '081-234-5678',
      supplierLine: '@box_supplier_a',
      status: 'คิดว่าจะสั่ง',
      channel: null,
      orderedAt: null,
      reminderDays: 2,
      dueDate: dueTomorrow.toISOString().split('T')[0],
      deliveredAt: null,
      items: [
        { id: 'i1', name: 'กล่องพัสดุ เบอร์ 2A', quantity: '50', unit: 'กล่อง', checked: false, note: 'เกรดหนา 3 ชั้น' },
        { id: 'i2', name: 'เทปกาวใส ปิดกล่อง 2 นิ้ว', quantity: '12', unit: 'ม้วน', checked: false, note: 'ม้วนใหญ่ 100 หลา' },
        { id: 'i3', name: 'บับเบิ้ลกันกระแทก', quantity: '2', unit: 'ม้วน', checked: false, note: 'หน้ากว้าง 65 ซม.' }
      ],
      note: 'เช็คสต็อกอีกรอบก่อนสั่งจริงเย็นนี้',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ord-sample-2',
      supplierName: 'ตลาดค้าส่งวัตถุดิบ B',
      supplierPhone: '089-876-5432',
      supplierLine: 'fresh_b_market',
      status: 'สั่งแล้ว',
      channel: 'ไลน์',
      orderedAt: new Date().toISOString(),
      reminderDays: 3,
      dueDate: due3Days.toISOString().split('T')[0],
      deliveredAt: null,
      items: [
        { id: 'i4', name: 'น้ำตาลทรายมิตรผล', quantity: '10', unit: 'ถุง', checked: false, note: 'ถุงละ 1 กก.' },
        { id: 'i5', name: 'แป้งสาลีเอนกประสงค์', quantity: '5', unit: 'กระสอบ', checked: false, note: 'ตราว่าว' }
      ],
      note: 'ทักไลน์ยืนยันยอดโอนแล้ว รอจัดส่งช่วงเช้า',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ord-sample-3',
      supplierName: 'โรงงานชิ้นส่วน & อะไหล่ C',
      supplierPhone: '02-999-8888',
      supplierLine: '@parts_direct',
      status: 'เกินวันที่กำหนดแล้ว',
      channel: 'โทรศัพท์',
      orderedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      reminderDays: 2,
      dueDate: due2DaysAgo.toISOString().split('T')[0],
      deliveredAt: null,
      items: [
        { id: 'i6', name: 'สายพานเครื่องจักรเบอร์ 45', quantity: '2', unit: 'เส้น', checked: false, note: 'ด่วนมาก ไลน์ผลิตสะดุด' },
        { id: 'i7', name: 'ลูกปืนแบริ่ง 6204', quantity: '4', unit: 'ตัว', checked: false, note: 'ของแท้ SKF/NSK' }
      ],
      note: 'โทรตามแล้ว ร้านแจ้งว่าจะมาส่งพรุ่งนี้เช้า',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'ord-sample-4',
      supplierName: 'ร้านอุปกรณ์สำนักงาน D',
      supplierPhone: '086-555-4321',
      supplierLine: '@office_d',
      status: 'มาส่งแล้ว',
      channel: 'ชอปปี้',
      orderedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      reminderDays: 4,
      dueDate: due2DaysAgo.toISOString().split('T')[0],
      deliveredAt: delivered3DaysAgo.toISOString(),
      items: [
        { id: 'i8', name: 'กระดาษ Double A A4 80g', quantity: '5', unit: 'รีม', checked: true, note: 'ตรวจนับครบแล้ว' },
        { id: 'i9', name: 'หมึกพิมพ์เลเซอร์ HP 85A', quantity: '2', unit: 'ตลับ', checked: true, note: 'ใส่ตู้สต็อกแล้ว' }
      ],
      note: 'ส่งเรียบร้อย ตรวจของครบถ้วน',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
    }
  ];
}

// App State
let appData = {
  orders: [],
  suppliers: [],
  activeFilter: 'ทั้งหมด',
  searchQuery: '',
  filterReminderDays: 0,
  filterChannel: 'all',
  storageMode: 'local', // 'local' or 'firebase'
  firebaseDb: null,
  firebaseUnsubscribe: null
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initServiceWorker();
  initEventListeners();
  cleanupOldDeliveredOrders(); // Auto-clean > 14 days delivered orders
  renderDashboard();
  setupLocalQrCode();
  initNotifications();
});

// Initialize Service Worker for PWA (with instant update)
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=4.0')
      .then(reg => {
        reg.update();
        console.log('PWA ServiceWorker updated:', reg.scope);
      })
      .catch(err => console.log('ServiceWorker registration ignored:', err));
  }
}

// Initialize Storage (LocalStorage or Firebase)
function initStorage() {
  const savedMode = localStorage.getItem(STORAGE_KEY_MODE) || 'firebase';
  appData.storageMode = savedMode;

  // Load suppliers
  const savedSuppliers = localStorage.getItem(STORAGE_KEY_SUPPLIERS);
  if (savedSuppliers) {
    try {
      appData.suppliers = JSON.parse(savedSuppliers);
    } catch(e) {
      appData.suppliers = DEFAULT_SUPPLIERS;
    }
  } else {
    appData.suppliers = DEFAULT_SUPPLIERS;
    saveSuppliersToStorage();
  }

  // Load orders
  const savedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
  if (savedOrders !== null) {
    try {
      appData.orders = JSON.parse(savedOrders);
    } catch(e) {
      appData.orders = [];
    }
  } else {
    // Only load sample orders on first visit
    appData.orders = getDefaultSampleOrders();
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(appData.orders));
  }

  // Check Firebase config if saved, or use pre-configured project config
  let savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (!savedConfig) {
    savedConfig = JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
    localStorage.setItem(STORAGE_KEY_CONFIG, savedConfig);
  }

  const configInput = document.getElementById('firebaseConfigInput');
  if (configInput) {
    configInput.value = savedConfig;
  }

  if (appData.storageMode === 'firebase') {
    connectFirebase(savedConfig);
  }

  updateStorageUI();
}

// Save to LocalStorage
function saveOrdersToStorage() {
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(appData.orders));
  if (appData.storageMode === 'firebase' && appData.firebaseDb) {
    syncOrdersToFirebase();
  }
}

function saveSuppliersToStorage() {
  localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(appData.suppliers));
  if (appData.storageMode === 'firebase' && appData.firebaseDb) {
    syncSuppliersToFirebase();
  }
}

// ==================== AUTO-CLEANUP (ลบรายการมาส่งแล้วเกิน 2 สัปดาห์) ====================
function cleanupOldDeliveredOrders() {
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const toDeleteIds = [];

  appData.orders = appData.orders.filter(order => {
    if (order.status === 'มาส่งแล้ว' && order.deliveredAt) {
      const deliveredTime = new Date(order.deliveredAt).getTime();
      const ageMs = now - deliveredTime;
      if (ageMs > TWO_WEEKS_MS) {
        toDeleteIds.push(order.id);
        return false; // Remove this order
      }
    }
    return true;
  });

  if (toDeleteIds.length > 0) {
    saveOrdersToStorage();
    if (appData.storageMode === 'firebase' && appData.firebaseDb) {
      toDeleteIds.forEach(id => {
        appData.firebaseDb.collection('orders').doc(id).delete().catch(e => console.warn(e));
      });
    }
    showToast(`🧹 ลบรายการที่ส่งแล้วเกิน 2 สัปดาห์อัตโนมัติ ${toDeleteIds.length} รายการ`, 'info');
  }
}

function dismissCleanupBanner() {
  const banner = document.getElementById('cleanupNoticeBanner');
  if (banner) banner.style.display = 'none';
}

// ==================== RENDERING DASHBOARD & ORDERS ====================
function renderDashboard() {
  updateMetrics();
  renderOrdersList();
  renderSuppliersList();
}

// Update Top Metric Counters
function updateMetrics() {
  let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
  const todayStr = getTodayDateString();

  appData.orders.forEach(order => {
    // Check overdue condition: if not delivered and dueDate is past today
    if (order.status !== 'มาส่งแล้ว' && order.dueDate && order.dueDate < todayStr) {
      // Auto-classify or count as overdue
      c3++;
    } else if (order.status === 'คิดว่าจะสั่ง') {
      c1++;
    } else if (order.status === 'สั่งแล้ว') {
      c2++;
    } else if (order.status === 'เกินวันที่กำหนดแล้ว') {
      c3++;
    } else if (order.status === 'มาส่งแล้ว') {
      c4++;
    }
  });

  document.getElementById('countTotal').innerText = appData.orders.length;
  document.getElementById('countStatus1').innerText = c1;
  document.getElementById('countStatus2').innerText = c2;
  document.getElementById('countStatus3').innerText = c3;
  document.getElementById('countStatus4').innerText = c4;
}

// Render Order Cards with Toggle for Products
function renderOrdersList() {
  const container = document.getElementById('ordersContainer');
  const emptyState = document.getElementById('emptyState');
  const todayStr = getTodayDateString();

  // Filter orders
  let filtered = appData.orders.filter(order => {
    // Determine effective status (handles auto-overdue)
    let effectiveStatus = order.status;
    if (order.status !== 'มาส่งแล้ว' && order.dueDate && order.dueDate < todayStr) {
      if (order.status === 'สั่งแล้ว' || order.status === 'คิดว่าจะสั่ง') {
        // If overdue, can match both overdue filter or its main status
      }
    }

    // Filter by Tab
    if (appData.activeFilter !== 'ทั้งหมด') {
      if (appData.activeFilter === 'เกินวันที่กำหนดแล้ว') {
        const isPastDue = order.status !== 'มาส่งแล้ว' && order.dueDate && order.dueDate < todayStr;
        if (order.status !== 'เกินวันที่กำหนดแล้ว' && !isPastDue) return false;
      } else {
        if (order.status !== appData.activeFilter) return false;
      }
    }

    // Filter by Reminder Days
    if (appData.filterReminderDays > 0) {
      if (order.reminderDays !== appData.filterReminderDays) return false;
    }

    // Filter by Channel
    if (appData.filterChannel !== 'all') {
      if (order.channel !== appData.filterChannel) return false;
    }

    // Filter by Search Query
    if (appData.searchQuery.trim() !== '') {
      const q = appData.searchQuery.toLowerCase();
      const matchSupplier = (order.supplierName || '').toLowerCase().includes(q);
      const matchNote = (order.note || '').toLowerCase().includes(q);
      const matchItems = (order.items || []).some(item => 
        (item.name || '').toLowerCase().includes(q) || 
        (item.unit || '').toLowerCase().includes(q) ||
        (item.note || '').toLowerCase().includes(q)
      );
      if (!matchSupplier && !matchNote && !matchItems) return false;
    }

    return true;
  });

  // Sort orders: Overdue first, then by dueDate ascending, then completed
  filtered.sort((a, b) => {
    if (a.status === 'มาส่งแล้ว' && b.status !== 'มาส่งแล้ว') return 1;
    if (b.status === 'มาส่งแล้ว' && a.status !== 'มาส่งแล้ว') return -1;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = filtered.map(order => {
    // Calculate Days Remaining / Overdue
    const daysDiff = getDaysDiff(todayStr, order.dueDate);
    const isOverdue = order.status !== 'มาส่งแล้ว' && daysDiff < 0;
    
    // Status Badge Details
    let statusBadgeHtml = '';
    if (isOverdue || order.status === 'เกินวันที่กำหนดแล้ว') {
      statusBadgeHtml = `
        <span class="badge-status-3 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-triangle-exclamation"></i> 3. เกินกำหนดแล้ว (${Math.abs(daysDiff)} วัน)
        </span>
      `;
    } else if (order.status === 'คิดว่าจะสั่ง') {
      statusBadgeHtml = `
        <span class="badge-status-1 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-sm">
          <i class="fa-regular fa-lightbulb"></i> 1. คิดว่าจะสั่ง
        </span>
      `;
    } else if (order.status === 'สั่งแล้ว') {
      statusBadgeHtml = `
        <span class="badge-status-2 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-cart-shopping"></i> 2. สั่งแล้ว
        </span>
      `;
    } else if (order.status === 'มาส่งแล้ว') {
      statusBadgeHtml = `
        <span class="badge-status-4 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-circle-check"></i> 4. มาส่งแล้ว
        </span>
      `;
    }

    // Channel Badge
    let channelBadgeHtml = '';
    if (order.channel) {
      let icon = 'fa-tag';
      let chClass = 'channel-other';
      if (order.channel === 'ไลน์') { icon = 'fa-brands fa-line'; chClass = 'channel-line'; }
      else if (order.channel === 'ชอปปี้') { icon = 'fa-solid fa-bag-shopping'; chClass = 'channel-shopee'; }
      else if (order.channel === 'ปากเปล่า') { icon = 'fa-solid fa-comment-dots'; chClass = 'channel-verbal'; }
      else if (order.channel === 'โทรศัพท์') { icon = 'fa-solid fa-phone'; chClass = 'channel-phone'; }

      channelBadgeHtml = `
        <span class="${chClass} text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-xs">
          <i class="${icon}"></i> ${order.channel}
        </span>
      `;
    }

    // Due Date & Reminder info
    let reminderText = '';
    let reminderClass = 'text-slate-600';
    if (order.status === 'มาส่งแล้ว') {
      const deliveredDate = order.deliveredAt ? formatDateThai(order.deliveredAt.split('T')[0]) : 'ส่งแล้ว';
      const daysUntilCleanup = getDaysUntilCleanup(order.deliveredAt);
      reminderText = `
        <span class="text-emerald-700 font-medium">
          <i class="fa-solid fa-truck-ramp-box text-emerald-500 mr-1"></i> มาส่งแล้วเมื่อ: ${deliveredDate}
        </span>
        <span class="text-[11px] text-slate-400 block sm:inline sm:ml-2">
          (ระบบจะลบอัตโนมัติในอีก <strong>${daysUntilCleanup}</strong> วัน)
        </span>
      `;
    } else if (daysDiff < 0) {
      reminderClass = 'text-rose-700 font-bold';
      reminderText = `
        <span class="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          <i class="fa-solid fa-clock-rotate-left mr-1"></i> เกินกำหนดมาแล้ว ${Math.abs(daysDiff)} วัน (กำหนด: ${formatDateThai(order.dueDate)})
        </span>
      `;
    } else if (daysDiff === 0) {
      reminderClass = 'text-amber-700 font-bold';
      reminderText = `
        <span class="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
          <i class="fa-solid fa-bell mr-1"></i> ถึงกำหนดวันนี้! (เตือน ${order.reminderDays || 1} วัน)
        </span>
      `;
    } else {
      reminderText = `
        <span class="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
          <i class="fa-regular fa-calendar-check mr-1"></i> กำหนดส่ง: ${formatDateThai(order.dueDate)} (เหลืออีก ${daysDiff} วัน)
        </span>
      `;
    }

    // Product items count
    const itemsCount = (order.items || []).length;

    // Build Product Items Table for Toggle Section
    const itemsRowsHtml = (order.items || []).map((item, idx) => `
      <tr class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition">
        <td class="py-2 px-2 text-center w-8">
          <input type="checkbox" ${item.checked ? 'checked' : ''} 
                 onchange="toggleItemChecked('${order.id}', '${item.id}')"
                 class="rounded text-indigo-600 focus:ring-0 cursor-pointer">
        </td>
        <td class="py-2 px-2">
          <span class="font-medium text-xs text-slate-800 ${item.checked ? 'line-through text-slate-400' : ''}">${escapeHtml(item.name)}</span>
          ${item.note ? `<span class="block text-[11px] text-slate-400">${escapeHtml(item.note)}</span>` : ''}
        </td>
        <td class="py-2 px-2 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">
          ${escapeHtml(item.quantity)} ${escapeHtml(item.unit || 'หน่วย')}
        </td>
      </tr>
    `).join('');

    // Action buttons based on status
    let actionButtonsHtml = '';
    if (order.status === 'คิดว่าจะสั่ง') {
      actionButtonsHtml = `
        <button onclick="promptOrderChannel('${order.id}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5">
          <i class="fa-solid fa-cart-shopping"></i> สั่งของแล้ว
        </button>
      `;
    } else if (order.status === 'สั่งแล้ว' || isOverdue || order.status === 'เกินวันที่กำหนดแล้ว') {
      actionButtonsHtml = `
        <button onclick="markOrderDelivered('${order.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5">
          <i class="fa-solid fa-check"></i> ได้รับของแล้ว
        </button>
      `;
    } else if (order.status === 'มาส่งแล้ว') {
      actionButtonsHtml = `
        <button onclick="deleteOrder('${order.id}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
          <i class="fa-regular fa-trash-can text-rose-600"></i> ลบรายการนี้ออก
        </button>
      `;
    }

    return `
      <div class="order-card bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 overflow-hidden relative" id="card-${order.id}">
        
        <!-- CARD HEADER -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          
          <!-- Supplier Info & Channel -->
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
              <i class="fa-solid fa-truck"></i>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-slate-800 text-sm sm:text-base leading-tight">${escapeHtml(order.supplierName)}</h3>
                ${channelBadgeHtml}
              </div>
              <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                ${order.supplierPhone ? `
                  <a href="tel:${order.supplierPhone}" class="hover:text-indigo-600 flex items-center gap-1 text-slate-600">
                    <i class="fa-solid fa-phone text-[10px]"></i> ${escapeHtml(order.supplierPhone)}
                  </a>
                ` : ''}
                ${order.supplierLine ? `
                  <span class="text-slate-400">• LINE: ${escapeHtml(order.supplierLine)}</span>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Status Badge -->
          <div class="flex items-center space-x-2 self-start sm:self-auto">
            ${statusBadgeHtml}
          </div>
        </div>

        <!-- TIMELINE & REMINDER INFO -->
        <div class="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="${reminderClass} flex items-center flex-wrap gap-1">
            ${reminderText}
          </div>
          <div class="text-[11px] text-slate-400">
            ระยะเตือน: <span class="font-semibold text-slate-600">${order.reminderDays || 1} วัน</span>
          </div>
        </div>

        <!-- NOTE (IF ANY) -->
        ${order.note ? `
          <div class="mb-3 px-3 py-1.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100 flex items-start gap-1.5">
            <i class="fa-regular fa-comment-dots text-slate-400 mt-0.5"></i>
            <span>${escapeHtml(order.note)}</span>
          </div>
        ` : ''}

        <!-- PRODUCT ITEMS TOGGLE ACCORDION -->
        <div class="mt-1 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/60">
          <!-- Accordion Toggle Button -->
          <button type="button" onclick="toggleItemsAccordion('${order.id}')" 
                  class="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100/80 transition">
            <span class="flex items-center gap-2">
              <i class="fa-solid fa-boxes-stacked text-indigo-600"></i>
              <span>รายการสินค้า (${itemsCount} รายการ)</span>
              <span class="text-[11px] font-normal text-slate-400">• คลิกเพื่อเปิด/ปิด</span>
            </span>
            <i class="fa-solid fa-chevron-down text-slate-400 toggle-arrow text-xs" id="arrow-${order.id}"></i>
          </button>

          <!-- Collapsible Products Table -->
          <div class="items-toggle-content bg-white" id="items-${order.id}">
            <div class="p-2 sm:p-3 overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="text-[11px] font-semibold text-slate-400 border-b border-slate-100">
                    <th class="py-1 px-2 text-center w-8">เช็ค</th>
                    <th class="py-1 px-2">ชื่อสินค้า / สเปก</th>
                    <th class="py-1 px-2 text-right">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRowsHtml || '<tr><td colspan="3" class="text-center py-2 text-slate-400 text-xs">ไม่มีรายการสินค้า</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- CARD FOOTER ACTIONS -->
        <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          
          <!-- Primary Status Action -->
          <div class="flex items-center space-x-2">
            ${actionButtonsHtml}

            <!-- Quick copy for LINE -->
            <button onclick="copyOrderForLine('${order.id}')" title="คัดลอกข้อความเพื่อส่งไลน์ให้ซัพพลายเออร์" 
                    class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition">
              <i class="fa-brands fa-line text-green-600"></i>
              <span class="hidden sm:inline">ก๊อปปี้ส่ง LINE</span>
            </button>
          </div>

          <!-- Secondary Actions (Edit / Delete) -->
          <div class="flex items-center space-x-1.5">
            <button onclick="editOrder('${order.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs transition" title="แก้ไข">
              <i class="fa-regular fa-pen-to-square text-sm"></i>
            </button>
            <button onclick="deleteOrder('${order.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs transition" title="ลบรายการ">
              <i class="fa-regular fa-trash-can text-sm"></i>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

// ==================== TOGGLE PRODUCT ITEMS ACCORDION ====================
function toggleItemsAccordion(orderId) {
  const content = document.getElementById(`items-${orderId}`);
  const arrow = document.getElementById(`arrow-${orderId}`);
  if (!content) return;

  const isExpanded = content.classList.contains('expanded');
  if (isExpanded) {
    content.classList.remove('expanded');
    if (arrow) arrow.classList.remove('rotated');
  } else {
    content.classList.add('expanded');
    if (arrow) arrow.classList.add('rotated');
  }
}

// Check / Uncheck Item in List
function toggleItemChecked(orderId, itemId) {
  const order = appData.orders.find(o => o.id === orderId);
  if (!order || !order.items) return;

  const item = order.items.find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    saveOrdersToStorage();
    renderOrdersList();
  }
}

// ==================== FILTERING & SEARCH ====================
function setActiveFilter(filterName) {
  appData.activeFilter = filterName;

  // Reset tab button styles
  const tabs = ['tabAll', 'tabStatus1', 'tabStatus2', 'tabStatus3', 'tabStatus4'];
  tabs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'px-3 py-1.5 rounded-lg whitespace-nowrap transition bg-slate-100 text-slate-600 hover:bg-slate-200';
  });

  let activeId = 'tabAll';
  if (filterName === 'คิดว่าจะสั่ง') activeId = 'tabStatus1';
  else if (filterName === 'สั่งแล้ว') activeId = 'tabStatus2';
  else if (filterName === 'เกินวันที่กำหนดแล้ว') activeId = 'tabStatus3';
  else if (filterName === 'มาส่งแล้ว') activeId = 'tabStatus4';

  const activeBtn = document.getElementById(activeId);
  if (activeBtn) {
    activeBtn.className = 'px-3 py-1.5 rounded-lg whitespace-nowrap transition bg-indigo-600 text-white shadow-sm';
  }

  renderOrdersList();
}

function filterByStatus(statusName) {
  setActiveFilter(statusName);
}

function handleSearch(val) {
  appData.searchQuery = val;
  renderOrdersList();
}

function filterByReminderDays(days) {
  appData.filterReminderDays = days;
  
  // Style day buttons
  for (let i = 0; i <= 7; i++) {
    const btn = document.getElementById(i === 0 ? 'filterDayAll' : `filterDay${i}`);
    if (!btn) continue;
    if (i === days) {
      btn.className = 'px-2 py-0.5 rounded bg-indigo-600 text-white font-medium';
    } else {
      btn.className = 'px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200';
    }
  }
  renderOrdersList();
}

function filterByChannel(ch) {
  appData.filterChannel = ch;
  renderOrdersList();
}

// ==================== ORDER MODAL & CRUD ====================
function openOrderModal(orderId = null) {
  const modal = document.getElementById('orderModal');
  const form = document.getElementById('orderForm');
  const modalTitle = document.getElementById('orderModalTitle');
  form.reset();
  document.getElementById('productRowsContainer').innerHTML = '';

  if (orderId) {
    const order = appData.orders.find(o => o.id === orderId);
    if (!order) return;

    modalTitle.innerText = 'แก้ไขรายการสั่งของ';
    document.getElementById('orderId').value = order.id;
    document.getElementById('orderSupplierInput').value = order.supplierName || '';
    document.getElementById('selectedSupplierPhone').value = order.supplierPhone || '';
    document.getElementById('selectedSupplierLine').value = order.supplierLine || '';

    // Set Status
    const statusRadios = document.getElementsByName('orderStatus');
    for (let r of statusRadios) {
      if (r.value === order.status) r.checked = true;
    }

    // Set Channel
    if (order.channel) {
      const chRadios = document.getElementsByName('orderChannel');
      for (let r of chRadios) {
        if (r.value === order.channel) r.checked = true;
      }
    }

    // Set Reminder Days & Due Date
    setReminderDays(order.reminderDays || 3);
    if (order.dueDate) {
      document.getElementById('orderDueDate').value = order.dueDate;
    }

    // Set Note
    document.getElementById('orderNote').value = order.note || '';

    // Fill Product Rows
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => addProductItemRow(item));
    } else {
      addProductItemRow();
    }

  } else {
    modalTitle.innerText = 'เพิ่มรายการสั่งของใหม่';
    document.getElementById('orderId').value = '';
    setReminderDays(3); // default 3 days
    addProductItemRow(); // start with 1 item row
  }

  toggleChannelFields();
  modal.classList.remove('hidden');
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.add('hidden');
  document.getElementById('supplierSuggestions').classList.add('hidden');
}

// Toggle Channel section in Modal if 'สั่งแล้ว' is selected
function toggleChannelFields() {
  const selectedStatus = document.querySelector('input[name="orderStatus"]:checked')?.value;
  const channelGroup = document.getElementById('channelGroup');
  if (selectedStatus === 'สั่งแล้ว') {
    channelGroup.classList.remove('hidden');
  } else {
    channelGroup.classList.add('hidden');
  }
}

// Dynamic Product Item Rows inside Modal
function addProductItemRow(itemData = null) {
  const container = document.getElementById('productRowsContainer');
  const rowId = 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

  const name = itemData ? escapeHtml(itemData.name) : '';
  const qty = itemData ? escapeHtml(itemData.quantity) : '1';
  const unit = itemData ? escapeHtml(itemData.unit) : 'ชิ้น';
  const note = itemData ? escapeHtml(itemData.note || '') : '';

  const rowDiv = document.createElement('div');
  rowDiv.id = rowId;
  rowDiv.className = 'grid grid-cols-12 gap-1.5 items-center p-2 rounded-lg bg-white border border-slate-200 shadow-2xs';
  rowDiv.innerHTML = `
    <div class="col-span-5 sm:col-span-6">
      <input type="text" placeholder="ชื่อสินค้า เช่น กล่องพัสดุ เบอร์ 0" value="${name}" required
             class="item-name w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white">
    </div>
    <div class="col-span-3 sm:col-span-2">
      <input type="text" placeholder="จำนวน" value="${qty}" required
             class="item-qty w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center focus:ring-1 focus:ring-indigo-500 focus:bg-white">
    </div>
    <div class="col-span-3 sm:col-span-3">
      <input type="text" placeholder="หน่วย (ชิ้น/ลัง)" value="${unit}"
             class="item-unit w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white">
    </div>
    <div class="col-span-1 text-center">
      <button type="button" onclick="removeProductItemRow('${rowId}')" class="text-slate-400 hover:text-red-500 text-xs p-1">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
  container.appendChild(rowDiv);
}

function removeProductItemRow(rowId) {
  const el = document.getElementById(rowId);
  const container = document.getElementById('productRowsContainer');
  if (container.children.length <= 1) {
    showToast('ต้องมีสินค้าอย่างน้อย 1 รายการ', 'warning');
    return;
  }
  if (el) el.remove();
}

// 1-7 Days Reminder Selection
function setReminderDays(days) {
  days = parseInt(days, 10);
  document.getElementById('orderReminderDays').value = days;
  document.getElementById('reminderDaysDisplay').innerText = `เตือนใน ${days} วัน`;

  // Update quick buttons UI
  const buttons = document.querySelectorAll('.day-btn');
  buttons.forEach(btn => {
    const bDay = parseInt(btn.getAttribute('data-day'), 10);
    if (bDay === days) {
      btn.className = 'day-btn py-1.5 rounded border-indigo-600 bg-indigo-600 text-white shadow-sm';
    } else {
      btn.className = 'day-btn py-1.5 rounded border border-slate-200 bg-white hover:bg-indigo-50 text-slate-700';
    }
  });

  // Automatically calculate target dueDate = Today + days
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  document.getElementById('orderDueDate').value = targetDate.toISOString().split('T')[0];
}

function sanitizeOrderForFirestore(order) {
  return {
    id: String(order.id || ('ord-' + Date.now())),
    supplierName: String(order.supplierName || 'ไม่ระบุชื่อร้าน'),
    supplierPhone: String(order.supplierPhone || ''),
    supplierLine: String(order.supplierLine || ''),
    status: String(order.status || 'คิดว่าจะสั่ง'),
    channel: order.channel ? String(order.channel) : null,
    orderedAt: order.orderedAt ? String(order.orderedAt) : null,
    reminderDays: Number(order.reminderDays) || 3,
    dueDate: String(order.dueDate || ''),
    deliveredAt: order.deliveredAt ? String(order.deliveredAt) : null,
    items: (order.items || []).map(it => ({
      id: String(it.id || ('it-' + Math.random().toString(36).substr(2, 6))),
      name: String(it.name || ''),
      quantity: String(it.quantity || '1'),
      unit: String(it.unit || 'ชิ้น'),
      checked: Boolean(it.checked),
      note: String(it.note || '')
    })),
    note: String(order.note || ''),
    createdAt: String(order.createdAt || new Date().toISOString()),
    updatedAt: String(order.updatedAt || new Date().toISOString())
  };
}

// Handle Save Order Form
async function handleSaveOrder(e) {
  e.preventDefault();

  const orderId = document.getElementById('orderId').value;
  const supplierName = document.getElementById('orderSupplierInput').value.trim();
  const statusRadio = document.querySelector('input[name="orderStatus"]:checked');
  const status = statusRadio ? statusRadio.value : 'คิดว่าจะสั่ง';
  const reminderDays = parseInt(document.getElementById('orderReminderDays').value, 10) || 3;
  const dueDate = document.getElementById('orderDueDate').value;
  const note = document.getElementById('orderNote').value.trim();

  let channel = null;
  if (status === 'สั่งแล้ว') {
    const chRadio = document.querySelector('input[name="orderChannel"]:checked');
    channel = chRadio ? chRadio.value : 'ไลน์';
  }

  // Extract Product Rows
  const itemRows = document.querySelectorAll('#productRowsContainer > div');
  const items = [];
  itemRows.forEach(row => {
    const name = row.querySelector('.item-name')?.value.trim();
    const qty = row.querySelector('.item-qty')?.value.trim() || '1';
    const unit = row.querySelector('.item-unit')?.value.trim() || 'หน่วย';
    if (name) {
      items.push({
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        name,
        quantity: qty,
        unit,
        checked: false,
        note: ''
      });
    }
  });

  if (items.length === 0) {
    showToast('กรุณาระบุรายการสินค้าอย่างน้อย 1 อย่าง', 'warning');
    return;
  }

  // Check if supplier is already in database, if not, automatically save it!
  let supplierObj = appData.suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
  if (!supplierObj) {
    supplierObj = {
      id: 'supp-' + Date.now(),
      name: supplierName,
      phone: document.getElementById('selectedSupplierPhone').value.trim() || '',
      line: document.getElementById('selectedSupplierLine').value.trim() || '',
      note: 'เพิ่มจากรายการสั่งของ'
    };
    appData.suppliers.push(supplierObj);
    saveSuppliersToStorage();
  }

  const nowIso = new Date().toISOString();
  let savedOrderObj = null;

  if (orderId) {
    // Edit existing order
    const idx = appData.orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      const existing = appData.orders[idx];
      savedOrderObj = sanitizeOrderForFirestore({
        ...existing,
        supplierName,
        supplierPhone: supplierObj.phone || existing.supplierPhone || '',
        supplierLine: supplierObj.line || existing.supplierLine || '',
        status,
        channel: status === 'สั่งแล้ว' ? (channel || existing.channel || 'ไลน์') : existing.channel,
        orderedAt: status === 'สั่งแล้ว' ? (existing.orderedAt || nowIso) : existing.orderedAt,
        reminderDays,
        dueDate,
        deliveredAt: status === 'มาส่งแล้ว' ? (existing.deliveredAt || nowIso) : (status !== 'มาส่งแล้ว' ? null : existing.deliveredAt),
        items: items.map((it, i) => {
          const prev = existing.items && existing.items[i];
          return prev ? { ...it, checked: Boolean(prev.checked) } : it;
        }),
        note,
        updatedAt: nowIso
      });
      appData.orders[idx] = savedOrderObj;
    }
  } else {
    // Create new order
    savedOrderObj = sanitizeOrderForFirestore({
      id: 'ord-' + Date.now(),
      supplierName,
      supplierPhone: supplierObj.phone || '',
      supplierLine: supplierObj.line || '',
      status,
      channel,
      orderedAt: status === 'สั่งแล้ว' ? nowIso : null,
      reminderDays,
      dueDate,
      deliveredAt: status === 'มาส่งแล้ว' ? nowIso : null,
      items,
      note,
      createdAt: nowIso,
      updatedAt: nowIso
    });
    appData.orders.unshift(savedOrderObj);
  }

  // Save to LocalStorage immediately
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(appData.orders));

  // Direct save to Cloud Firestore immediately
  if (appData.storageMode === 'firebase' && appData.firebaseDb && savedOrderObj) {
    try {
      await appData.firebaseDb.collection('orders').doc(savedOrderObj.id).set(savedOrderObj);
      console.log('Successfully saved order to Firestore:', savedOrderObj.id);
    } catch(err) {
      console.error('Firestore direct save order error:', err);
      showToast('บันทึกในเครื่องแล้ว แต่ Cloud ขัดข้อง: ' + err.message, 'warning');
    }
  }

  closeOrderModal();

  // Automatically switch tab to the newly saved order's status so the user SEES it immediately!
  setActiveFilter(status);
  renderDashboard();
  showToast(`✅ บันทึกคำสั่งซื้อ "${savedOrderObj.supplierName}" เรียบร้อยแล้ว`, 'success');
}
  renderDashboard();
}

function editOrder(orderId) {
  openOrderModal(orderId);
}

async function deleteOrder(orderId) {
  if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบคำสั่งซื้อนี้?')) {
    // 1. Remove from local array & storage
    appData.orders = appData.orders.filter(o => o.id !== orderId);
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(appData.orders));
    renderDashboard();

    // 2. Always delete from Firestore (both in local or firebase mode) if config exists
    try {
      if (!firebase.apps.length) {
        const cfgStr = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (cfgStr) {
          const cfg = parseFirebaseConfigInput(cfgStr);
          firebase.initializeApp(cfg);
        }
      }
      if (firebase.apps.length) {
        await firebase.firestore().collection('orders').doc(orderId).delete();
        console.log('Permanently deleted order from Firestore:', orderId);
      }
    } catch (err) {
      console.warn('Firestore direct delete warning:', err);
    }

    showToast('ลบรายการคำสั่งซื้อแล้ว', 'info');
  }
}

async function clearAllOrders() {
  if (!confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบรายการคำสั่งซื้อทั้งหมด? (รายการจะถูกลบทั้งในเครื่องและ Cloud)')) {
    return;
  }

  appData.orders = [];
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify([]));
  renderDashboard();

  try {
    if (!firebase.apps.length) {
      const cfgStr = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (cfgStr) {
        const cfg = parseFirebaseConfigInput(cfgStr);
        firebase.initializeApp(cfg);
      }
    }
    if (firebase.apps.length) {
      const snapshot = await firebase.firestore().collection('orders').get();
      const batch = firebase.firestore().batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log('All orders wiped from Firestore');
    }
    showToast('ลบรายการคำสั่งซื้อทั้งหมดเรียบร้อยแล้ว', 'info');
  } catch(err) {
    console.warn('Wipe orders error:', err);
    showToast('ลบในเครื่องสำเร็จ แต่ Cloud มีข้อผิดพลาด: ' + err.message, 'warning');
  }
}

async function clearDeliveredOrders() {
  const delivered = appData.orders.filter(o => o.status === 'มาส่งแล้ว');
  if (delivered.length === 0) {
    showToast('ไม่มีรายการในหมวดมาส่งแล้ว', 'info');
    return;
  }

  if (!confirm(`คุณต้องการลบรายการที่ 'มาส่งแล้ว' ทั้งหมด (${delivered.length} รายการ) ออกใช่หรือไม่?`)) {
    return;
  }

  const deliveredIds = delivered.map(o => o.id);
  appData.orders = appData.orders.filter(o => o.status !== 'มาส่งแล้ว');
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(appData.orders));
  renderDashboard();

  try {
    if (!firebase.apps.length) {
      const cfgStr = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (cfgStr) {
        const cfg = parseFirebaseConfigInput(cfgStr);
        firebase.initializeApp(cfg);
      }
    }
    if (firebase.apps.length) {
      const batch = firebase.firestore().batch();
      deliveredIds.forEach(id => {
        batch.delete(firebase.firestore().collection('orders').doc(id));
      });
      await batch.commit();
      console.log('Cleared delivered orders from Firestore');
    }
    showToast(`ลบรายการที่มาส่งแล้ว ${delivered.length} รายการเรียบร้อยแล้ว`, 'success');
  } catch(err) {
    console.warn('Error clearing delivered orders from Firestore:', err);
    showToast('ลบในเครื่องสำเร็จ แต่ Cloud มีข้อผิดพลาด: ' + err.message, 'warning');
  }
}

// ==================== QUICK STATUS ACTIONS ====================
// 1. Move to 'สั่งแล้ว' with Quick Channel Selector
function promptOrderChannel(orderId) {
  document.getElementById('quickOrderId').value = orderId;
  document.getElementById('quickChannelModal').classList.remove('hidden');
}

function closeQuickChannelModal() {
  document.getElementById('quickChannelModal').classList.add('hidden');
}

async function confirmQuickOrderChannel(channelName) {
  const orderId = document.getElementById('quickOrderId').value;
  const order = appData.orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'สั่งแล้ว';
  order.channel = channelName;
  order.orderedAt = new Date().toISOString();

  // Recalculate target date based on reminderDays
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + (order.reminderDays || 3));
  order.dueDate = targetDate.toISOString().split('T')[0];

  const cleanOrder = sanitizeOrderForFirestore(order);
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(appData.orders));

  if (appData.storageMode === 'firebase' && appData.firebaseDb) {
    try {
      await appData.firebaseDb.collection('orders').doc(order.id).set(cleanOrder);
    } catch(err) {
      console.warn('Firestore quick status save error:', err);
    }
  }

  closeQuickChannelModal();
  setActiveFilter('สั่งแล้ว');
  renderDashboard();
  showToast(`เปลี่ยนสถานะเป็น 'สั่งแล้ว' (ช่องทาง: ${channelName})`, 'success');
}

// 2. Mark as 'มาส่งแล้ว' (Delivered)
async function markOrderDelivered(orderId) {
  const order = appData.orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'มาส่งแล้ว';
  order.deliveredAt = new Date().toISOString();
  
  // Mark all items as checked
  if (order.items) {
    order.items.forEach(i => i.checked = true);
  }

  const cleanOrder = sanitizeOrderForFirestore(order);
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(appData.orders));

  if (appData.storageMode === 'firebase' && appData.firebaseDb) {
    try {
      await appData.firebaseDb.collection('orders').doc(order.id).set(cleanOrder);
    } catch(err) {
      console.warn('Firestore mark delivered error:', err);
    }
  }

  setActiveFilter('มาส่งแล้ว');
  renderDashboard();
  showToast('ได้รับของแล้ว! ย้ายไปสถานะ "มาส่งแล้ว" (จะลบอัตโนมัติในอีก 14 วัน)', 'success');
}

// Copy order text formatted for sending via LINE
function copyOrderForLine(orderId) {
  const order = appData.orders.find(o => o.id === orderId);
  if (!order) return;

  const dateNow = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  let text = `📦 ใบสั่งซื้อสินค้า\n`;
  text += `ถึง: ${order.supplierName}\n`;
  text += `วันที่: ${dateNow}\n`;
  text += `------------------------\n`;
  text += `รายการที่สั่งซื้อ:\n`;
  (order.items || []).forEach((item, idx) => {
    text += `${idx + 1}. ${item.name} จำนวน ${item.quantity} ${item.unit || ''}\n`;
  });
  if (order.note) {
    text += `------------------------\n`;
    text += `หมายเหตุ: ${order.note}\n`;
  }
  text += `------------------------\n`;
  text += `ขอบคุณครับ/ค่ะ`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 คัดลอกข้อความสำหรับส่ง LINE เรียบร้อยแล้ว!', 'success');
  }).catch(() => {
    prompt('คัดลอกข้อความด้านล่างเพื่อส่ง LINE:', text);
  });
}

// ==================== SUPPLIER AUTOCOMPLETE & MANAGEMENT ====================
function initEventListeners() {
  const input = document.getElementById('orderSupplierInput');
  const suggestionsBox = document.getElementById('supplierSuggestions');

  if (input && suggestionsBox) {
    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      if (!val) {
        suggestionsBox.classList.add('hidden');
        return;
      }

      const matches = appData.suppliers.filter(s => s.name.toLowerCase().includes(val));
      
      let html = '';
      if (matches.length > 0) {
        html += matches.map(s => `
          <div class="autocomplete-item" onclick="selectSupplierAutocomplete('${s.id}')">
            <div class="font-bold text-xs text-slate-800">${escapeHtml(s.name)}</div>
            <div class="text-[11px] text-slate-500">
              ${s.phone ? `📞 ${escapeHtml(s.phone)} ` : ''}
              ${s.line ? `💬 ${escapeHtml(s.line)}` : ''}
            </div>
          </div>
        `).join('');
      }

      // Option to add new supplier right away
      html += `
        <div class="autocomplete-item bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5"
             onclick="selectNewSupplierAutocomplete('${escapeHtml(input.value.trim())}')">
          <i class="fa-solid fa-plus-circle"></i> ใช้ชื่อ "${escapeHtml(input.value.trim())}" (เพิ่มเป็น Supplier ใหม่)
        </div>
      `;

      suggestionsBox.innerHTML = html;
      suggestionsBox.classList.remove('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.add('hidden');
      }
    });
  }
}

function selectSupplierAutocomplete(suppId) {
  const supp = appData.suppliers.find(s => s.id === suppId);
  if (!supp) return;

  document.getElementById('orderSupplierInput').value = supp.name;
  document.getElementById('selectedSupplierPhone').value = supp.phone || '';
  document.getElementById('selectedSupplierLine').value = supp.line || '';
  document.getElementById('supplierSuggestions').classList.add('hidden');
}

function selectNewSupplierAutocomplete(name) {
  document.getElementById('orderSupplierInput').value = name;
  document.getElementById('selectedSupplierPhone').value = '';
  document.getElementById('selectedSupplierLine').value = '';
  document.getElementById('supplierSuggestions').classList.add('hidden');
}

function openSupplierModal() {
  renderSuppliersList();
  document.getElementById('supplierModal').classList.remove('hidden');
}

function closeSupplierModal() {
  cancelEditSupplier();
  document.getElementById('supplierModal').classList.add('hidden');
}

function handleSaveSupplier(e) {
  e.preventDefault();
  const editId = document.getElementById('suppEditId').value;
  const name = document.getElementById('suppName').value.trim();
  const phone = document.getElementById('suppPhone').value.trim();
  const line = document.getElementById('suppLine').value.trim();
  const note = document.getElementById('suppNote').value.trim();

  if (!name) return;

  if (editId) {
    // Edit existing supplier
    const idx = appData.suppliers.findIndex(s => s.id === editId);
    if (idx !== -1) {
      const oldName = appData.suppliers[idx].name;
      appData.suppliers[idx] = { id: editId, name, phone, line, note };

      // Update supplier name and contact on active orders if name changed
      let ordersUpdated = false;
      appData.orders.forEach(order => {
        if (order.supplierName === oldName) {
          order.supplierName = name;
          order.supplierPhone = phone;
          order.supplierLine = line;
          ordersUpdated = true;
        }
      });
      if (ordersUpdated) {
        saveOrdersToStorage();
        renderOrdersList();
      }

      saveSuppliersToStorage();
      cancelEditSupplier();
      renderSuppliersList();
      showToast(`แก้ไขข้อมูลซัพพลายเออร์ "${name}" สำเร็จ`, 'success');
      return;
    }
  }

  // Create new supplier
  const newSupp = {
    id: 'supp-' + Date.now(),
    name,
    phone,
    line,
    note
  };

  appData.suppliers.push(newSupp);
  saveSuppliersToStorage();
  document.getElementById('newSupplierForm').reset();
  renderSuppliersList();
  showToast(`เพิ่มซัพพลายเออร์ "${name}" เรียบร้อยแล้ว`, 'success');
}

function editSupplier(suppId) {
  const supp = appData.suppliers.find(s => s.id === suppId);
  if (!supp) return;

  document.getElementById('suppEditId').value = supp.id;
  document.getElementById('suppName').value = supp.name || '';
  document.getElementById('suppPhone').value = supp.phone || '';
  document.getElementById('suppLine').value = supp.line || '';
  document.getElementById('suppNote').value = supp.note || '';

  document.getElementById('suppFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-amber-500"></i> แก้ไขข้อมูลซัพพลายเออร์';
  document.getElementById('suppSubmitBtnText').innerText = '💾 บันทึกการแก้ไข';
  document.getElementById('suppCancelEditBtn').classList.remove('hidden');
  document.getElementById('suppEditingBadge').classList.remove('hidden');

  document.getElementById('suppName').focus();
}

function cancelEditSupplier() {
  document.getElementById('newSupplierForm').reset();
  document.getElementById('suppEditId').value = '';
  document.getElementById('suppFormTitle').innerHTML = '<i class="fa-solid fa-user-plus text-indigo-600"></i> เพิ่มซัพพลายเออร์ใหม่';
  document.getElementById('suppSubmitBtnText').innerText = '+ บันทึกซัพพลายเออร์';
  document.getElementById('suppCancelEditBtn').classList.add('hidden');
  document.getElementById('suppEditingBadge').classList.add('hidden');
}

function deleteSupplier(suppId) {
  const supp = appData.suppliers.find(s => s.id === suppId);
  if (!supp) return;

  if (confirm(`คุณต้องการลบ "${supp.name}" ออกจากรายชื่อซัพพลายเออร์หรือไม่?`)) {
    appData.suppliers = appData.suppliers.filter(s => s.id !== suppId);
    saveSuppliersToStorage();

    // Explicitly delete from Firebase Cloud immediately
    if (appData.storageMode === 'firebase' && appData.firebaseDb) {
      appData.firebaseDb.collection('suppliers').doc(suppId).delete().catch(err => {
        console.error('Error deleting supplier from Firestore:', err);
      });
    }

    renderSuppliersList();
    showToast('ลบซัพพลายเออร์เรียบร้อยแล้ว', 'info');
  }
}

function renderSuppliersList() {
  const container = document.getElementById('suppliersListContainer');
  const countEl = document.getElementById('suppCount');
  if (!container) return;

  countEl.innerText = appData.suppliers.length;

  if (appData.suppliers.length === 0) {
    container.innerHTML = `<p class="text-center py-4 text-xs text-slate-400">ยังไม่มีซัพพลายเออร์ กรุณาเพิ่มด้านบน</p>`;
    return;
  }

  container.innerHTML = appData.suppliers.map(s => `
    <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-xs">
      <div>
        <div class="font-bold text-slate-800">${escapeHtml(s.name)}</div>
        <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
          ${s.phone ? `<span><i class="fa-solid fa-phone text-[10px]"></i> ${escapeHtml(s.phone)}</span>` : ''}
          ${s.line ? `<span><i class="fa-brands fa-line text-green-600"></i> ${escapeHtml(s.line)}</span>` : ''}
          ${s.note ? `<span class="text-slate-400">• ${escapeHtml(s.note)}</span>` : ''}
        </div>
      </div>
      <div class="flex items-center space-x-1 shrink-0">
        <button onclick="editSupplier('${s.id}')" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg text-xs transition" title="แก้ไขข้อมูลซัพพลายเออร์">
          <i class="fa-regular fa-pen-to-square"></i>
        </button>
        <button onclick="deleteSupplier('${s.id}')" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs transition" title="ลบซัพพลายเออร์">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// ==================== CLOUD SYNC (FIREBASE FIRESTORE) ====================
function openCloudModal() {
  document.getElementById('cloudModal').classList.remove('hidden');
}

function closeCloudModal() {
  document.getElementById('cloudModal').classList.add('hidden');
}

function switchStorageMode(mode) {
  if (mode === 'firebase') {
    saveAndConnectFirebase();
  } else {
    appData.storageMode = 'local';
    localStorage.setItem(STORAGE_KEY_MODE, 'local');
    if (appData.firebaseUnsubscribe) {
      appData.firebaseUnsubscribe();
      appData.firebaseUnsubscribe = null;
    }
    updateStorageUI();
    showToast('เปลี่ยนเป็นโหมดออฟไลน์ในเครื่อง (Local Storage)', 'info');
  }
}

function updateStorageUI() {
  const dot = document.getElementById('cloudStatusDot');
  const text = document.getElementById('cloudStatusText');
  const btnLocal = document.getElementById('btnModeLocal');
  const btnFirebase = document.getElementById('btnModeFirebase');

  if (appData.storageMode === 'firebase' && appData.firebaseDb) {
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    text.innerText = 'Cloud ซิงค์';
    if (btnFirebase) btnFirebase.className = 'p-2.5 rounded-xl border border-emerald-500 bg-emerald-50 text-emerald-800 text-center font-bold';
    if (btnLocal) btnLocal.className = 'p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-center font-normal';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-amber-400';
    text.innerText = 'ออฟไลน์';
    if (btnLocal) btnLocal.className = 'p-2.5 rounded-xl border border-indigo-500 bg-indigo-50 text-indigo-800 text-center font-bold';
    if (btnFirebase) btnFirebase.className = 'p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-center font-normal';
  }
}

function parseFirebaseConfigInput(str) {
  str = (str || '').trim();
  try {
    return JSON.parse(str);
  } catch(e) {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return (new Function("return " + match[0]))();
      } catch(err2) {
        throw new Error('รูปแบบ Config ไม่ถูกต้อง');
      }
    }
    if (typeof DEFAULT_FIREBASE_CONFIG !== 'undefined') {
      return DEFAULT_FIREBASE_CONFIG;
    }
    throw new Error('ไม่พบข้อมูล Config กรุณาวาง Firebase Config');
  }
}

async function saveAndConnectFirebase() {
  const configText = document.getElementById('firebaseConfigInput').value.trim();
  if (!configText) {
    showToast('กรุณาวาง Firebase Config', 'warning');
    return;
  }

  localStorage.setItem(STORAGE_KEY_CONFIG, configText);
  appData.storageMode = 'firebase';
  localStorage.setItem(STORAGE_KEY_MODE, 'firebase');
  updateStorageUI();

  const resultBox = document.getElementById('firebaseTestResult');
  resultBox.className = 'p-2.5 rounded-lg text-xs bg-indigo-50 border border-indigo-200 text-indigo-800';
  resultBox.innerHTML = '⏳ กำลังเชื่อมต่อและอัปเดตข้อมูลขึ้น Cloud...';
  resultBox.classList.remove('hidden');

  try {
    const cfg = parseFirebaseConfigInput(configText);

    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }

    const db = firebase.firestore();
    appData.firebaseDb = db;

    // 1. FIRST, clean up Cloud: Delete any documents in Cloud that user already deleted locally
    const snapshot = await db.collection('orders').get();
    const currentOrderIds = new Set(appData.orders.map(o => o.id));
    const batch = db.batch();

    snapshot.forEach(doc => {
      if (!currentOrderIds.has(doc.id)) {
        batch.delete(doc.ref);
      }
    });

    // Save our current orders
    appData.orders.forEach(order => {
      const docRef = db.collection('orders').doc(order.id);
      batch.set(docRef, order);
    });

    await batch.commit();

    // 2. NOW attach the realtime listener
    listenToFirestore(db);

    resultBox.className = 'p-2.5 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-800';
    resultBox.innerHTML = '✅ เชื่อมต่อและซิงค์ Cloud สำเร็จ! รายการที่ลบไปจะไม่กลับมาอีก';
    updateStorageUI();
    showToast('เชื่อมต่อ Cloud และซิงค์ข้อมูลเรียบร้อยแล้ว!', 'success');

  } catch (err) {
    console.error('Firebase save & connect error:', err);
    resultBox.className = 'p-2.5 rounded-lg text-xs bg-red-50 border border-red-200 text-red-800';
    resultBox.innerHTML = '❌ เชื่อมต่อไม่สำเร็จ: ' + err.message;
    updateStorageUI();
    showToast('เชื่อมต่อไม่สำเร็จ: ' + err.message, 'warning');
  }
}

function listenToFirestore(db) {
  if (appData.firebaseUnsubscribe) {
    appData.firebaseUnsubscribe();
  }

  appData.firebaseUnsubscribe = db.collection('orders').onSnapshot((snapshot) => {
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    appData.orders = orders;
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    renderDashboard();
  }, (err) => {
    console.error('Firestore listener error:', err);
    if (err.code === 'permission-denied') {
      showToast('Firestore ติดสิทธิ์: กรุณาไปที่แท็บ Rules แล้วเปลี่ยน false; เป็น true;', 'warning');
    }
  });
}

function connectFirebase(configStr) {
  try {
    const cfg = parseFirebaseConfigInput(configStr);
    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }
    const db = firebase.firestore();
    appData.firebaseDb = db;
    listenToFirestore(db);
    updateStorageUI();
  } catch(err) {
    console.error('Connect firebase silent error:', err);
  }
}

async function syncOrdersToFirebase() {
  if (!appData.firebaseDb) return;
  try {
    const snapshot = await appData.firebaseDb.collection('orders').get();
    const currentIds = new Set(appData.orders.map(o => o.id));
    const batch = appData.firebaseDb.batch();

    // 1. Delete documents in Cloud that are no longer in our local orders list
    snapshot.forEach(doc => {
      if (!currentIds.has(doc.id)) {
        batch.delete(doc.ref);
      }
    });

    // 2. Save current orders with sanitization
    appData.orders.forEach(order => {
      const cleanOrder = sanitizeOrderForFirestore(order);
      const docRef = appData.firebaseDb.collection('orders').doc(cleanOrder.id);
      batch.set(docRef, cleanOrder);
    });

    await batch.commit();
    console.log('Orders synced cleanly with Cloud Firestore');
  } catch(e) {
    console.warn('Firebase batch write warning:', e);
  }
}

async function syncSuppliersToFirebase() {
  if (!appData.firebaseDb) return;
  try {
    const snapshot = await appData.firebaseDb.collection('suppliers').get();
    const currentIds = new Set(appData.suppliers.map(s => s.id));
    const batch = appData.firebaseDb.batch();

    // 1. Delete suppliers in Cloud that are no longer in local
    snapshot.forEach(doc => {
      if (!currentIds.has(doc.id)) {
        batch.delete(doc.ref);
      }
    });

    // 2. Save current suppliers
    appData.suppliers.forEach(s => {
      const docRef = appData.firebaseDb.collection('suppliers').doc(s.id);
      batch.set(docRef, s);
    });

    await batch.commit();
    console.log('Suppliers synced cleanly with Cloud Firestore');
  } catch(e) {
    console.warn('Firebase batch supp write warning:', e);
  }
}

async function forcePushLocalToCloud() {
  if (!appData.firebaseDb) {
    showToast('กรุณาเชื่อมต่อ Firebase ก่อน', 'warning');
    return;
  }
  if (confirm('คุณต้องการนำข้อมูลปัจจุบันในเครื่องนี้ขึ้น Cloud แทนที่ข้อมูลเดิมใช่หรือไม่? (รายการที่ลบไปแล้วจะไม่กลับมา)')) {
    await syncOrdersToFirebase();
    await syncSuppliersToFirebase();
    showToast('✅ ซิงค์ข้อมูลในเครื่องขึ้น Cloud สำเร็จ!', 'success');
  }
}

async function clearCloudOrders() {
  if (!appData.firebaseDb) {
    showToast('กรุณาเชื่อมต่อ Firebase ก่อน', 'warning');
    return;
  }
  if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลคำสั่งซื้อทั้งหมด?')) {
    try {
      const snapshot = await appData.firebaseDb.collection('orders').get();
      const batch = appData.firebaseDb.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      appData.orders = [];
      saveOrdersToStorage();
      renderDashboard();
      showToast('ล้างข้อมูลคำสั่งซื้อทั้งหมดเรียบร้อยแล้ว', 'info');
    } catch(e) {
      showToast('เกิดข้อผิดพลาด: ' + e.message, 'warning');
    }
  }
}

function loadDemoFirebaseConfig() {
  const sample = {
    apiKey: "AIzaSy_SAMPLE_KEY_FOR_TEST",
    authDomain: "my-shop-orders.firebaseapp.com",
    projectId: "my-shop-orders",
    storageBucket: "my-shop-orders.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  };
  document.getElementById('firebaseConfigInput').value = JSON.stringify(sample, null, 2);
}

// Backup & Restore
function exportDataJSON() {
  const exportData = {
    orders: appData.orders,
    suppliers: appData.suppliers,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `order-reminder-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('สำรองข้อมูลเป็นไฟล์ JSON สำเร็จ', 'success');
}

function importDataJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.orders) appData.orders = data.orders;
      if (data.suppliers) appData.suppliers = data.suppliers;
      saveOrdersToStorage();
      saveSuppliersToStorage();
      renderDashboard();
      showToast('นำเข้าข้อมูลสำเร็จ!', 'success');
    } catch(err) {
      showToast('ไฟล์ JSON ไม่ถูกต้อง', 'warning');
    }
  };
  reader.readAsText(file);
}

// ==================== MOBILE GUIDE MODAL & LOCAL TESTING ====================
function openMobileGuideModal() {
  document.getElementById('mobileGuideModal').classList.remove('hidden');
}

function closeMobileGuideModal() {
  document.getElementById('mobileGuideModal').classList.add('hidden');
}

function setupLocalQrCode() {
  const container = document.getElementById('localQrContainer');
  const ipText = document.getElementById('localIpUrl');
  if (!container || !window.QRCode) return;

  // Use current host or guide
  const currentUrl = window.location.href;
  container.innerHTML = '';
  new QRCode(container, {
    text: currentUrl,
    width: 110,
    height: 110,
    colorDark: '#312e81',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  if (ipText) {
    ipText.innerText = currentUrl;
  }
}

// ==================== HELPERS ====================
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysDiff(todayStr, targetDateStr) {
  if (!targetDateStr) return 0;
  const d1 = new Date(todayStr + 'T00:00:00');
  const d2 = new Date(targetDateStr + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function getDaysUntilCleanup(deliveredAtStr) {
  if (!deliveredAtStr) return 14;
  const deliveredTime = new Date(deliveredAtStr).getTime();
  const now = Date.now();
  const diffMs = (14 * 86400000) - (now - deliveredTime);
  const daysLeft = Math.ceil(diffMs / 86400000);
  return daysLeft > 0 ? daysLeft : 0;
}

function formatDateThai(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543; // Buddhist Era
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${months[monthIndex]} ${year}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  let bg = 'bg-slate-800 text-white';
  let icon = 'fa-info-circle';

  if (type === 'success') {
    bg = 'bg-emerald-600 text-white';
    icon = 'fa-circle-check';
  } else if (type === 'warning') {
    bg = 'bg-amber-600 text-white';
    icon = 'fa-triangle-exclamation';
  }

  toast.className = `${bg} px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center space-x-2 pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  // Trigger animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Remove after 3.5s
  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==================== NOTIFICATION SYSTEM ====================
function initNotifications() {
  updateNotificationHeaderBadge();

  // Check overdue items on startup after short delay
  setTimeout(() => {
    checkAndNotifyOverdueOrders(false);
  }, 2000);

  // Periodic check every 30 minutes
  setInterval(() => {
    checkAndNotifyOverdueOrders(false);
  }, 30 * 60 * 1000);
}

function updateNotificationHeaderBadge() {
  const dot = document.getElementById('headerNotifDot');
  const label = document.getElementById('headerNotifLabel');
  if (!dot) return;

  if ('Notification' in window && Notification.permission === 'granted') {
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400 inline-block';
    dot.classList.remove('hidden');
    if (label) label.innerText = 'เตือนเปิดอยู่';
  } else {
    dot.classList.add('hidden');
    if (label) label.innerText = 'แจ้งเตือน';
  }
}

function openNotificationModal() {
  updateNotificationModalUI();
  document.getElementById('notificationModal').classList.remove('hidden');
}

function closeNotificationModal() {
  document.getElementById('notificationModal').classList.add('hidden');
}

function updateNotificationModalUI() {
  const statusText = document.getElementById('notifStatusText');
  const statusBadge = document.getElementById('notifStatusBadge');
  const btnRequest = document.getElementById('btnRequestNotif');
  const countText = document.getElementById('notifOverdueCountText');

  const todayStr = getTodayDateString();
  const overdueCount = appData.orders.filter(o => 
    o.status !== 'มาส่งแล้ว' && o.dueDate && o.dueDate < todayStr
  ).length;

  if (countText) {
    countText.innerText = `มีสินค้าที่สั่งแล้วเกินกำหนดส่ง: ${overdueCount} รายการ`;
  }

  if (!('Notification' in window)) {
    if (statusText) statusText.innerText = 'อุปกรณ์นี้ไม่รองรับ Web Notification API';
    if (statusBadge) {
      statusBadge.innerText = 'ไม่รองรับ';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600';
    }
    if (btnRequest) btnRequest.disabled = true;
    return;
  }

  if (Notification.permission === 'granted') {
    if (statusText) statusText.innerText = 'เปิดใช้งานแล้ว (จะเด้งเตือนเมื่อมีของเกินกำหนด)';
    if (statusBadge) {
      statusBadge.innerText = 'เปิดใช้งานแล้ว 🟢';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
    if (btnRequest) {
      btnRequest.innerHTML = '<i class="fa-solid fa-check"></i> อุปกรณ์นี้เปิดรับการแจ้งเตือนแล้ว';
      btnRequest.className = 'w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-default';
    }
  } else if (Notification.permission === 'denied') {
    if (statusText) statusText.innerText = 'ถูกปิดกั้นในบราวเซอร์ (กรุณาเปิดในตั้งค่าสิทธิ์เว็บไซต์)';
    if (statusBadge) {
      statusBadge.innerText = 'ถูกบล็อก 🔴';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200';
    }
    if (btnRequest) {
      btnRequest.innerHTML = '<i class="fa-solid fa-gear"></i> สิทธิ์ถูกบล็อก: ต้องเปิดในตั้งค่าเว็บไซต์';
      btnRequest.className = 'w-full py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2';
    }
  } else {
    if (statusText) statusText.innerText = 'ยังไม่ได้รับสิทธิ์ (คลิกปุ่มด้านล่างเพื่อเปิด)';
    if (statusBadge) {
      statusBadge.innerText = 'ยังไม่เปิด 🟡';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200';
    }
    if (btnRequest) {
      btnRequest.innerHTML = '<i class="fa-solid fa-bell"></i> เปิดรับการแจ้งเตือนบนเครื่องนี้';
      btnRequest.className = 'w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2';
      btnRequest.disabled = false;
    }
  }

  updateNotificationHeaderBadge();
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน', 'warning');
    return;
  }

  Notification.requestPermission().then(permission => {
    updateNotificationModalUI();
    if (permission === 'granted') {
      sendSystemNotification('🔔 เปิดการแจ้งเตือนสำเร็จ!', 'ระบบจะส่งเสียงและเด้งเตือนเมื่อมีสินค้าที่สั่งแล้วเกินวันที่กำหนดส่ง');
      checkAndNotifyOverdueOrders(true);
    } else {
      showToast('การแจ้งเตือนยังไม่ได้รับอนุญาต', 'info');
    }
  });
}

function testNotificationAlert() {
  sendSystemNotification('🧪 ทดสอบการแจ้งเตือนสำเร็จ!', 'ระบบแจ้งเตือนทำงานปกติ! เมื่อมีสินค้าที่สั่งแล้วเกินวันที่กำหนดส่ง จะมีข้อความเด้งเตือนและมีเสียงแบบนี้ครับ');
}

function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    // Two-tone chime: D5 (587Hz) then A5 (880Hz)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
  } catch(e) {
    console.log('Audio chime not supported or muted');
  }
}

function sendSystemNotification(title, body) {
  playAlertChime();

  const options = {
    body: body,
    icon: './icon.svg',
    badge: './icon.svg',
    tag: 'order-reminder-alert',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300],
    data: { url: './index.html' }
  };

  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, options).catch(() => {
          new Notification(title, options);
        });
      }).catch(() => {
        new Notification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  }

  showToast(`${title}: ${body}`, 'warning');
}

function checkAndNotifyOverdueOrders(force = false) {
  const todayStr = getTodayDateString();
  const overdueOrders = appData.orders.filter(o => 
    o.status !== 'มาส่งแล้ว' && o.dueDate && o.dueDate < todayStr
  );

  if (overdueOrders.length === 0) return;

  const lastNotifKey = 'last_overdue_notif_date_v2';
  const lastNotifiedDate = localStorage.getItem(lastNotifKey);

  // If already notified today and not forced, skip
  if (!force && lastNotifiedDate === todayStr) {
    return;
  }

  const count = overdueOrders.length;
  const first = overdueOrders[0];
  const title = `⚠️ มีสินค้าสั่งแล้วเกินกำหนดส่ง ${count} รายการ!`;
  const body = `พบสินค้าจาก "${first.supplierName}" เกินกำหนดส่งแล้วและยังไม่มาส่ง กรุณาติดตามสินค้า`;

  sendSystemNotification(title, body);
  localStorage.setItem(lastNotifKey, todayStr);
}
