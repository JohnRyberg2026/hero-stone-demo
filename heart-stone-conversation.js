'use strict';
(() => {
  document.querySelectorAll('[data-heart-stone-guide]').forEach(root => {
    const body = root.querySelector('.hs-guide-body');
    if (!body) return;
    const section = document.createElement('section');
    section.className = 'hs-conversation';
    section.innerHTML = `<button type="button" data-chat-open>Start a conversation</button><h3>Talk it through with Heart Stone</h3><p class="hs-guide-note">AI conversation · Your messages and this session’s replies are sent to OpenAI to generate a response. This version does not save chat history or read your partner’s information. Only preferences you explicitly enable are included with future messages.</p>
      <div data-chat-panel hidden><div role="log" aria-label="Conversation with Heart Stone" aria-live="polite"></div>
      <form><label>What brings you here?<textarea maxlength="1500" rows="3" required placeholder="I’d like some simple time together tonight."></textarea></label><button type="submit">Talk with Heart Stone</button></form>
      <p role="status"></p><div data-draft hidden><label>Suggested invitation · edit before continuing<textarea rows="4" maxlength="1000"></textarea></label><button type="button" data-review>Review in invitations</button><p class="hs-guide-note">Only this edited invitation is carried forward. Your conversation stays here.</p></div><button type="button" data-clear>End and clear conversation</button></div>`;
    body.prepend(section);
    const panel = section.querySelector('[data-chat-panel]'), log = section.querySelector('[role=log]'), form = section.querySelector('form');
    const input = form.querySelector('textarea'), send = form.querySelector('button'), status = section.querySelector('[role=status]');
    const draftBox = section.querySelector('[data-draft]'), draft = draftBox.querySelector('textarea');
    let messages = [], version = 0, busy = false, owner = null;
    let sessionAccount, retryAt = 0, retryTimer;
    let connection = typeof heartStoneId === "undefined" ? null : heartStoneId;
    function avatarState(value) {if (root.heartStoneState) root.heartStoneState(value); else root.dataset.state = value;}
    function reset() {window.clearTimeout?.(retryTimer); retryAt=0; version++; messages = []; owner = null; busy = false; input.value = ''; draft.value = ''; draftBox.hidden = true; log.replaceChildren(); panel.hidden = true; status.textContent = ''; send.disabled = false; avatarState('idle');}
    function append(role, text) {const p = document.createElement('p'); const name = document.createElement('strong'); name.textContent = role === 'user' ? 'You: ' : 'Heart Stone: '; p.append(name, document.createTextNode(text)); log.append(p);}
    section.querySelector('[data-chat-open]').onclick = () => {panel.hidden = false; input.focus(); avatarState('listening');};
    input.addEventListener('focus', () => {if (!busy) avatarState('listening');});
    input.addEventListener('input', () => {if (!busy) avatarState('listening');});
    section.querySelector('[data-clear]').onclick = reset;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !input.value.trim() || Date.now()<retryAt) return;
      if (messages.length >= 18) {status.textContent = 'End and clear this conversation to start a fresh one.'; return;}
      const words = input.value.trim(), v = version;
      busy = true; send.disabled = true; draftBox.hidden = true; status.textContent = 'Heart Stone is thinking…'; avatarState('thinking');
      try {
        if (typeof sb === 'undefined') throw Error('Open DATE QUEST and sign in to use conversation.');
        const {data:auth,error:authError} = await sb.auth.getUser();
        if (v !== version) return;
        if (authError || !auth.user) throw Error('Sign in to talk with Heart Stone.');
        if (owner && owner !== auth.user.id) {reset(); return;}
        owner = auth.user.id;
        const next = [...messages,{role:'user',content:words}];
        const {data,error} = await sb.functions.invoke('heartstone-conversation',{body:{messages:next}});
        if (v !== version) return;
        const {data:verify} = await sb.auth.getUser();
        if (v !== version) return;
        if (verify.user?.id !== owner) {reset(); return;}
        if (error) {
          let quota;
          if(error.context?.status===429){try{quota=await error.context.clone().json();}catch{}}
          if(v!==version)return;
          if(quota?.code==='conversation_limit'&&Number.isInteger(quota.retryAfterSeconds)&&quota.retryAfterSeconds>=1&&quota.retryAfterSeconds<=86400){
            retryAt=Date.now()+quota.retryAfterSeconds*1000;
            retryTimer=window.setTimeout?.(()=>{if(v===version){retryAt=0;send.disabled=false;status.textContent='You can try again now. Your message is still here.';}},quota.retryAfterSeconds*1000);
            const minutes=Math.ceil(quota.retryAfterSeconds/60),wait=minutes>=60?'about '+Math.ceil(minutes/60)+' hour(s)':minutes+' minute(s)';
            throw Error('Conversation limit reached. Try again in '+wait+'. Your message is still here.');
          }
          throw Error(error.context?.status===429?'Heart Stone is busy. Try again shortly. Your message is still here.':'Conversation is unavailable. Your message remains here to retry.');
        }
        if (!data || typeof data.reply !== 'string' || !data.reply.trim() || data.reply.length > 3000 || (data.draft !== null && (typeof data.draft !== 'string' || data.draft.length > 1000))) throw Error('Heart Stone could not respond. Please try again.');
        messages = [...next,{role:'assistant',content:data.reply}]; append('user',words); append('assistant',data.reply);
        input.value = ''; avatarState('responding'); status.textContent = 'You choose the next step.';
        draft.value = data.draft || ''; draftBox.hidden = !draft.value;
      } catch (error) {if (v === version) {status.textContent = error.message; avatarState('idle');}}
      finally {if (v === version) {busy = false; send.disabled = Date.now()<retryAt;}}
    });
    section.querySelector('[data-review]').onclick = () => {
      const words = draft.value.trim();
      if (!words || words.length > 1000) {status.textContent = 'Write an invitation of up to 1,000 characters.'; return;}
      // Same-tab, one-use handoff; no chat history, URL text or automatic sending.
      try {sessionStorage.setItem('hs_reviewed_invitation_v1',JSON.stringify({text:words,owner,created:Date.now()})); location.href = 'invitation-opening.html#heart-stone-reviewed';}
      catch {status.textContent = 'Could not open the invitation. Copy your edited words and open invitations.';}
    };
    window.addEventListener('heartstone:home-state', event => {
      const detail = event.detail;
      const next = detail?.heartStoneId ?? (typeof heartStoneId === 'undefined' ? null : heartStoneId);
      if (!detail?.connected || next !== connection) reset();
      connection = detail?.connected ? next : null;
    });
    window.addEventListener('pagehide', reset);
    window.addEventListener('heartstone:preferences-changed', reset);
    if (typeof sb !== 'undefined') sb.auth.onAuthStateChange((event, session) => {
      // SIGNED_IN can confirm the existing session after a tab regains focus.
      // Compare identity instead of treating every notification as a new user.
      const next = session?.user?.id || null;
      const previous = sessionAccount === undefined ? owner : sessionAccount;
      if (event === 'SIGNED_OUT' || !next || (previous !== null && previous !== next)) reset();
      sessionAccount = next;
    });
  });
})();
