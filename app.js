const STORAGE_KEY = 'my_diary_entries';
const PASSWORD_KEY = 'my_diary_password';
const STICKERS = ['⭐', '🌟', '✨', '💫', '🌈', '☀️', '🌤️', '🌸', '🌺', '🌻', '🌼', '🌷', '🍀', '🌿', '🍃', '🌱', '🌲', '🍎', '🍓', '🍒', '🍑', '🍌', '🥝', '🍇', '🧁', '🍰', '🎂', '🍪', '🍩', '🍫', '🍬', '🍭', '🎈', '🎉', '🎊', '🎁', '🎀', '🎗️', '🏆', '🥇', '🎖️', '🎯', '🎲', '🧩', '🎭', '🎨', '🎬', '🎤', '🎧', '📚', '📖', '✏️', '📝', '📌', '📍', '🔖', '💝', '💖', '💗', '💕', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤍', '💔'];

let diaries = [];
let currentView = 'list';
let currentDiaryId = null;
let currentEditId = null;
let currentFilterMood = 'all';
let currentCalendarDate = new Date();
let selectedMood = 'daily';
let selectedStickers = [];
let photoDataUrls = [];
let autoSaveTimer = null;
let passwordMode = 'set';
let isUnlocked = false;

function init() {
    loadDiaries();
    checkPassword();
}

function checkPassword() {
    const storedPassword = localStorage.getItem(PASSWORD_KEY);
    if (storedPassword) {
        showLockScreen();
    } else {
        showPasswordModal('set');
    }
}

function showLockScreen() {
    document.getElementById('lock-screen').style.display = 'flex';
    document.getElementById('app-container')?.classList.add('locked');
    document.getElementById('unlock-password').value = '';
    document.getElementById('unlock-error').textContent = '';
    isUnlocked = false;
}

function hideLockScreen() {
    document.getElementById('lock-screen').style.display = 'none';
    isUnlocked = true;
    initApp();
}

function showPasswordModal(mode) {
    passwordMode = mode;
    const modal = document.getElementById('password-modal');
    const title = document.getElementById('password-modal-title');
    const hint = document.getElementById('password-hint');
    const confirmInput = document.getElementById('password-confirm');
    const skipBtn = document.getElementById('password-skip-btn');
    const submitBtn = document.getElementById('password-submit-btn');
    
    document.getElementById('password-input').value = '';
    document.getElementById('password-confirm').value = '';
    document.getElementById('password-error').textContent = '';
    
    if (mode === 'set') {
        title.textContent = '设置密码';
        hint.textContent = '设置一个密码，保护你的小日记～';
        confirmInput.style.display = 'block';
        skipBtn.style.display = 'inline-flex';
        submitBtn.innerHTML = '<span>✓</span> 设置密码';
        modal.style.display = 'flex';
    } else if (mode === 'change') {
        title.textContent = '修改密码';
        hint.textContent = '请输入新密码～';
        confirmInput.style.display = 'block';
        skipBtn.style.display = 'none';
        submitBtn.innerHTML = '<span>✓</span> 修改密码';
        modal.style.display = 'flex';
    }
}

function hidePasswordModal() {
    document.getElementById('password-modal').style.display = 'none';
}

function handlePasswordSubmit() {
    const password = document.getElementById('password-input').value;
    const confirm = document.getElementById('password-confirm').value;
    const errorEl = document.getElementById('password-error');
    
    if (!password || password.length < 4) {
        errorEl.textContent = '密码至少4个字符哦～';
        return;
    }
    
    if (passwordMode !== 'change' && confirm && password !== confirm) {
        errorEl.textContent = '两次密码不一样，再试一次吧～';
        return;
    }
    
    if (passwordMode === 'set' && !confirm) {
        document.getElementById('password-confirm').style.display = 'block';
        document.getElementById('password-hint').textContent = '再输入一次确认密码～';
        return;
    }
    
    localStorage.setItem(PASSWORD_KEY, password);
    hidePasswordModal();
    showDiaryList();
    renderDiaryList();
}

function handlePasswordSkip() {
    hidePasswordModal();
    initApp();
}

function handleLockScreenSkip() {
    localStorage.removeItem(PASSWORD_KEY);
    hideLockScreen();
    showPasswordModal('set');
}

function handleUnlock() {
    const input = document.getElementById('unlock-password');
    const storedPassword = localStorage.getItem(PASSWORD_KEY);
    const errorEl = document.getElementById('unlock-error');
    
    if (input.value === storedPassword) {
        hideLockScreen();
        initApp();
    } else {
        errorEl.textContent = '密码不对哦，再想想～';
        input.value = '';
    }
}

function initApp() {
    renderStickerGrid();
    renderDiaryList();
    setupAutoSave();
    setupFilterButtons();
}

function loadDiaries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    diaries = stored ? JSON.parse(stored) : [];
}

