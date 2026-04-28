// ==========================================
// 1. DATA MODELS & LOCAL STORAGE INIT
// ==========================================
const DB_USERS = 'nf_users_v6';
const DB_POSTS = 'nf_posts_v6';
const DB_LOGS = 'nf_logs_v6';
const DB_SESSION = 'nf_session_v6';
const DB_MESSAGES = 'nf_messages_v6';
const DB_SETTINGS = 'nf_settings_v6';

let users = JSON.parse(localStorage.getItem(DB_USERS)) || [];
let posts = JSON.parse(localStorage.getItem(DB_POSTS)) || [];
let logs = JSON.parse(localStorage.getItem(DB_LOGS)) || [];
let messages = JSON.parse(localStorage.getItem(DB_MESSAGES)) || [];
let currentUser = JSON.parse(localStorage.getItem(DB_SESSION)) || null;
let settings = JSON.parse(localStorage.getItem(DB_SETTINGS)) || {
    announcement: "Welcome to NexusFeed! Connect, share, and engage responsibly.",
    showAnnouncement: true
};

const MASTER_EMAIL = 'mikesame895@gmail.com';
const MASTER_PASS = 'Ayo1boy2';

function initDB() {
    const masterIndex = users.findIndex(u => u.email.toLowerCase() === MASTER_EMAIL.toLowerCase());
    if (masterIndex === -1) {
        users.push({
            id: 'master_admin_001', username: 'MikeAdmin', email: MASTER_EMAIL, password: MASTER_PASS,
            role: 'superadmin', status: 'active', joinedDate: new Date().toISOString(), bio: 'Platform Creator & Master Administrator.', color: '#ef4444'
        });
        saveData(DB_USERS, users);
        logAction('System', 'Master SuperAdmin account initialized.');
    } else {
        users[masterIndex].role = 'superadmin'; users[masterIndex].password = MASTER_PASS;
        saveData(DB_USERS, users);
    }
}

const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandomColor = () => ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'][Math.floor(Math.random() * 6)];
function logAction(actor, action) {
    logs.unshift({ id: generateId(), actor, action, timestamp: new Date().toISOString() });
    if (logs.length > 200) logs.pop(); saveData(DB_LOGS, logs);
}

// ==========================================
// 2. AI RATING ENGINE (Runs Silently)
// ==========================================
function generateAIRating(text) {
    const txt = text.toLowerCase();
    let scores = { informative: 0, engaging: 0, neutral: 10, toxic: 0, spam: 0 };
    
    if (txt.match(/(hate|stupid|idiot|dumb|ugly|shut up|kill)/)) scores.toxic += 50;
    if (txt.match(/(buy now|click here|free money|crypto|invest|% off)/)) scores.spam += 50;
    if (txt.length > 50 && txt === txt.toUpperCase()) scores.spam += 30; 
    if (txt.match(/(how to|guide|news|update|learn|did you know|fact|tutorial)/)) scores.informative += 40;
    if (txt.length > 150) scores.informative += 10;
    if (txt.match(/(\?|what do you think|thoughts|agree|poll)/)) scores.engaging += 40;

    let dominant = 'neutral';
    let max = -1;
    for (let key in scores) {
        if (scores[key] > max) { max = scores[key]; dominant = key; }
    }
    return { scores, dominant, isOverride: false };
}

// STRONGLY SECURED: Normal users never see this output.
function getAIBadgeHTML(ratingObj) {
    if(!ratingObj || currentUser.role === 'user') return ''; // 🔒 SECRET HIDDEN FROM REGULAR USERS
    const dom = ratingObj.dominant;
    const label = ratingObj.isOverride ? `ADMIN: ${dom.toUpperCase()}` : `AI: ${dom.toUpperCase()}`;
    return `<span class="ai-tag ${dom}">${label}</span>`;
}

// ==========================================
// 3. UTILITIES & DYNAMIC UI
// ==========================================
const escapeHTML = (str) => str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
function timeAgo(dateString) {
    const sec = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (sec < 60) return "Just now";
    if (sec < 3600) return Math.floor(sec/60) + "m ago";
    if (sec < 86400) return Math.floor(sec/3600) + "h ago";
    return Math.floor(sec/86400) + "d ago";
}
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast'); if(!t) return;
    t.textContent = msg; t.className = `toast show ${type}`;
    setTimeout(() => t.classList.remove('show'), 3000);
}
function generateAvatar(username, color, size = '40px', fontSize = '1rem') {
    const initial = username ? username.charAt(0).toUpperCase() : '?';
    return `<div class="avatar-gen" style="background:${color||'#333'}; width:${size}; height:${size}; font-size:${fontSize};">${initial}</div>`;
}

