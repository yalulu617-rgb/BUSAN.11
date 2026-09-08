// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: Wallet Module (Tickets, Hotel, Wallet UI)
// Responsibilities: ticket CRUD, hotel CRUD, wallet tab switching, renderers
// ─────────────────────────────────────────────────────────────────────────

// ── Ticket CRUD ────────────────────────────────────────────────────────────
window.addTicket = async function () {
    const typeEl    = document.getElementById('tkType');
    const titleEl   = document.getElementById('tkTitle');
    const descEl    = document.getElementById('tkDesc');
    const linkEl    = document.getElementById('tkLink');
    const voucherEl = document.getElementById('tempVoucher');

    const title = titleEl?.value?.trim();
    if (!title) { showToast('請填入票券名稱', 'warning'); return; }

    const ticket = {
        type    : typeEl?.value || '🎫 門票',
        title,
        desc    : descEl?.value?.trim() || '',
        link    : linkEl?.value?.trim() || '',
        voucher : voucherEl?.value || '',
        booked  : false,
        ts      : Date.now()
    };
    try {
        await NetworkEngine.firebasePush(DB_TICKETS, ticket);
    } catch (e) {
        console.error('[Wallet] addTicket push failed:', e);
        showToast('票券儲存失敗，請稍後重試', 'error');
        return;
    }

    if (titleEl)   titleEl.value   = '';
    if (descEl)    descEl.value    = '';
    if (linkEl)    linkEl.value    = '';
    if (voucherEl) voucherEl.value = '';
    showToast('✅ 票券已儲存', 'success');
};

window.deleteTicket = async function (key) {
    if (!confirm('確認刪除此票券？')) return;
    try {
        await NetworkEngine.firebaseRemove(`${DB_TICKETS}/${key}`);
    } catch (e) {
        console.error('[Wallet] deleteTicket failed:', e);
        showToast('刪除票券失敗', 'error');
    }
};

// ── Hotel CRUD ─────────────────────────────────────────────────────────────
// editHotel: populate a form modal and let user save changes back to Firebase
window.editHotel = function () {
    const h = window.hotelData || {};
    // Populate the hotel edit modal if it exists; otherwise fall back to direct Firebase link
    const modalEl = document.getElementById('hotelEditModal');
    if (!modalEl) {
        // No dedicated modal in current HTML — guide user to Firebase console
        showToast('請至 Firebase Realtime Database 編輯飯店資訊', 'info');
        return;
    }
    // Populate fields if modal exists
    const fields = ['name','nameEN','addressKR','address','checkInDate','checkInTime',
                    'checkOutDate','checkOutTime','phone','wifiName','wifiPassword',
                    'website','totalPrice','currency','guestCount','hotelPhoto'];
    fields.forEach(f => {
        const el = document.getElementById(`hotel_${f}`);
        if (el) el.value = h[f] || '';
    });
    modalEl.style.display = 'flex';
};

window.saveHotel = async function () {
    const fields = ['name','nameEN','addressKR','address','checkInDate','checkInTime',
                    'checkOutDate','checkOutTime','phone','wifiName','wifiPassword',
                    'website','totalPrice','currency','guestCount','hotelPhoto'];
    const data = {};
    fields.forEach(f => {
        const el = document.getElementById(`hotel_${f}`);
        if (el) data[f] = el.value.trim() || '尚未填寫';
    });
    try {
        await NetworkEngine.firebaseWrite(DB_HOTEL, data);
    } catch (e) {
        console.error('[Wallet] saveHotel failed:', e);
        showToast('飯店資料儲存失敗', 'error');
        return;
    }
    const modalEl = document.getElementById('hotelEditModal');
    if (modalEl) modalEl.style.display = 'none';
    showToast('✅ 飯店資料已儲存', 'success');
};

window.deleteHotelData = async function () {
    if (!confirm('確認清除所有飯店資料？此操作不可還原。')) return;
    try {
        await NetworkEngine.firebaseWrite(DB_HOTEL, null);
    } catch (e) {
        console.error('[Wallet] deleteHotelData failed:', e);
        showToast('清除飯店資料失敗', 'error');
        return;
    }
    window.hotelData = {};
    if (typeof renderTickets_LogicOnly === 'function') renderTickets_LogicOnly();
    showToast('飯店資料已清除', 'info');
};