function saveDiaries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function renderStickerGrid() {
    const grid = document.getElementById('sticker-grid');
    grid.innerHTML = STICKERS.map(s => 
        `<div class="sticker-item" onclick="addSticker('${s}')">${s}</div>`
    ).join('');
}

function renderDiaryList() {
    const listEl = document.getElementById('diary-list');
    const emptyEl = document.getElementById('empty-state');
    
    let filteredDiaries = diaries;
    if (currentFilterMood !== 'all') {
        filteredDiaries = diaries.filter(d => d.mood === currentFilterMood);
    }
    
    filteredDiaries = filteredDiaries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredDiaries.length === 0) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }
    
    emptyEl.style.display = 'none';
    listEl.innerHTML = filteredDiaries.map(diary => `
        <div class="diary-card mood-${diary.mood}" onclick="viewDiary('${diary.id}')">
            <div class="diary-card-header">
                <div class="diary-card-title">${escapeHtml(diary.title) || '无标题'}</div>
                <div class="diary-card-mood">${getMoodEmoji(diary.mood)}</div>
            </div>
            <div class="diary-card-date">${formatDate(diary.date)}</div>
            <div class="diary-card-preview">${escapeHtml(diary.content)}</div>
            <div class="diary-card-footer">
                ${diary.isPrivate ? '<span class="diary-card-private">🔒 私密</span>' : '<span></span>'}
                ${diary.photos && diary.photos.length > 0 ? `<span class="diary-card-photo">📷 ${diary.photos.length}张</span>` : '<span></span>'}
            </div>
        </div>
    `).join('');
}

function getMoodEmoji(mood) {
    const emojis = { happy: '😄', sad: '😢', fun: '🤪', daily: '📝' };
    return emojis[mood] || '📝';
}

function getMoodText(mood) {
    const texts = { happy: '开心', sad: '难过', fun: '有趣', daily: '日常' };
    return texts[mood] || '日常';
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('zh-CN', options);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    currentView = sectionId;
}

function showDiaryList() {
    showSection('diary-list-section');
    renderDiaryList();
}

function showWriteDiary() {
    resetWriteForm();
    showSection('write-section');
    document.getElementById('write-title').textContent = '✏️ 写日记';
    currentEditId = null;
}

function resetWriteForm() {
    document.getElementById('diary-title').value = '';
    document.getElementById('diary-content').value = '';
    document.getElementById('diary-private').checked = false;
    selectedMood = 'daily';
    selectedStickers = [];
    photoDataUrls = [];
    
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`.mood-btn[data-mood="${selectedMood}"]`).classList.add('selected');
    
    document.getElementById('photo-preview').innerHTML = '';
    document.getElementById('auto-save-status').classList.remove('saving');
    document.getElementById('auto-save-status').innerHTML = '<span>✓</span> 已自动保存';
}

function selectMood(mood) {
    selectedMood = mood;
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.mood === mood);
    });
}