// ------------------------------------------
// DYNAMIC MODALS: Protects Secret Admin Code
// ------------------------------------------
function renderModalsFramework() {
    const c = document.getElementById('dynamicModals'); if(!c) return;
    
    // 1. Basic User Modals (Always injected)
    let modalsHTML = `
        <div id="confirmModal" class="modal-overlay hidden">
            <div class="modal glass">
                <h3 id="modalTitle">Confirm</h3><p id="modalMessage" class="text-muted"></p>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal('confirmModal')">Cancel</button>
                    <button class="btn btn-danger" id="modalConfirmBtn">Confirm</button>
                </div>
            </div>
        </div>
        <div id="editBioModal" class="modal-overlay hidden">
            <div class="modal glass">
                <h3>Edit Profile</h3>
                <div class="form-group mt-1">
                    <label>Tell us about yourself</label>
                    <textarea id="editBioInput" rows="3" maxlength="150"></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal('editBioModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="saveBioEdit()">Save</button>
                </div>
            </div>
        </div>
        <div id="reshareModal" class="modal-overlay hidden">
            <div class="modal glass">
                <h3>Reshare Post via DM</h3>
                <input type="hidden" id="reshareTargetId">
                <div class="form-group mt-1">
                    <label>Select User to Send To</label>
                    <select id="reshareUserSelect"></select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeModal('reshareModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="submitReshare()">Send via Chat</button>
                </div>
            </div>
        </div>
        <div id="chatDrawer" class="chat-drawer">
            <div class="chat-header">
                <h3 style="font-size:1.1rem;">Direct Messages</h3>
                <button class="btn btn-sm btn-outline" onclick="document.getElementById('chatDrawer').classList.remove('open')">✕</button>
            </div>
            <div class="chat-layout">
                <div class="chat-user-list" style="display:flex; flex-direction:column; width:120px; border-right:1px solid var(--glass-border);">
                    <input type="text" id="chatSearchBox" placeholder="Search..." style="padding:0.5rem; border:none; border-bottom:1px solid var(--glass-border); background:rgba(0,0,0,0.3); color:white; font-size:0.8rem;" class="${currentUser.role === 'user' ? 'hidden' : ''}">
                    <div id="chatUserList" style="flex:1; overflow-y:auto;"></div>
                </div>
                <div class="chat-active-area">
                    <div class="chat-messages" id="chatMessagesBox"><p class="text-muted text-center mt-2">Select a user to chat</p></div>
                    <form class="chat-input-area hidden" id="chatForm">
                        <input type="text" id="chatInput" placeholder="Type a message..." required autocomplete="off">
                        <button type="submit" class="btn btn-primary">Send</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    // 2. 🔒 ADMIN ONLY MODALS (Secret code hidden from DOM for standard users)
    if (currentUser.role !== 'user') {
        modalsHTML += `
            <div id="adminEditModal" class="modal-overlay hidden">
                <div class="modal glass" style="max-width:600px;">
                    <h3>Moderator Edit Panel</h3>
                    <input type="hidden" id="adminEditPostId">
                    <div class="form-group mt-1">
                        <label>Edit Post Content</label>
                        <textarea id="adminEditContent" rows="4"></textarea>
                    </div>
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1">
                            <label>Force Likes Count</label>
                            <input type="number" id="adminEditLikes" min="0">
                        </div>
                        <div class="form-group" style="flex:1">
                            <label>Override AI Behavior</label>
                            <select id="adminEditAI">
                                <option value="informative">Informative</option>
                                <option value="engaging">Engaging</option>
                                <option value="neutral">Neutral</option>
                                <option value="toxic">Toxic</option>
                                <option value="spam">Spam</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="closeModal('adminEditModal')">Cancel</button>
                        <button class="btn btn-warning" onclick="adminSaveEdit()">Force Update</button>
                    </div>
                </div>
            </div>
            <div id="adminEditCommentModal" class="modal-overlay hidden">
                <div class="modal glass">
                    <h3>Edit Comment</h3>
                    <input type="hidden" id="adminEditCommentPostId">
                    <input type="hidden" id="adminEditCommentId">
                    <div class="form-group mt-1">
                        <label>Comment Text</label>
                        <textarea id="adminEditCommentText" rows="2"></textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="closeModal('adminEditCommentModal')">Cancel</button>
                        <button class="btn btn-warning" onclick="adminSaveCommentEdit()">Save Comment</button>
                    </div>
                </div>
            </div>
        `;
    }

    c.innerHTML = modalsHTML;
}

window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
function customConfirm(title, message, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModal').classList.remove('hidden');
    document.getElementById('modalConfirmBtn').onclick = () => { closeModal('confirmModal'); onConfirm(); };
}

// ==========================================
// 4. ROUTER & AUTHENTICATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initDB();
    const page = document.body.dataset.page;
    if (page === 'auth') {
        if (currentUser) { window.location.href = currentUser.role === 'superadmin' ? 'admin.html' : 'app.html'; return; }
        initAuthPage();
    } else {
        if (!currentUser) { window.location.href = 'index.html'; return; }
        const freshUser = users.find(u => u.id === currentUser.id);
        if (!freshUser || freshUser.status === 'suspended') { handleLogout(); return; }
        currentUser = freshUser; 
        if (page === 'admin' && currentUser.role === 'user') { window.location.href = 'app.html'; return; }

        renderModalsFramework();
        setupSharedUI();
        initChatSystem();

        if (page === 'app') initAppPage();
        if (page === 'profile') initProfilePage();
        if (page === 'admin') initAdminPage();
    }
});

function handleLogout() { 
    currentUser = null; 
    saveData(DB_SESSION, null); 
    window.location.href = 'index.html'; 
}

function setupSharedUI() {
    // 1. Setup Announcements
    const bar = document.getElementById('globalAnnouncementBar');
    const txt = document.getElementById('announcementText');
    if (bar && settings.showAnnouncement && settings.announcement) {
        bar.classList.remove('hidden'); txt.textContent = settings.announcement;
    }

    // 2. Sidebar Profile
    const sbProfile = document.getElementById('sidebarProfile');
    if (sbProfile) {
        sbProfile.innerHTML = `${generateAvatar(currentUser.username, currentUser.color)}<div style="line-height:1.2;"><strong>${escapeHTML(currentUser.username)}</strong><br><span class="text-sm text-muted">@${escapeHTML(currentUser.username).toLowerCase()}</span></div>`;
    }
    
    // 3. SECURE Admin Injections
    if (currentUser.role !== 'user') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.classList.remove('hidden');

        const adminSidebarWidgets = document.getElementById('adminSidebarWidgets');
        if (adminSidebarWidgets) {
            adminSidebarWidgets.innerHTML = `
                <div class="widget glass mt-2">
                    <h3>Admin Monitor</h3>
                    <p class="text-sm text-muted mb-1">AI categorization visible to staff only.</p>
                    <div class="ai-legend">
                        <div><span class="ai-dot informative"></span> Informative</div>
                        <div><span class="ai-dot engaging"></span> Engaging</div>
                        <div><span class="ai-dot neutral"></span> Neutral</div>
                        <div><span class="ai-dot toxic"></span> Toxic (Flagged)</div>
                        <div><span class="ai-dot spam"></span> Spam (Flagged)</div>
                    </div>
                </div>
            `;
        }
    }
    
    // 4. Update dynamic links
    const myProfileNav = document.getElementById('myProfileNav');
    if(myProfileNav) myProfileNav.href = `profile.html?user=${currentUser.id}`;

    // 5. Global Handlers
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
}

// ==========================================
// 5. CHAT SYSTEM (DMs)
// ==========================================
let activeChatUserId = null;
function initChatSystem() {
    document.querySelectorAll('#openChatBtn').forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('chatDrawer').classList.add('open');
        renderChatUserList();
    }));

    document.getElementById('chatForm').addEventListener('submit', e => {
        e.preventDefault();
        const inp = document.getElementById('chatInput'); const text = inp.value.trim();
        if(!text || !activeChatUserId) return;

        messages.push({ id: generateId(), from: currentUser.id, to: activeChatUserId, content: text, timestamp: new Date().toISOString() });
        saveData(DB_MESSAGES, messages);
        inp.value = ''; renderChatMessages();
    });

    const searchBox = document.getElementById('chatSearchBox');
    if(searchBox) {
        searchBox.addEventListener('input', (e) => renderChatUserList(e.target.value.toLowerCase()));
    }

    const badge = document.getElementById('msgBadge');
    if(badge) {
        const hasRecent = messages.some(m => m.to === currentUser.id && (new Date() - new Date(m.timestamp)) < 86400000);
        if(hasRecent) badge.classList.remove('hidden');
    }
}

function renderChatUserList(filter = '') {
    const list = document.getElementById('chatUserList');
    let chatableUsers = users.filter(u => u.id !== currentUser.id);
    
    // If standard user, restrict who they can see
    if(currentUser.role === 'user') {
        chatableUsers = chatableUsers.filter(u => u.role !== 'user' || messages.some(m => (m.from === u.id && m.to === currentUser.id) || (m.to === u.id && m.from === currentUser.id)));
    }

    // Apply Admin Search filter
    if(filter) {
        chatableUsers = chatableUsers.filter(u => u.username.toLowerCase().includes(filter));
    }
    
    list.innerHTML = chatableUsers.map(u => `
        <div class="chat-user ${activeChatUserId===u.id?'active':''}" onclick="openChatWith('${u.id}')" style="padding:0.8rem 0.5rem; text-align:center; cursor:pointer; border-bottom:1px solid var(--glass-border); transition:background 0.2s;">
            ${generateAvatar(u.username, u.color, '35px', '1rem')}
            <div style="margin-top:6px; font-weight:600; font-size:0.8rem; word-break:break-all;">${escapeHTML(u.username)}</div>
        </div>
    `).join('');
}

window.openChatWith = function(userId) {
    activeChatUserId = userId; 
    renderChatUserList(document.getElementById('chatSearchBox').value.toLowerCase());
    document.getElementById('chatForm').classList.remove('hidden');
    renderChatMessages();
};

function renderChatMessages() {
    const box = document.getElementById('chatMessagesBox');
    if(!activeChatUserId) return;
    
    const convo = messages.filter(m => (m.from === currentUser.id && m.to === activeChatUserId) || (m.to === currentUser.id && m.from === activeChatUserId));
    
    if(convo.length === 0) { box.innerHTML = `<p class="text-muted text-center mt-2">Start the conversation</p>`; return; }

    box.innerHTML = convo.map(m => {
        const isMe = m.from === currentUser.id;
        let displayContent = escapeHTML(m.content);
        if(displayContent.startsWith('[RESHARE_POST:')) {
            const pid = displayContent.split(']')[0].split(':')[1];
            const p = posts.find(x => x.id === pid);
            if(p) displayContent = `Shared a post:<div class="reshared-post"><strong>@${escapeHTML(p.authorName)}:</strong> ${escapeHTML(p.content.substring(0,60))}...</div>`;
            else displayContent = `<span class="text-muted">[Post deleted]</span>`;
        }
        return `<div class="msg-bubble ${isMe ? 'msg-sent' : 'msg-recv'}">${displayContent}</div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

// ==========================================
// 6. MAIN FEED / APP PAGE
// ==========================================
function initAppPage() {
    document.getElementById('createPostAvatar').innerHTML = generateAvatar(currentUser.username, currentUser.color);
    const contentInput = document.getElementById('postContent');
    contentInput.addEventListener('input', () => document.getElementById('charCount').textContent = `${contentInput.value.length}/800`);

    document.getElementById('postForm').addEventListener('submit', e => {
        e.preventDefault();
        const content = contentInput.value.trim(); if (!content) return;
        const aiData = generateAIRating(content);
        const newPost = {
            id: generateId(), userId: currentUser.id, authorName: currentUser.username, authorColor: currentUser.color,
            content, timestamp: new Date().toISOString(), likes: [], comments: [], aiRating: aiData
        };

        posts.unshift(newPost); saveData(DB_POSTS, posts);
        logAction(currentUser.username, 'Created a post');
        contentInput.value = ''; document.getElementById('charCount').textContent = '0/800';
        showToast('Posted successfully!', 'success');
        renderFeed(posts);
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderFeed(posts.filter(p => p.content.toLowerCase().includes(term) || p.authorName.toLowerCase().includes(term)));
    });

    renderFeed(posts);
}

// ==========================================
// 7. PROFILE PAGE LOGIC
// ==========================================
let profileUserId = null;
function initProfilePage() {
    const params = new URLSearchParams(window.location.search);
    profileUserId = params.get('user') || currentUser.id;
    
    const profileUser = users.find(u => u.id === profileUserId);
    if(!profileUser) { document.querySelector('.main-content').innerHTML = '<h3 class="text-center mt-2">User not found.</h3>'; return; }

    const isMe = profileUserId === currentUser.id;
    document.getElementById('profileAvatar').innerHTML = generateAvatar(profileUser.username, profileUser.color, '100px', '2.5rem');
    document.getElementById('profileUsername').textContent = profileUser.username;
    document.getElementById('profileEmail').textContent = isMe ? profileUser.email : 'Contact via DM';
    document.getElementById('profileBio').textContent = profileUser.bio || 'No bio provided.';
    document.getElementById('profileRole').textContent = profileUser.role.toUpperCase();
    document.getElementById('profileRole').className = `badge ${profileUser.role}`;
    document.getElementById('profileJoined').textContent = `Joined ${new Date(profileUser.joinedDate).toLocaleDateString()}`;

    const userPosts = posts.filter(p => p.userId === profileUser.id);
    document.getElementById('postCount').textContent = userPosts.length;
    let likesCount = 0; userPosts.forEach(p => likesCount += p.likes.length);
    document.getElementById('totalLikesRecv').textContent = likesCount;

    const actionDiv = document.getElementById('profileActionBtns');
    if(isMe) {
        actionDiv.innerHTML = `<button class="btn btn-outline btn-sm" onclick="openBioEditModal()">Edit Bio</button>`;
    } else {
        actionDiv.innerHTML = `<button class="btn btn-primary btn-sm" onclick="document.getElementById('chatDrawer').classList.add('open'); openChatWith('${profileUser.id}')">Message User</button>`;
        document.getElementById('feedOwnerTitle').textContent = `${profileUser.username}'s Activity`;
    }
    renderFeed(userPosts, 'userPostsContainer');
}

window.openBioEditModal = function() {
    document.getElementById('editBioInput').value = currentUser.bio || "";
    document.getElementById('editBioModal').classList.remove('hidden');
};
window.saveBioEdit = function() {
    const newBio = document.getElementById('editBioInput').value.trim();
    currentUser.bio = newBio.substring(0, 150); saveData(DB_SESSION, currentUser);
    const idx = users.findIndex(u=>u.id===currentUser.id);
    if(idx>-1) { users[idx].bio = currentUser.bio; saveData(DB_USERS, users); }
    document.getElementById('profileBio').textContent = currentUser.bio;
    closeModal('editBioModal'); showToast('Bio updated');
    
    // Also update if viewing admin profile
    if(document.body.dataset.page === 'admin') renderAdminProfile();
};

// ==========================================
// 8. FEED RENDERER & ACTIONS (Optimized DOM updates)
// ==========================================
function renderFeed(feedData, containerId = 'feedContainer') {
    const container = document.getElementById(containerId); if (!container) return;
    if (feedData.length === 0) { container.innerHTML = `<div class="glass text-center" style="padding: 3rem; color: var(--text-muted);">No posts found.</div>`; return; }

    container.innerHTML = feedData.map(post => {
        const isLiked = post.likes.includes(currentUser.id);
        const canDelete = currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.id === post.userId;
        
        return `
        <article class="post-card glass fade-in" id="post-card-${post.id}">
            <div class="post-header">
                <div class="post-author-info">
                    ${generateAvatar(post.authorName, post.authorColor)}
                    <div>
                        <a href="profile.html?user=${post.userId}" class="post-author-name">${escapeHTML(post.authorName)}</a>
                        <div class="post-time">${timeAgo(post.timestamp)}</div>
                    </div>
                </div>
                ${getAIBadgeHTML(post.aiRating)}
            </div>
            <div class="post-content">${escapeHTML(post.content)}</div>
            <div class="post-footer">
                <button class="action-btn ${isLiked ? 'liked' : ''}" id="like-btn-${post.id}" onclick="toggleLike('${post.id}')">
                    <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span> <span class="like-count">${post.likes.length}</span>
                </button>
                <button class="action-btn" onclick="toggleComments('${post.id}')">
                    💬 <span id="com-count-${post.id}">${post.comments ? post.comments.length : 0}</span>
                </button>
                <button class="action-btn" onclick="openReshareModal('${post.id}')">🔄 Reshare</button>
                ${canDelete ? `<button class="action-btn delete" onclick="handleDeletePost('${post.id}')">🗑️</button>` : ''}
            </div>
            <div class="comments-section" id="comments-${post.id}">
                <div id="clist-${post.id}">${renderCommentsHTML(post.comments || [])}</div>
                <form class="add-comment-form" onsubmit="handleAddComment(event, '${post.id}')">
                    <input type="text" placeholder="Write a comment..." required maxlength="200" id="cinput-${post.id}">
                    <button type="submit" class="btn btn-primary btn-sm">Reply</button>
                </form>
            </div>
        </article>`;
    }).join('');
}

function renderCommentsHTML(comments) {
    if (!comments.length) return `<p class="text-muted text-sm">No comments yet.</p>`;
    return comments.map(c => `
        <div class="comment fade-in">
            ${generateAvatar(c.author, c.color, '24px', '0.7rem')}
            <div class="comment-content">
                <div class="comment-author"><a href="profile.html?user=${c.userId}" style="color:inherit;text-decoration:none;">${escapeHTML(c.author)}</a> <span class="text-muted text-sm" style="font-weight:normal;">${timeAgo(c.time)}</span></div>
                <div>${escapeHTML(c.text)}</div>
            </div>
        </div>`).join('');
}

window.toggleLike = function(postId) {
    const post = posts.find(p => p.id === postId); if (!post) return;
    const idx = post.likes.indexOf(currentUser.id);
    const btn = document.getElementById(`like-btn-${postId}`);
    
    if (idx > -1) {
        post.likes.splice(idx, 1);
        if(btn) { btn.classList.remove('liked'); btn.querySelector('.like-icon').textContent = '🤍'; }
    } else {
        post.likes.push(currentUser.id);
        if(btn) { btn.classList.add('liked'); btn.querySelector('.like-icon').textContent = '❤️'; }
    }
    if(btn) btn.querySelector('.like-count').textContent = post.likes.length;
    saveData(DB_POSTS, posts);
};

window.toggleComments = (postId) => document.getElementById(`comments-${postId}`)?.classList.toggle('show');

window.handleAddComment = function(e, postId) {
    e.preventDefault(); const inp = document.getElementById(`cinput-${postId}`); const txt = inp.value.trim();
    if (!txt) return;
    const post = posts.find(p => p.id === postId); if (!post) return;
    if (!post.comments) post.comments = [];
    post.comments.push({ id: generateId(), userId: currentUser.id, author: currentUser.username, color: currentUser.color, text: txt, time: new Date().toISOString() });
    
    saveData(DB_POSTS, posts); logAction(currentUser.username, `Commented on post by ${post.authorName}`);
    
    // Direct DOM Update to prevent layout jumping
    inp.value = '';
    document.getElementById(`clist-${postId}`).innerHTML = renderCommentsHTML(post.comments);
    document.getElementById(`com-count-${postId}`).textContent = post.comments.length;
};

window.handleDeletePost = function(postId) {
    customConfirm('Delete Post', 'Permamently delete this post?', () => {
        posts = posts.filter(p => p.id !== postId); saveData(DB_POSTS, posts); showToast('Deleted', 'success');
        const card = document.getElementById(`post-card-${postId}`);
        if(card) card.remove();
    });
};

window.openReshareModal = function(postId) {
    document.getElementById('reshareTargetId').value = postId;
    const select = document.getElementById('reshareUserSelect');
    
    // Show users you can chat with
    let chatableUsers = users.filter(u => u.id !== currentUser.id);
    if(currentUser.role === 'user') {
        chatableUsers = chatableUsers.filter(u => u.role !== 'user' || messages.some(m => (m.from === u.id && m.to === currentUser.id) || (m.to === u.id && m.from === currentUser.id)));
    }

    select.innerHTML = chatableUsers.map(u=>`<option value="${u.id}">${escapeHTML(u.username)}</option>`).join('');
    document.getElementById('reshareModal').classList.remove('hidden');
};
window.submitReshare = function() {
    const postId = document.getElementById('reshareTargetId').value;
    const toId = document.getElementById('reshareUserSelect').value;
    if(!postId || !toId) return;
    messages.push({ id: generateId(), from: currentUser.id, to: toId, content: `[RESHARE_POST:${postId}]`, timestamp: new Date().toISOString() });
    saveData(DB_MESSAGES, messages);
    closeModal('reshareModal'); showToast('Post shared to DM!', 'success');
};

// ==========================================
// 9. ADMIN DASHBOARD & CONFIGURATION
// ==========================================
function initAdminPage() {
    updateAdminStats();
    const tabs = document.querySelectorAll('.tab');
    const searchBox = document.getElementById('userFilters');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', e => {
            tabs.forEach(t => t.classList.remove('active')); e.target.classList.add('active');
            const target = e.target.getAttribute('data-target');
            searchBox.classList.toggle('hidden', target !== 'users');
            if (target === 'users') renderAdminUsers();
            if (target === 'posts') renderAdminPosts();
            if (target === 'profile') renderAdminProfile();
            if (target === 'settings') renderAdminSettings();
            if (target === 'logs') renderAdminLogs();
        });
    });

    document.getElementById('userSearchBox').addEventListener('input', e => renderAdminUsers(e.target.value.toLowerCase()));

    document.getElementById('resetAllBtn').addEventListener('click', () => {
        if (currentUser.role !== 'superadmin') { showToast('SuperAdmin access required.', 'error'); return; }
        customConfirm('FACTORY RESET', 'CRITICAL WARNING: This will wipe ALL data. Proceed?', () => {
            localStorage.clear(); users = []; posts = []; logs = []; messages = [];
            initDB(); handleLogout();
        });
    });

    renderAdminUsers();
}

