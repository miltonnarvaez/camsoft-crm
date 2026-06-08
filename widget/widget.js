(function () {
    var API = window.CAMSOFT_CHAT_API || 'https://api.camsoft.com.co';
    var STORAGE_KEY = 'camsoft_visitor_token';

    var styles = `
#camsoft-chat-root{font-family:Inter,system-ui,sans-serif;z-index:99999}
.camsoft-chat-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;box-shadow:0 8px 24px rgba(16,185,129,.35);display:flex;align-items:center;justify-content:center}
.camsoft-chat-btn svg{width:26px;height:26px}
.camsoft-chat-panel{position:fixed;bottom:92px;right:24px;width:min(380px,calc(100vw - 32px));height:520px;background:#0f172a;border:1px solid rgba(148,163,184,.2);border-radius:16px;display:none;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.45)}
.camsoft-chat-panel.open{display:flex}
.camsoft-chat-head{padding:14px 16px;background:#1e293b;color:#f8fafc;font-weight:600;font-size:15px;border-bottom:1px solid rgba(148,163,184,.15)}
.camsoft-chat-head small{display:block;font-weight:400;color:#94a3b8;font-size:12px;margin-top:2px}
.camsoft-chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.camsoft-chat-msg{max-width:88%;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap}
.camsoft-chat-msg.bot,.camsoft-chat-msg.agent{align-self:flex-start;background:#1e293b;color:#e2e8f0}
.camsoft-chat-msg.visitor{align-self:flex-end;background:#10b981;color:#fff}
.camsoft-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(148,163,184,.15);background:#0f172a}
.camsoft-chat-form input{flex:1;border:1px solid rgba(148,163,184,.25);background:#1e293b;color:#f8fafc;border-radius:10px;padding:10px 12px;font-size:14px}
.camsoft-chat-form button{border:none;background:#3b82f6;color:#fff;border-radius:10px;padding:0 14px;cursor:pointer;font-weight:600}
.camsoft-chat-start{padding:16px;display:flex;flex-direction:column;gap:10px}
.camsoft-chat-start input{border:1px solid rgba(148,163,184,.25);background:#1e293b;color:#f8fafc;border-radius:10px;padding:10px 12px}
.camsoft-chat-start button{border:none;background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;border-radius:10px;padding:12px;cursor:pointer;font-weight:600}
`;

    function el(tag, cls, html) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    function inject() {
        if (document.getElementById('camsoft-chat-root')) return;
        var style = el('style');
        style.textContent = styles;
        document.head.appendChild(style);

        var root = el('div');
        root.id = 'camsoft-chat-root';

        var btn = el('button', 'camsoft-chat-btn');
        btn.setAttribute('aria-label', 'Abrir chat CamSoft');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

        var panel = el('div', 'camsoft-chat-panel');
        panel.innerHTML = '<div class="camsoft-chat-head">CamSoft<small>Chat · respuesta en 24–48 h hábiles</small></div>';

        var body = el('div');
        body.style.flex = '1';
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.minHeight = '0';

        panel.appendChild(body);
        root.appendChild(panel);
        root.appendChild(btn);
        document.body.appendChild(root);

        var state = { token: localStorage.getItem(STORAGE_KEY), messages: [] };

        function renderMessages() {
            var box = el('div', 'camsoft-chat-msgs');
            state.messages.forEach(function (m) {
                var type = m.author_type === 'visitor' ? 'visitor' : 'bot';
                if (m.author_type === 'agent') type = 'agent';
                box.appendChild(el('div', 'camsoft-chat-msg ' + type, m.body));
            });
            return box;
        }

        function showChat() {
            body.innerHTML = '';
            var msgs = renderMessages();
            body.appendChild(msgs);
            msgs.scrollTop = msgs.scrollHeight;

            var form = el('form', 'camsoft-chat-form');
            var input = el('input');
            input.placeholder = 'Escribe tu mensaje…';
            input.autocomplete = 'off';
            var send = el('button');
            send.type = 'submit';
            send.textContent = 'Enviar';
            form.appendChild(input);
            form.appendChild(send);
            body.appendChild(form);

            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var text = input.value.trim();
                if (!text) return;
                input.value = '';
                fetch(API + '/chat/' + state.token + '/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ body: text })
                })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (data.visitorMsg) state.messages.push(data.visitorMsg);
                        if (data.botMsg) state.messages.push(data.botMsg);
                        showChat();
                    })
                    .catch(function () {
                        input.placeholder = 'Error de conexión. Intenta de nuevo.';
                    });
            });
        }

        function showStart() {
            body.innerHTML = '';
            var start = el('div', 'camsoft-chat-start');
            start.innerHTML = '<p style="color:#94a3b8;font-size:13px;margin:0">Cuéntanos tu nombre para iniciar (email opcional).</p>';
            var name = el('input');
            name.placeholder = 'Tu nombre';
            var email = el('input');
            email.placeholder = 'Email (opcional)';
            email.type = 'email';
            var go = el('button');
            go.textContent = 'Iniciar chat';
            start.appendChild(name);
            start.appendChild(email);
            start.appendChild(go);
            body.appendChild(start);
            go.addEventListener('click', function () {
                fetch(API + '/chat/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.value.trim(), email: email.value.trim() })
                })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        state.token = data.visitorToken;
                        localStorage.setItem(STORAGE_KEY, state.token);
                        state.messages = data.message ? [data.message] : [];
                        showChat();
                    });
            });
        }

        function openPanel() {
            panel.classList.add('open');
            if (state.token) {
                fetch(API + '/chat/' + state.token + '/messages')
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        state.messages = data.messages || [];
                        showChat();
                    })
                    .catch(showStart);
            } else {
                showStart();
            }
        }

        btn.addEventListener('click', function () {
            if (panel.classList.contains('open')) panel.classList.remove('open');
            else openPanel();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
})();