function toggleStickerPanel() {
    const panel = document.getElementById('sticker-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function addSticker(sticker) {
    selectedStickers.push(sticker);
    showStickerConfirmation(sticker);
}

function showStickerConfirmation(sticker) {
    const btn = document.querySelector('.btn-sticker');
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = '', 200);
}

function handlePhotoUpload(e) {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(event) {
            photoDataUrls.push(event.target.result);
            renderPhotoPreview();
        };
        reader.readAsDataURL(file);
    });
    e.target.value = '';
}

function renderPhotoPreview() {
    const previewEl = document.getElementById('photo-preview');
    previewEl.innerHTML = photoDataUrls.map((url, index) => `
        <div class="photo-preview-item">
            <img src="${url}" alt="照片">
            <button class="remove-photo" onclick="removePhoto(${index})">×</button>
        </div>
    `).join('');
}

function removePhoto(index) {
    photoDataUrls.splice(index, 1);
    renderPhotoPreview();
}

function saveDiary() {
    const title = document.getElementById('diary-title').value.trim();
    const content = document.getElementById('diary-content').value.trim();
    const isPrivate = document.getElementById('diary-private').checked;
    
    if (!content) {
        alert('请写点内容吧～');
        return;
    }
    
    const diaryData = {
        id: currentEditId || generateId(),
        title,
        content,
        mood: selectedMood,
        date: currentEditId ? diaries.find(d => d.id === currentEditId)?.date : new Date().toISOString(),
        isPrivate,
        stickers: [...selectedStickers],
        photos: [...photoDataUrls],
        updatedAt: new Date().toISOString()
    };
    
    if (currentEditId) {
        const index = diaries.findIndex(d => d.id === currentEditId);
        if (index !== -1) {
            diaries[index] = diaryData;
        }
    } else {
        diaries.push(diaryData);
    }
    
    saveDiaries();
    showAutoSaveStatus();
    showDiaryList();
}

function viewDiary(id) {
    const diary = diaries.find(d => d.id === id);
    if (!diary) return;
    
    currentDiaryId = id;
    
    const contentEl = document.getElementById('view-content');
    contentEl.innerHTML = `
        <div class="view-header-content">
            <div class="view-title">${escapeHtml(diary.title) || '无标题'}</div>
            <div class="view-meta">
                <span class="view-date">${formatDate(diary.date)}</span>
                <span class="view-mood">${getMoodEmoji(diary.mood)} ${getMoodText(diary.mood)}</span>
                ${diary.isPrivate ? '<span class="view-private-badge">🔒 私密</span>' : ''}
            </div>
        </div>
        <div class="view-body">${escapeHtml(diary.content)}</div>
        ${diary.stickers && diary.stickers.length > 0 ? 
            `<div class="view-stickers">${diary.stickers.join(' ')}</div>` : ''}
        ${diary.photos && diary.photos.length > 0 ? 
            `<div class="view-photos">${diary.photos.map(p => `<img src="${p}" alt="日记照片">`).join('')}</div>` 
            : ''}
    `;
    
    showSection('view-section');
}

function editCurrentDiary() {
    const diary = diaries.find(d => d.id === currentDiaryId);
    if (!diary) return;
    
    currentEditId = diary.id;
    document.getElementById('diary-title').value = diary.title || '';
    document.getElementById('diary-content').value = diary.content;
    document.getElementById('diary-private').checked = diary.isPrivate || false;
    
    selectedMood = diary.mood || 'daily';
    selectedStickers = diary.stickers ? [...diary.stickers] : [];
    photoDataUrls = diary.photos ? [...diary.photos] : [];
    
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.mood === selectedMood);
    });
    
    renderPhotoPreview();
    
    document.getElementById('write-title').textContent = '✏️ 编辑日记';
    showSection('write-section');
}

function deleteCurrentDiary() {
    document.getElementById('modal-message').textContent = '确定要删除这篇日记吗？删除后无法恢复哦～';
    document.getElementById('modal-confirm-btn').onclick = confirmDeleteDiary;
    document.getElementById('confirm-modal').style.display = 'flex';
}