function updateAdminStats() {
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalPosts').textContent = posts.length;
    let flagCount = 0; posts.forEach(p => { if(p.aiRating?.dominant === 'toxic' || p.aiRating?.dominant === 'spam') flagCount++; });
    document.getElementById('totalAiFlags').textContent = flagCount;
    document.getElementById('totalAdmins').textContent = users.filter(u => u.role !== 'user').length;
}

function renderAdminUsers(filterTerm = '') {
    const container = document.getElementById('adminContent');
    const fUsers = filterTerm ? users.filter(u => u.username.toLowerCase().includes(filterTerm) || u.email.toLowerCase().includes(filterTerm)) : users;
    let html = `<table class="admin-table fade-in"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
    fUsers.forEach(u => {
        const isMaster = u.email.toLowerCase() === MASTER_EMAIL.toLowerCase(); 
        const canEdit = currentUser.role === 'superadmin' && u.id !== currentUser.id && !isMaster;
        html += `<tr>
            <td><div style="display:flex; gap:0.5rem; align-items:center;">${generateAvatar(u.username, u.color, '30px', '0.8rem')}<div><strong>${escapeHTML(u.username)}</strong><br><span class="text-muted text-sm">${escapeHTML(u.email)}</span></div></div></td>
            <td>${canEdit ? `<select onchange="adminChangeRole('${u.id}', this.value)" style="padding:2px;font-size:0.8rem;background:var(--input-bg);color:white;border:1px solid var(--glass-border);">
                <option value="user" ${u.role==='user'?'selected':''}>User</option>
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                <option value="superadmin" ${u.role==='superadmin'?'selected':''}>SuperAdmin</option>
            </select>` : `<span class="badge ${u.role}">${u.role}</span>`}</td>
            <td><span class="badge ${u.status}">${u.status}</span></td>
            <td>${canEdit ? `<button class="btn btn-sm ${u.status==='active'?'btn-danger':'btn-outline'}" onclick="adminToggleStatus('${u.id}')">${u.status==='active'?'Suspend':'Activate'}</button>` : '<span class="text-muted text-sm">Protected</span>'}</td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

function renderAdminPosts() {
    const container = document.getElementById('adminContent');
    let html = `<table class="admin-table fade-in"><thead><tr><th>Post & Comments</th><th>AI Status</th><th>Stats</th><th>Actions</th></tr></thead><tbody>`;
    posts.forEach(p => {
        const commentsHTML = (p.comments||[]).map(c => `
            <div class="admin-comment-row">
                <span style="flex:1"><strong>${escapeHTML(c.author)}:</strong> ${escapeHTML(c.text)}</span>
                <div style="display:flex;gap:4px;">
                    <button class="btn btn-sm btn-outline" style="padding:0.2rem 0.4rem;font-size:0.7rem;" onclick="openAdminEditComment('${p.id}', '${c.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" style="padding:0.2rem 0.4rem;font-size:0.7rem;" onclick="adminDeleteComment('${p.id}', '${c.id}')">Del</button>
                </div>
            </div>`).join('');
        html += `<tr>
            <td style="max-width:350px;">
                <strong>${escapeHTML(p.authorName)}</strong>: <span class="text-muted">${escapeHTML(p.content.substring(0,80))}...</span>
                <div class="mt-1">${commentsHTML}</div>
            </td>
            <td>${getAIBadgeHTML(p.aiRating)}</td>
            <td class="text-sm">Likes: ${p.likes.length}<br>Comms: ${p.comments?.length||0}</td>
            <td style="min-width:100px;">
                <button class="btn btn-sm btn-warning mb-1 btn-block" onclick="openAdminEditPost('${p.id}')">Edit Post</button>
                <button class="btn btn-sm btn-danger btn-block" onclick="adminDeletePostFromTable('${p.id}')">Delete</button>
            </td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

// Admin Profile Editor Feature
window.renderAdminProfile = function() {
    const container = document.getElementById('adminContent');
    container.innerHTML = `
        <div class="glass fade-in" style="padding: 2rem; max-width: 600px;">
            <div style="display:flex; gap: 1.5rem; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
                ${generateAvatar(currentUser.username, currentUser.color, '80px', '2rem')}
                <div>
                    <h2>${escapeHTML(currentUser.username)}</h2>
                    <p class="text-muted">${escapeHTML(currentUser.email)}</p>
                    <span class="badge ${currentUser.role} mt-1">${currentUser.role.toUpperCase()}</span>
                </div>
            </div>
            <div class="form-group">
                <label>Admin Bio / Signature</label>
                <textarea id="adminBioEditor" rows="4" placeholder="Enter your public bio...">${escapeHTML(currentUser.bio || '')}</textarea>
            </div>
            <button class="btn btn-primary" onclick="adminSaveProfile()">Save Profile</button>
        </div>
    `;
};
window.adminSaveProfile = function() {
    const newBio = document.getElementById('adminBioEditor').value.trim();
    currentUser.bio = newBio.substring(0, 150); saveData(DB_SESSION, currentUser);
    const idx = users.findIndex(u=>u.id===currentUser.id);
    if(idx>-1) { users[idx].bio = currentUser.bio; saveData(DB_USERS, users); }
    showToast('Admin Profile Updated', 'success');
};

// SECURE Admin Modals execution
window.openAdminEditPost = function(id) {
    if(currentUser.role === 'user') return;
    const p = posts.find(x=>x.id===id); if(!p) return;
    document.getElementById('adminEditPostId').value = p.id;
    document.getElementById('adminEditContent').value = p.content;
    document.getElementById('adminEditLikes').value = p.likes.length;
    document.getElementById('adminEditAI').value = p.aiRating?.dominant || 'neutral';
    document.getElementById('adminEditModal').classList.remove('hidden');
};
window.adminSaveEdit = function() {
    if(currentUser.role === 'user') return;
    const id = document.getElementById('adminEditPostId').value;
    const p = posts.find(x=>x.id===id); if(!p) return;
    
    p.content = document.getElementById('adminEditContent').value;
    const newLikes = parseInt(document.getElementById('adminEditLikes').value) || 0;
    if(newLikes > p.likes.length) { for(let i=p.likes.length; i<newLikes; i++) p.likes.push('sys_generated'); }
    else if(newLikes < p.likes.length) { p.likes = p.likes.slice(0, newLikes); }
    
    p.aiRating.dominant = document.getElementById('adminEditAI').value; p.aiRating.isOverride = true;
    saveData(DB_POSTS, posts); closeModal('adminEditModal');
    logAction(currentUser.username, `Force-edited post ${id}`); showToast('Post Edited', 'success'); renderAdminPosts();
};

window.openAdminEditComment = function(postId, commentId) {
    if(currentUser.role === 'user') return;
    const p = posts.find(x=>x.id===postId); if(!p) return;
    const c = p.comments.find(x=>x.id===commentId); if(!c) return;
    document.getElementById('adminEditCommentPostId').value = postId;
    document.getElementById('adminEditCommentId').value = commentId;
    document.getElementById('adminEditCommentText').value = c.text;
    document.getElementById('adminEditCommentModal').classList.remove('hidden');
};
window.adminSaveCommentEdit = function() {
    if(currentUser.role === 'user') return;
    const pid = document.getElementById('adminEditCommentPostId').value;
    const cid = document.getElementById('adminEditCommentId').value;
    const p = posts.find(x=>x.id===pid); if(!p) return;
    const c = p.comments.find(x=>x.id===cid); if(!c) return;
    c.text = document.getElementById('adminEditCommentText').value.trim();
    saveData(DB_POSTS, posts); closeModal('adminEditCommentModal'); showToast('Comment Updated'); renderAdminPosts();
};
window.adminDeleteComment = function(postId, commentId) {
    if(currentUser.role === 'user') return;
    customConfirm('Delete Comment', 'Remove this comment?', () => {
        const p = posts.find(x=>x.id===postId); if(!p) return;
        p.comments = p.comments.filter(c=>c.id!==commentId); saveData(DB_POSTS, posts); renderAdminPosts();
    });
};

function renderAdminSettings() {
    document.getElementById('adminContent').innerHTML = `
        <div class="glass fade-in" style="padding:2rem; max-width:600px;">
            <h3>System Configurations</h3>
            <div class="form-group mt-1">
                <label>Global Announcement Marquee</label>
                <input type="text" id="sysAnnounceText" value="${escapeHTML(settings.announcement)}">
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="sysAnnounceToggle" ${settings.showAnnouncement?'checked':''}> Show Announcement Bar</label>
            </div>
            <button class="btn btn-primary" onclick="saveAdminSettings()">Save Settings</button>
        </div>`;
}
window.saveAdminSettings = function() {
    if(currentUser.role === 'user') return;
    settings.announcement = document.getElementById('sysAnnounceText').value;
    settings.showAnnouncement = document.getElementById('sysAnnounceToggle').checked;
    saveData(DB_SETTINGS, settings); showToast('Settings Saved', 'success'); logAction(currentUser.username, 'Updated System Settings');
    setTimeout(() => window.location.reload(), 800);
};

function renderAdminLogs() {
    let html = `<table class="admin-table fade-in"><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th></tr></thead><tbody>`;
    logs.forEach(l => html += `<tr><td class="text-muted text-sm">${new Date(l.timestamp).toLocaleString()}</td><td><strong>${escapeHTML(l.actor)}</strong></td><td>${escapeHTML(l.action)}</td></tr>`);
    document.getElementById('adminContent').innerHTML = html + `</tbody></table>`;
}

// Global Admin Action Handlers
window.adminChangeRole = function(userId, newRole) {
    if(currentUser.role !== 'superadmin') return;
    const user = users.find(u => u.id === userId); if (!user || user.email.toLowerCase() === MASTER_EMAIL.toLowerCase()) return;
    user.role = newRole; saveData(DB_USERS, users); logAction(currentUser.username, `Changed role of ${user.username} to ${newRole}`);
    showToast('Role updated', 'success'); updateAdminStats();
};
window.adminToggleStatus = function(userId) {
    if(currentUser.role === 'user') return;
    const user = users.find(u => u.id === userId); if (!user || user.email.toLowerCase() === MASTER_EMAIL.toLowerCase()) return;
    customConfirm('Toggle Status', `Change status for ${user.username}?`, () => {
        user.status = user.status === 'active' ? 'suspended' : 'active'; saveData(DB_USERS, users);
        logAction(currentUser.username, `${user.status === 'suspended' ? 'Suspended' : 'Activated'} user ${user.username}`);
        showToast('User status updated', 'success'); renderAdminUsers(document.getElementById('userSearchBox').value.toLowerCase());
    });
};
window.adminDeletePostFromTable = function(postId) {
    if(currentUser.role === 'user') return;
    customConfirm('Delete Content', 'Delete this post globally?', () => {
        posts = posts.filter(p => p.id !== postId); saveData(DB_POSTS, posts);
        logAction(currentUser.username, `Deleted a post`); showToast('Post removed', 'success'); updateAdminStats(); renderAdminPosts();
    });
};

// ==========================================
// 10. AUTH HANDLERS (index.html)
// ==========================================
function initAuthPage() {
    const loginSec = document.getElementById('loginSection');
    const regSec = document.getElementById('registerSection');
    
    document.getElementById('showRegister').addEventListener('click', e => { e.preventDefault(); loginSec.classList.add('hidden'); regSec.classList.remove('hidden'); });
    document.getElementById('showLogin').addEventListener('click', e => { e.preventDefault(); regSec.classList.add('hidden'); loginSec.classList.remove('hidden'); });

    document.getElementById('loginForm').addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const pass = document.getElementById('loginPassword').value;
        const user = users.find(u => u.email.toLowerCase() === email && u.password === pass);
        
        if (!user) { showToast('Invalid credentials', 'error'); return; }
        if (user.status === 'suspended') { showToast('Account suspended.', 'error'); return; }

        currentUser = user; saveData(DB_SESSION, currentUser);
        logAction(user.username, 'Logged in');
        window.location.href = (user.email.toLowerCase() === MASTER_EMAIL.toLowerCase() || user.role === 'superadmin') ? 'admin.html' : 'app.html';
    });

    document.getElementById('registerForm').addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const password = document.getElementById('regPassword').value;

        if (users.some(u => u.email.toLowerCase() === email)) { showToast('Email in use', 'error'); return; }
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) { showToast('Username taken', 'error'); return; }

        const newUser = { id: generateId(), username, email, password, role: 'user', status: 'active', joinedDate: new Date().toISOString(), bio: '', color: getRandomColor() };
        users.push(newUser); saveData(DB_USERS, users);
        currentUser = newUser; saveData(DB_SESSION, currentUser);
        logAction(newUser.username, 'Created account'); window.location.href = 'app.html';
    });
}