window.toggleHotelDetail = function (triggerEl) {
    const card = triggerEl.closest('.card');
    if (!card) return;
    const box  = card.querySelector('.hotel-details-box');
    const txt  = triggerEl.querySelector('.toggle-text');
    const icon = triggerEl.querySelector('.toggle-arrow-icon');
    if (!box) return;
    const isOpen = box.style.display !== 'none';
    box.style.display = isOpen ? 'none' : 'block';
    if (txt)  txt.innerText          = isOpen ? '展開' : '收起';
    if (icon) icon.style.transform   = isOpen ? ''     : 'rotate(180deg)';
};



window.renderTickets_LogicOnly = function() {
    const l = document.getElementById('ticketList');
    const l_wallet = document.getElementById('walletTicketsList');
    const l_trip = document.getElementById('ticketList_trip');
    const l_lodging_trip = document.getElementById('tripLodgingContainer');
    const l_lodging_wallet = document.getElementById('walletHotelInfoCard');
    if (!l && !l_wallet && !l_trip && !l_lodging_trip && !l_lodging_wallet) return;
    
    const ctx = getTripContext();
    if (!ctx || !ctx.currentHotel) return;
    
    let lodgingHtml = "";
    let ticketsHtml = "";
    
    const h = ctx.currentHotel;
    if (h && (h.name || h.nameEN)) {
        const truthfulValue = value => safeValue(value, "尚未確認");
        const hotelAddress = truthfulValue(h.addressKR || h.address);
        const taxiHotelName = truthfulValue(h.nameEN || h.name);
        const taxiDestination = [taxiHotelName, hotelAddress].filter(value => value !== "尚未確認").join('\n');
        const encodedTaxiDestination = encodeURIComponent(taxiDestination);
        let maps = getMapLinks(h.addressKR || h.address);
        let googleBtn = maps.google ? `<a href="${maps.google}" target="_blank" class="map-tag" style="background:#4285F4; color:white;"><i class="fa-solid fa-map"></i> Google Maps</a>` : '';
        let naverBtn = maps.naver ? `<a href="${maps.naver}" target="_blank" class="map-tag" style="background:#03C75A; color:white;"><i class="fa-solid fa-location-arrow"></i> Naver Map</a>` : '';
        let kakaoBtn = maps.kakao ? `<a href="${maps.kakao}" target="_blank" class="map-tag" style="background:#FEE500; color:#3C1E1E;"><i class="fa-solid fa-route"></i> Kakao Map</a>` : '';
        let appleBtn = maps.apple ? `<a href="${maps.apple}" target="_blank" class="map-tag" style="background:#000000; color:white;"><i class="fa-brands fa-apple"></i> Apple Maps</a>` : '';
        
        let websiteBtn = h.website ? safeUrl(h.website, "官方網站", "fa-solid fa-globe", "var(--dora)", "white") : '尚未填寫';
        let photoHtml = (h.hotelPhoto && h.hotelPhoto !== "尚未填寫") ? `<img src="${h.hotelPhoto}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 12px; margin-bottom: 10px; cursor: zoom-in;" onclick="openLightbox('${h.hotelPhoto}', null)">` : '';
        
        const nightsVal = calculateNights(h.checkInDate, h.checkOutDate);
        const totalPriceVal = Number(h.totalPrice);
        const guestsVal = Number(h.guestCount);
        
        let nightsText = "尚未填寫";
        let avgPerNight = "尚未填寫";
        let avgPerGuest = "尚未填寫";
        let avgPerGuestNight = "尚未填寫";
        
        if (nightsVal !== null && !isNaN(nightsVal)) {
            nightsText = nightsVal + " 晚";
            if (!isNaN(totalPriceVal)) {
                avgPerNight = safePrice(totalPriceVal / nightsVal, h.currency);
            }
        }
        if (!isNaN(totalPriceVal) && guestsVal > 0) {
            avgPerGuest = safePrice(totalPriceVal / guestsVal, h.currency);
            if (nightsVal !== null && !isNaN(nightsVal)) {
                avgPerGuestNight = safePrice(totalPriceVal / (guestsVal * nightsVal), h.currency);
            }
        }
        
        lodgingHtml = `
<div class="card fade-scale-in" style="padding: 16px; border-left: 6px solid var(--primary); margin-bottom: 12px; position: relative; border-radius: 20px; background: var(--card-bg);">
    <div style="position: absolute; top: 12px; right: 12px; z-index:10; display:flex; gap:6px;">
        <button class="btn-edit" onclick="editHotel()" style="background:#f39c12; color:white; border:none; border-radius:8px; padding: 4px 8px; font-size:0.7rem; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-delete" onclick="deleteHotelData()"><i class="fa-solid fa-trash"></i></button>
    </div>
    
    ${photoHtml}
    <div style="margin-bottom: 10px;">
        <span style="background: var(--primary); color: white; padding: 2px 6px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; display: inline-block; margin-bottom: 4px;">🏨 住宿卡</span>
        <h3 style="margin: 0 0 4px 0; font-weight: 900; color: var(--text-color); font-size: 1.1rem;">${safeValue(h.name)}</h3>
        <div style="font-size: 0.75rem; color: #7f8c8d; font-weight: 700; line-height: 1.3;">
            <div>🇰🇷 ${truthfulValue(h.country)} · ${hotelAddress}</div>
        </div>
    </div>
    
    <div style="display: flex; gap: 6px; margin-bottom: 10px; background: rgba(243,156,18,0.03); padding: 8px; border-radius: 10px; border: 1px solid rgba(243,156,18,0.1);">
        <div style="flex: 1; text-align: center; border-right: 1px dashed rgba(243,156,18,0.2); padding-right: 4px;">
            <div style="font-size: 0.65rem; color: #a5b1c2; font-weight: 900;">📅 入住</div>
            <div style="font-size: 0.8rem; font-weight: 900; color: var(--primary); margin: 2px 0;">${truthfulValue(h.checkInDate)}</div>
            <div style="font-size: 0.65rem; color: #7f8c8d; font-weight: 700;">🕒 ${truthfulValue(h.checkInTime)}</div>
        </div>
        <div style="flex: 1; text-align: center; padding-left: 4px;">
            <div style="font-size: 0.65rem; color: #a5b1c2; font-weight: 900;">📅 退房</div>
            <div style="font-size: 0.8rem; font-weight: 900; color: var(--text-color); margin: 2px 0;">${truthfulValue(h.checkOutDate)}</div>
            <div style="font-size: 0.65rem; color: #7f8c8d; font-weight: 700;">🕒 ${truthfulValue(h.checkOutTime)}</div>
        </div>
    </div>

    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
        ${googleBtn} ${naverBtn} ${kakaoBtn} ${appleBtn}
    </div>

    <div onclick="toggleHotelDetail(this)" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.02); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--border-color); margin-top: 8px;">
        <span style="font-weight: 900; font-size: 0.75rem; color: var(--primary);"><i class="fa-solid fa-circle-chevron-down toggle-arrow-icon"></i> 詳細客房與 WiFi 資訊</span>
        <span style="font-size: 0.65rem; background: rgba(192, 57, 43, 0.1); padding: 2px 6px; border-radius: 4px; color: var(--primary); font-weight: 900;" class="toggle-text">展開</span>
    </div>

    <div class="hotel-details-box" style="display: none; margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-color); line-height: 1.4;">
            <div>📶 WiFi 名稱：<b>${truthfulValue(h.wifiName)}</b></div>
            <div>🔑 WiFi 密碼：<b>${truthfulValue(h.wifiPassword)}</b></div>
            <div>🔌 插座：<b>${truthfulValue(h.outlet)}</b></div>
            <div>🧺 洗衣：<b>${truthfulValue(h.laundry)}</b></div>
            <div>🧳 行李寄放：<b>${truthfulValue(h.luggageStorage)}</b></div>
            <div style="margin-top: 6px;">📞 櫃台電話：<b>${truthfulValue(h.phone)}</b></div>
            <div>🌐 官方網站：${websiteBtn}</div>
            <div style="margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.02); border-radius: 8px; font-family: monospace;">
                기사님, 여기로 부탁드립니다.<br><b>${taxiHotelName}</b><br>${hotelAddress}
            </div>
            <button class="v38-mini-btn hotel-taxi-copy" style="width:100%; margin-top:6px;" data-taxi-destination="${encodedTaxiDestination}" onclick="copyTaxiHelper(decodeURIComponent(this.dataset.taxiDestination))"><i class="fa-solid fa-copy"></i> 複製計程車字條</button>
        </div>
    </div>
</div>`;
    }

    (window.ticketData || []).forEach(t => {
        if (t.type !== "🏨 住宿") {
            let lh = t.link ? `<a href="${t.link}" target="_blank" class="map-tag" style="background:#03C75A; color:white;"><i class="fa-solid fa-globe"></i> 官方預約</a>` : '';
            let vh = t.voucher ? `<a href="${t.voucher}" target="_blank" class="map-tag" style="background:var(--primary); color:white;"><i class="fa-solid fa-image"></i> 看憑證</a>` : '';
            
            let dateBadge = t.expiry ? `<span class="v38-badge" style="background:#8e8e93; font-size:0.65rem;">⏳ 到期日: ${t.expiry}</span>` : '';
            const reservationState = TripContextEngine.resolveReservationState(t);
            const isBooked = reservationState === "已預訂";
            let statusBadge = `<span class="v38-tag reservation-status" style="background:${isBooked ? '#eafaf1' : '#fff9e6'}; color:${isBooked ? '#2ecc71' : '#f39c12'}; font-size:0.65rem; font-weight:900;">${reservationState}</span>`;
            const credentialState = t.voucher ? '憑證已上傳' : '憑證尚未上傳';
            
            let cardOpacity = isBooked ? "opacity: 0.7; filter: grayscale(30%);" : "";
            
            ticketsHtml += `
                <div class="card fade-scale-in" style="padding:14px; border-left:5px solid var(--dora); margin-bottom:10px; background: var(--card-bg); ${cardOpacity}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="flex:1;">
                            <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
                                <span class="v38-badge" style="background:var(--dora); font-size:0.65rem;">${t.type}</span>
                                ${statusBadge}
                                ${dateBadge}
                            </div>
                            <div style="font-weight:900; font-size:1rem; color:var(--text-color); margin-bottom:4px;">${t.title}</div>
                            <div style="font-size:0.8rem; color:#7f8c8d; font-weight:700;">${t.desc}</div>
                            <div class="reservation-credential" style="font-size:0.72rem; color:#7f8c8d; font-weight:800; margin-top:5px;">${credentialState}</div>
                            <div style="display:flex; gap:6px; margin-top:8px;">
                                ${lh} ${vh}
                            </div>
                        </div>
                        <button class="btn-delete" onclick="deleteTicket('${t.key}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }
    });
    
    const reservationCardsHtml = (ctx.reservations || []).map(item => {
        const isBooked = item.status === '已預訂';
        const isPending = item.status === '尚未預訂';
        const statusBackground = isBooked ? '#eafaf1' : (isPending ? '#fff9e6' : '#eef4ff');
        const statusColor = isBooked ? '#219653' : (isPending ? '#c27c0e' : '#3867d6');
        return `
            <div class="reservation-state-card" data-reservation-id="${item.id}" style="background:rgba(255,255,255,0.08); padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
                    <div>
                        <span style="font-size:0.68rem;color:#bdc3c7;font-weight:800;">${item.category}</span>
                        <div class="reservation-name" style="color:#ffffff;font-weight:900;">${item.name}</div>
                    </div>
                    <span class="reservation-status" style="background:${statusBackground};color:${statusColor};padding:3px 8px;border-radius:999px;font-size:0.68rem;font-weight:900;">${item.status}</span>
                </div>
                <div class="reservation-details" style="font-size:0.75rem;color:#dfe4ea;margin-top:4px;">${item.details}</div>
                <div class="reservation-credential" style="font-size:0.7rem;color:#f5cd79;font-weight:800;margin-top:5px;">${item.credentialStatus}</div>
            </div>`;
    }).join('');
    const canonicalSummaryHtml = `
        <div class="card fade-scale-in" style="background: linear-gradient(135deg, #1a252f, #2c3e50) !important; color:#ffffff !important; border-radius: 20px; padding: 16px; margin-bottom: 16px; border-left: 6px solid #f1c40f; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-weight:900; font-size:1.05rem; color:#f1c40f;"><i class="fa-solid fa-plane-departure"></i> 本次旅程資訊</span>
                <span class="v38-badge" style="background:#f1c40f; color:#2c3e50; font-weight:900; font-size:0.68rem; padding:3px 8px;">預約四態</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:0.82rem; line-height:1.5; color:#f8f9fa;">
                ${reservationCardsHtml}
            </div>
        </div>
        <div style="font-weight:900; font-size:0.95rem; color:var(--primary); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-folder-open"></i> 我的已存票券 / 個人憑證
        </div>
    `;

    if (l) l.innerHTML = lodgingHtml + ticketsHtml;
    if (l_wallet) l_wallet.innerHTML = canonicalSummaryHtml + (ticketsHtml || `<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">尚無個人上傳憑證</p>`);
    if (l_lodging_wallet) l_lodging_wallet.innerHTML = lodgingHtml || `<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">尚未填寫住宿資料</p>`;
    if (l_trip) l_trip.innerHTML = ticketsHtml || `<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">尚無憑證資料</p>`;
    if (l_lodging_trip) l_lodging_trip.innerHTML = lodgingHtml || `<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">尚未填寫住宿</p>`;
};

window.switchWalletTab = function(subtab) {
    const tabs = {
        ticket: { btn: document.getElementById('btnWalletTicket'), sec: document.getElementById('walletTicketSection') },
        hotel: { btn: document.getElementById('btnWalletHotel'), sec: document.getElementById('walletHotelSection') },
        doc: { btn: document.getElementById('btnWalletDoc'), sec: document.getElementById('walletDocSection') },
        coupon: { btn: document.getElementById('btnWalletCoupon'), sec: document.getElementById('walletCouponSection') },
        memory: { btn: document.getElementById('btnWalletMemory'), sec: document.getElementById('walletMemorySection') }
    };
    
    Object.keys(tabs).forEach(k => {
        const item = tabs[k];
        if (item.btn) item.btn.classList.remove('active');
        if (item.sec) item.sec.style.display = 'none';
    });
    
    const active = tabs[subtab];
    if (active) {
        if (active.btn) active.btn.classList.add('active');
        if (active.sec) active.sec.style.display = 'block';
    }

    const titleEl = document.getElementById('walletHeaderTitle');
    const subTitleEl = document.getElementById('walletHeaderSubtitle');
    if (titleEl && subTitleEl) {
        if (subtab === 'ticket') {
            titleEl.innerHTML = '<i class="fa-solid fa-ticket"></i> 票券住宿';
            subTitleEl.textContent = 'Travel Wallet';
        } else if (subtab === 'hotel') {
            titleEl.innerHTML = '<i class="fa-solid fa-hotel"></i> 飯店住宿';
            subTitleEl.textContent = 'Travel Wallet · Hotel';
        } else if (subtab === 'doc') {
            titleEl.innerHTML = '<i class="fa-solid fa-suitcase-rolling"></i> 行前準備';
            subTitleEl.textContent = 'Travel Wallet · Docs';
        } else if (subtab === 'coupon') {
            titleEl.innerHTML = '<i class="fa-solid fa-gift"></i> 優惠券專區';
            subTitleEl.textContent = 'Travel Wallet · Coupon';
        } else if (subtab === 'memory') {
            titleEl.innerHTML = '<i class="fa-solid fa-camera-retro"></i> 旅行回憶';
            subTitleEl.textContent = 'Travel Wallet · Memory';
        }
    }
    
    if (subtab === 'hotel') {
        if (typeof renderSmartNearby === 'function') renderSmartNearby();
    } else if (subtab === 'doc') {
        if (typeof renderImmigrationRules === 'function') renderImmigrationRules();
        if (typeof renderPrepList === 'function') renderPrepList();
    } else if (subtab === 'memory') {
        if (typeof renderMemoryAlbum === 'function') renderMemoryAlbum();
        triggerContextUpdate();
    }
};