function confirmDeleteDiary() {
    diaries = diaries.filter(d => d.id !== currentDiaryId);
    saveDiaries();
    closeModal();
    showDiaryList();
}

function closeModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

function showCalendar() {
    currentCalendarDate = new Date();
    renderCalendar();
    showSection('calendar-section');
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    document.getElementById('current-month').textContent = `${year}年 ${month + 1}月`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const diaryMap = {};
    diaries.forEach(d => {
        const dDate = new Date(d.date);
        if (dDate.getFullYear() === year && dDate.getMonth() === month) {
            const key = dDate.getDate();
            if (!diaryMap[key] || new Date(d.updatedAt) > new Date(diaryMap[key].updatedAt || d.updatedAt)) {
                diaryMap[key] = d;
            }
        }
    });
    
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    
    let html = '';
    
    for (let i = 0; i < startDay; i++) {
        const prevDate = new Date(year, month, -startDay + i + 1);
        html += `<div class="calendar-day other-month">${prevDate.getDate()}</div>`;
    }
    
    for (let day = 1; day <= totalDays; day++) {
        const diary = diaryMap[day];
        const isToday = isCurrentMonth && day === today.getDate();
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (diary) classes += ' has-diary';
        
        const moodEmoji = diary ? getMoodEmoji(diary.mood) : '';
        html += `<div class="${classes}" ${diary ? `data-mood="${moodEmoji}" onclick="viewDiary('${diary.id}')"` : ''}>${day}</div>`;
    }
    
    const remaining = 42 - (startDay + totalDays);
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }
    
    document.getElementById('calendar-days').innerHTML = html;
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function showStats() {
    renderStats();
    showSection('stats-section');
}

function renderStats() {
    const total = diaries.length;
    
    let streak = 0;
    if (total > 0) {
        const sortedDates = diaries.map(d => new Date(d.date).toDateString()).sort((a, b) => new Date(b) - new Date(a));
        const uniqueDates = [...new Set(sortedDates)];
        
        let currentStreak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
            let checkDate = new Date(uniqueDates[0]);
            for (let i = 0; i < uniqueDates.length; i++) {
                const expected = new Date(checkDate).toDateString();
                if (uniqueDates[i] === expected) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
            streak = currentStreak;
        }
    }
    
    const moodCounts = { happy: 0, sad: 0, fun: 0, daily: 0 };
    let stickerCount = 0;
    
    diaries.forEach(d => {
        if (d.mood && moodCounts.hasOwnProperty(d.mood)) {
            moodCounts[d.mood]++;
        }
        if (d.stickers) {
            stickerCount += d.stickers.length;
        }
    });
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-streak').textContent = streak;
    document.getElementById('stat-happy').textContent = moodCounts.happy;
    document.getElementById('stat-stickers').textContent = stickerCount;
    
    const maxMood = Math.max(...Object.values(moodCounts), 1);
    
    const moodBarsEl = document.getElementById('mood-bars');
    moodBarsEl.innerHTML = ['happy', 'sad', 'fun', 'daily'].map(mood => {
        const count = moodCounts[mood];
        const percent = Math.round((count / maxMood) * 100);
        return `
            <div class="mood-bar-item">
                <span class="mood-bar-label">${getMoodEmoji(mood)}</span>
                <div class="mood-bar-track">
                    <div class="mood-bar-fill ${mood}" style="width: ${percent}%">${count}</div>
                </div>
            </div>
        `;
    }).join('');
}

function setupAutoSave() {
    const inputs = ['diary-title', 'diary-content'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(showAutoSaveStatus, 2000);
        });
    });
    
    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
}

function showAutoSaveStatus() {
    const statusEl = document.getElementById('auto-save-status');
    statusEl.classList.remove('saving');
    statusEl.innerHTML = '<span>✓</span> 已自动保存';
}

function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilterMood = btn.dataset.mood;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderDiaryList();
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
