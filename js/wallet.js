// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Wallet Service (Tickets & Hotels Renderers)
// ─────────────────────────────────────────────────────────────────────────

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
            <div>🇰🇷 ${safeValue(h.addressKR)}</div>
        </div>
    </div>
    
    <div style="display: flex; gap: 6px; margin-bottom: 10px; background: rgba(243,156,18,0.03); padding: 8px; border-radius: 10px; border: 1px solid rgba(243,156,18,0.1);">
        <div style="flex: 1; text-align: center; border-right: 1px dashed rgba(243,156,18,0.2); padding-right: 4px;">
            <div style="font-size: 0.65rem; color: #a5b1c2; font-weight: 900;">📅 入住</div>
            <div style="font-size: 0.8rem; font-weight: 900; color: var(--primary); margin: 2px 0;">${safeValue(h.checkInDate)}</div>
            <div style="font-size: 0.65rem; color: #7f8c8d; font-weight: 700;">🕒 ${safeValue(h.checkInTime)}</div>
        </div>
        <div style="flex: 1; text-align: center; padding-left: 4px;">
            <div style="font-size: 0.65rem; color: #a5b1c2; font-weight: 900;">📅 退房</div>
            <div style="font-size: 0.8rem; font-weight: 900; color: var(--text-color); margin: 2px 0;">${safeValue(h.checkOutDate)}</div>
            <div style="font-size: 0.65rem; color: #7f8c8d; font-weight: 700;">🕒 ${safeValue(h.checkOutTime)}</div>
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
            <div>📶 WiFi 名稱：<b>${safeValue(h.wifiName)}</b></div>
            <div>🔑 WiFi 密碼：<b>${safeValue(h.wifiPassword)}</b></div>
            <div style="margin-top: 6px;">📞 櫃台電話：<b>${safeValue(h.phone)}</b></div>
            <div>🌐 官方網站：${websiteBtn}</div>
            <div style="margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.02); border-radius: 8px; font-family: monospace;">
                기사님, 여기로 부탁드립니다.<br><b>${safeValue(h.addressKR)}</b>
            </div>
            <button class="v38-mini-btn" style="width:100%; margin-top:6px;" onclick="copyTaxiHelper('${h.addressKR || ''}')"><i class="fa-solid fa-copy"></i> 複製計程車字條</button>
        </div>
    </div>
</div>`;
    }

    ticketData.forEach(t => {
        if (t.type !== "🏨 住宿") {
            let lh = t.link ? `<a href="${t.link}" target="_blank" class="map-tag" style="background:#03C75A; color:white;"><i class="fa-solid fa-globe"></i> 官方預約</a>` : '';
            let vh = t.voucher ? `<a href="${t.voucher}" target="_blank" class="map-tag" style="background:var(--primary); color:white;"><i class="fa-solid fa-image"></i> 看憑證</a>` : '';
            
            let dateBadge = t.expiry ? `<span class="v38-badge" style="background:#8e8e93; font-size:0.65rem;">⏳ 到期日: ${t.expiry}</span>` : '';
            let isBooked = t.booked === true || t.booked === "true";
            let statusBadge = isBooked ? 
                `<span class="v38-tag" style="background:#eafaf1; color:#2ecc71; font-size:0.65rem; font-weight:900;"><i class="fa-solid fa-circle-check"></i> 已預約</span>` :
                `<span class="v38-tag" style="background:#fff9e6; color:#f39c12; font-size:0.65rem; font-weight:900;"><i class="fa-solid fa-clock"></i> 待預約</span>`;
            
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
    
    if (l) l.innerHTML = lodgingHtml + ticketsHtml;
    if (l_wallet) l_wallet.innerHTML = ticketsHtml || `<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">尚無機票或門票憑證</p>`;
    if (l_lodging_wallet) l_lodging_wallet.innerHTML = lodgingHtml || `<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">尚未填寫住宿資料</p>`;
    if (l_trip) l_trip.innerHTML = ticketsHtml || `<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">尚無憑證資料</p>`;
    if (l_lodging_trip) l_lodging_trip.innerHTML = lodgingHtml || `<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">尚未填寫住宿</p>`;
};

window.switchWalletTab = function(subtab) {
    document.getElementById('btnWalletTicket').classList.remove('active');
    document.getElementById('btnWalletHotel').classList.remove('active');
    document.getElementById('btnWalletDoc').classList.remove('active');
    document.getElementById('btnWalletCoupon').classList.remove('active');
    document.getElementById('btnWalletMemory').classList.remove('active');
    
    document.getElementById('walletTicketSection').style.display = 'none';
    document.getElementById('walletHotelSection').style.display = 'none';
    document.getElementById('walletDocSection').style.display = 'none';
    document.getElementById('walletCouponSection').style.display = 'none';
    document.getElementById('walletMemorySection').style.display = 'none';
    
    if (subtab === 'ticket') {
        document.getElementById('btnWalletTicket').classList.add('active');
        document.getElementById('walletTicketSection').style.display = 'block';
    } else if (subtab === 'hotel') {
        document.getElementById('btnWalletHotel').classList.add('active');
        document.getElementById('walletHotelSection').style.display = 'block';
        renderSmartNearby();
    } else if (subtab === 'doc') {
        document.getElementById('btnWalletDoc').classList.add('active');
        document.getElementById('walletDocSection').style.display = 'block';
    } else if (subtab === 'coupon') {
        document.getElementById('btnWalletCoupon').classList.add('active');
        document.getElementById('walletCouponSection').style.display = 'block';
    } else if (subtab === 'memory') {
        document.getElementById('btnWalletMemory').classList.add('active');
        document.getElementById('walletMemorySection').style.display = 'block';
        triggerContextUpdate();
    }
};
