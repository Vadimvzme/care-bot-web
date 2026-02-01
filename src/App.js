import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- НАСТРОЙКИ SUPABASE ---
const supabase = createClient(
  'https://mlbttyytpecakwswxxif.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYnR0eXl0cGVjYWt3c3d4eGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzE2OTQsImV4cCI6MjA4NTAwNzY5NH0.jwkjx41C1zMsAfFu4GffR_zKhyLi1HYh73F9uHbtGeU'
);

const translations = {
  ru: {
    choice: "КТО ВЫ?", senior: "Я — СТАРШИЙ", relative: "Я — РОДСТВЕННИК",
    reg: "РЕГИСТРАЦИЯ", restore: "ВОССТАНОВЛЕНИЕ", name: "ВАШЕ ИМЯ", code: "КОД СВЯЗИ",
    continue: "СОЗДАТЬ КОД", enter: "ВОЙТИ", back: "НАЗАД",
    connStatus: "✅ НА СВЯЗИ С", waiting: "⏳ ОЖИДАНИЕ...",
    idLabel: "ID ДЛЯ СВЯЗИ С РОДСТВЕННИКОМ:", copy: "КОПИРОВАТЬ ID",
    sentAt: "ОТПРАВЛЕНО:", receivedAt: "ПОЛУЧЕНО:",
    timerLabel: "ПРОШЛО ВРЕМЕНИ:", settings: "НАСТРОЙКИ", lang: "ЯЗЫК / LANGUAGE",
    logout: "ВЫЙТИ ИЗ АККАУНТА", save: "СОХРАНИТЬ",
    checkHour: "ЧАС КОНТРОЛЯ", waitHours: "ВРЕМЯ ОЖИДАНИЯ (ЧАСЫ)",
    well: "У меня все хорошо! Спасибо, что помнишь обо мне!)",
    unwell: "У меня легкое недомогание, но не критично. Спасибо, что держишь руку на пульсе!)",
    sos: "Я серьезно болею. Нужна поддержка!",
    copySuccess: "Скопировано!",
    lostConnTitle: "СВЯЗЬ ПРЕРВАНА",
    lostConnText: "Старший пользователь вышел из своего аккаунта. Ваш аккаунт деактивирован, так как связь разорвана. Введите ID заново для восстановления.",
    restoreBtn: "ВОССТАНОВИТЬ СВЯЗЬ"
  },
  en: {
    choice: "WHO ARE YOU?", senior: "I AM SENIOR", relative: "I AM RELATIVE",
    reg: "REGISTRATION", restore: "RESTORE", name: "YOUR NAME", code: "CONNECTION CODE",
    continue: "CREATE CODE", enter: "ENTER", back: "BACK",
    connStatus: "✅ CONNECTED WITH", waiting: "WAITING...",
    idLabel: "ID FOR RELATIVE:", copy: "COPY ID",
    sentAt: "SENT AT:", receivedAt: "RECEIVED AT:",
    timerLabel: "TIME ELAPSED:", settings: "SETTINGS", lang: "LANGUAGE",
    logout: "LOG OUT", save: "SAVE",
    checkHour: "CONTROL HOUR", waitHours: "WAIT HOURS",
    well: "I'm doing great! Thanks for thinking of me!)",
    unwell: "I'm feeling a bit unwell, but not critical. Thanks for keeping in touch!)",
    sos: "I am seriously ill. I need support!",
    copySuccess: "Copied!",
    lostConnTitle: "CONNECTION LOST",
    lostConnText: "Senior user has logged out. Your account is deactivated because the connection was severed. Re-enter ID to restore.",
    restoreBtn: "RESTORE CONNECTION"
  }
};

export default function App() {
  const [tgUser, setTgUser] = useState(null);
  const [lang, setLang] = useState('ru');
  const t = translations[lang] || translations.ru;
  const [role, setRole] = useState(null);
  const [step, setStep] = useState('choice');
  const [userName, setUserName] = useState('');
  const [pairId, setPairId] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [checkHour, setCheckHour] = useState('21');
  const [waitHours, setWaitHours] = useState('48');
  const [lastData, setLastData] = useState({ text: '—', time: null });
  const [timeDiff, setTimeDiff] = useState('0д 0ч 0м');

  // Инициализация Telegram WebApp и локальных настроек
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTgUser(tg.initDataUnsafe?.user);
    }

    const sLang = localStorage.getItem('lang');
    const sCheck = localStorage.getItem('checkHour');
    const sWait = localStorage.getItem('waitHours');
    const sPairId = localStorage.getItem('pairId');
    const sRole = localStorage.getItem('role');

    if (sLang) setLang(sLang);
    if (sCheck) setCheckHour(sCheck);
    if (sWait) setWaitHours(sWait);
    if (sPairId && sRole) {
      setPairId(sPairId);
      setRole(sRole);
      setStep('work');
    }
  }, []);

  // Цикл обновления данных из базы
  useEffect(() => {
    let interval;
    if (pairId && step === 'work') {
      const refresh = async () => {
        const { data } = await supabase.from('pairs').select('*').eq('pair_id', pairId).maybeSingle();
        if (role === 'client') {
          if (!data || !data.senior_chat_id) {
            setStep('lost_connection');
            return;
          }
        }
        if (data) {
          setPartnerName(role === 'client' ? data.senior_name : data.relative_name);
          setLastData({ text: data.last_message_text || '—', time: data.last_message_time });
          if (data.last_message_time) {
            const diff = new Date() - new Date(data.last_message_time);
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setTimeDiff(`${d}д ${h}ч ${m}м`);
          }
        }
      };
      refresh();
      interval = setInterval(refresh, 5000);
    }
    return () => clearInterval(interval);
  }, [pairId, step, role]);

  // Общий сброс состояния и очистка базы
  const handleFullReset = async () => {
    if (pairId) {
      const { data: updated } = await supabase.from('pairs')
        .update({ relative_name: null, relative_chat_id: null })
        .eq('pair_id', pairId)
        .select()
        .single();
      
      if (updated && !updated.senior_chat_id && !updated.relative_chat_id) {
        await supabase.from('pairs').delete().eq('pair_id', pairId);
      }
    }
    localStorage.clear();
    window.location.reload();
  };

  const handleStartServer = async () => {
    if (!userName.trim()) return;
    if (!isRestoring && tgUser?.id) {
      await supabase.from('pairs').delete().eq('senior_chat_id', tgUser.id);
    }
    const id = (isRestoring && inputCode.trim()) 
      ? inputCode.trim().toUpperCase() 
      : Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { error } = await supabase.from('pairs').upsert({ 
      pair_id: id, 
      senior_name: userName.toUpperCase(), 
      senior_chat_id: tgUser?.id || null, 
      senior_tz_offset: Math.round(new Date().getTimezoneOffset() / -60)
    });

    if (!error) {
      localStorage.setItem('pairId', id);
      localStorage.setItem('role', 'server');
      setPairId(id);
      setRole('server');
      setStep('work');
      setIsRestoring(false);
    } else { alert("Error"); }
  };

  const handleConnectClient = async () => {
    const code = inputCode.trim().toUpperCase();
    if (!code || !userName.trim()) return;

    try {
      if (tgUser?.id) {
        const { data: oldPairs } = await supabase.from('pairs').select('*').eq('relative_chat_id', tgUser.id);
        if (oldPairs) {
          for (const old of oldPairs) {
            if (old.pair_id !== code) {
              if (!old.senior_chat_id) {
                await supabase.from('pairs').delete().eq('pair_id', old.pair_id);
              } else {
                await supabase.from('pairs').update({ relative_name: null, relative_chat_id: null, is_connected: false }).eq('pair_id', old.pair_id);
              }
            }
          }
        }
      }

      const { data: existingPair } = await supabase.from('pairs').select('*').eq('pair_id', code).maybeSingle();
      
      if (existingPair) {
        const { error } = await supabase.from('pairs').update({ 
          relative_name: userName.toUpperCase(), 
          relative_chat_id: tgUser?.id || null, 
          is_connected: true 
        }).eq('pair_id', code);

        if (!error) {
          localStorage.setItem('pairId', code);
          localStorage.setItem('role', 'client');
          setPairId(code);
          setStep('work');
          setShowErrorModal(false);
        }
      } else {
        setShowErrorModal(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (text) => {
    const now = new Date().toISOString();
    await supabase.from('pairs').update({ 
      last_message_text: text, 
      last_message_time: now, 
      ...(role === 'server' ? { senior_chat_id: tgUser?.id } : { relative_chat_id: tgUser?.id }) 
    }).eq('pair_id', pairId);
    setLastData({ text: text, time: now });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pairId);
    alert(t.copySuccess);
  };

  const s = {
    container: { fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#F8F9FA', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' },
    title: { fontSize: '26px', fontWeight: 'bold', margin: '30px 0', color: '#333', textAlign: 'center' },
    input: { width: '100%', padding: '15px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ccc', textAlign: 'center', fontSize: '16px', textTransform: 'uppercase', boxSizing: 'border-box' },
    bigBtn: { width: '100%', padding: '30px', borderRadius: '25px', margin: '8px 0', border: 'none', color: 'white', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    card: { backgroundColor: 'white', padding: '35px', borderRadius: '30px', width: '100%', textAlign: 'center', boxShadow: '0 8px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box' }
  };

  if (step === 'choice') return (
    <div style={s.container}>
      <h2 style={s.title}>{t.choice}</h2>
      <button style={{...s.bigBtn, backgroundColor: '#4CAF50'}} onClick={() => {setRole('server'); setStep('reg')}}>{t.senior}</button>
      <button style={{...s.bigBtn, backgroundColor: '#2196F3'}} onClick={() => {setRole('client'); setStep('reg')}}>{t.relative}</button>
    </div>
  );

  if (step === 'reg') return (
    <div style={s.container}>
      <h2 style={s.title}>{isRestoring ? t.restore : t.reg}</h2>
      <input style={s.input} placeholder={t.name} value={userName} onChange={e => setUserName(e.target.value.toUpperCase())} />
      {(role === 'client' || isRestoring) && <input style={s.input} placeholder={t.code} value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} />}
      <button style={{...s.bigBtn, backgroundColor: role==='server'?'#4CAF50':'#2196F3'}} onClick={role === 'server' ? handleStartServer : handleConnectClient}>
        {isRestoring ? t.enter : (role === 'server' ? t.continue : t.enter)}
      </button>
      {!isRestoring && role === 'server' && <p style={{color: '#2196F3', cursor: 'pointer', marginTop: '20px'}} onClick={() => setIsRestoring(true)}>{"У МЕНЯ УЖЕ ЕСТЬ ID"}</p>}
      <p style={{color: '#666', cursor: 'pointer', marginTop: '20px'}} onClick={() => {setStep('choice'); setIsRestoring(false)}}>{t.back}</p>
    </div>
  );

  if (step === 'lost_connection') return (
    <div style={{...s.container, backgroundColor: '#FFF0F0'}}>
      <div style={{...s.card, border: '2px solid #F44336', backgroundColor: '#FFFFFF'}}> 
        <h2 style={{color: '#D32F2F', fontSize: '24px'}}>{t.lostConnTitle}</h2>
        <div style={{margin: '20px 0', padding: '15px', backgroundColor: '#FFEBEE', borderRadius: '10px', color: '#B71C1C', fontWeight: '500', lineHeight: '1.4'}}>{t.lostConnText}</div>
        <input style={{...s.input, borderColor: '#F44336'}} placeholder="XXXXXX" value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} />
        <button style={{...s.bigBtn, backgroundColor: '#F44336'}} onClick={handleConnectClient}>{t.restoreBtn}</button>
        <button style={{background: 'none', border: 'none', color: '#757575', marginTop: '20px', cursor: 'pointer', textDecoration: 'underline'}} onClick={handleFullReset}>{t.back} ({t.choice})</button>
      </div>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#2E7D32', fontWeight: 'bold'}}>
        <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {partnerName ? `${t.connStatus} ${partnerName}` : t.waiting}
        </span>
        <span style={{fontSize: '24px', cursor: 'pointer'}} onClick={() => setShowSettings(true)}>⚙️</span>
      </div>

      {role === 'server' ? (
        <div style={{width: '100%', textAlign: 'center'}}>
          <p style={{fontSize: '14px', color: '#666', marginTop: '20px'}}>{t.idLabel}</p>
          <div style={{fontSize: '32px', fontWeight: 'bold', letterSpacing: '6px', color: '#1A237E', margin: '15px 0'}}>{pairId}</div>
          <button style={{backgroundColor: '#1565C0', color: 'white', padding: '10px', borderRadius: '10px', border: 'none', width: '65%', marginBottom: '20px', fontWeight: 'bold'}} onClick={copyToClipboard}>{t.copy}</button>
          <button style={{...s.bigBtn, backgroundColor: '#4CAF50'}} onClick={() => handleSendMessage(t.well)}>{t.well}</button>
          <button style={{...s.bigBtn, backgroundColor: '#FF9800'}} onClick={() => handleSendMessage(t.unwell)}>{t.unwell}</button>
          <button style={{...s.bigBtn, backgroundColor: '#F44336'}} onClick={() => handleSendMessage(t.sos)}>{t.sos}</button>
          {lastData.time && <p style={{marginTop: '15px', color: '#4E5754', fontWeight: 'bold'}}>{t.sentAt} {new Date(lastData.time).toLocaleString()}</p>}
        </div>
      ) : (
        <div style={{ ...s.card, marginTop: '20%' }}>
          <p style={{color: '#666'}}>{t.receivedAt}</p>
          <p style={{fontSize: '18px', fontWeight: 'bold', margin: '20px 0'}}>[{lastData.text}]</p>
          <p style={{fontSize: '14px', color: '#666'}}>{t.timerLabel}</p>
          <div style={{fontSize: '44px', color: '#D32F2F', fontWeight: 'bold'}}>{timeDiff}</div>
        </div>
      )}

      {showSettings && (
        <div style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'#F0F2F5', zIndex:1000, display:'flex', flexDirection:'column', alignItems:'center', padding:'20px', boxSizing:'border-box'}}>
          <h2 style={s.title}>{t.settings}</h2>
          <div style={{display:'flex', marginBottom: '20px'}}>
            <button onClick={() => setLang('ru')} style={{padding:'12px', border:'2px solid', borderRadius:'12px', margin:'0 10px', borderColor: lang === 'ru' ? '#4CAF50' : '#DEE2E6', backgroundColor: 'white'}}>RU</button>
            <button onClick={() => setLang('en')} style={{padding:'12px', border:'2px solid', borderRadius:'12px', margin:'0 10px', borderColor: lang === 'en' ? '#4CAF50' : '#DEE2E6', backgroundColor: 'white'}}>EN</button>
          </div>
          <p style={{color: '#666'}}>{role === 'server' ? t.checkHour : t.waitHours}:</p>
          <input style={s.input} type="number" value={role==='server'?checkHour:waitHours} onChange={e => role==='server'?setCheckHour(e.target.value):setWaitHours(e.target.value)} />
          <button style={{...s.bigBtn, backgroundColor: '#4CAF50'}} onClick={async () => {
            const tzOffset = Math.round(new Date().getTimezoneOffset() / -60);
            localStorage.setItem('lang', lang); localStorage.setItem('checkHour', checkHour); localStorage.setItem('waitHours', waitHours);
            await supabase.from('pairs').update({ check_hour: parseInt(checkHour), wait_hours: parseInt(waitHours), senior_tz_offset: tzOffset }).eq('pair_id', pairId);
            setShowSettings(false);
          }}>{t.save}</button>

          <button style={{background:'none', border:'none', color:'#F44336', fontWeight:'bold', marginTop:'30px', cursor:'pointer'}} onClick={async () => {
            if(window.confirm(t.logout)) {
              try {
                if (pairId) {
                  const { data: pair } = await supabase.from('pairs').select('*').eq('pair_id', pairId).maybeSingle();
                  if (pair) {
                    const recipientId = role === 'server' ? pair.relative_chat_id : pair.senior_chat_id;
                    const myName = role === 'server' ? pair.senior_name : pair.relative_name;
                    if (recipientId) {
                      const note = role === 'server' ? `🔔 ВНИМАНИЕ: Старший (${myName}) вышел из системы! Мониторинг приостановлен.` : `ℹ️ Родственник (${myName}) вышел из системы.`;
                      await fetch(`https://api.telegram.org/bot8591945156:AAGrXSpXjfDnZyX3GF6Omngclwd8cROGhts/sendMessage`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ chat_id: recipientId, text: note, disable_notification: false }) 
                      });
                    }
                    const clearData = role === 'server' ? { senior_name: null, senior_chat_id: null } : { relative_name: null, relative_chat_id: null };
                    const { data: updated } = await supabase.from('pairs').update(clearData).eq('pair_id', pairId).select().single();
                    if (updated && !updated.senior_chat_id && !updated.relative_chat_id) { 
                      await supabase.from('pairs').delete().eq('pair_id', pairId); 
                    }
                  }
                }
              } catch (e) { console.error(e); }
              localStorage.clear(); window.location.reload();
            }
          }}>{t.logout}</button>
          <p style={{marginTop: '20px', color: '#666', cursor: 'pointer'}} onClick={() => setShowSettings(false)}>{t.back}</p>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ОШИБКИ */}
      {showErrorModal && (
        <div style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center', padding:'20px', boxSizing:'border-box'}}>
          <div style={{backgroundColor:'white', padding:'30px', borderRadius:'20px', textAlign:'center', width:'100%', maxWidth:'400px'}}>
            <h2 style={{color: '#D32F2F', marginBottom:'15px'}}>{lang === 'ru' ? "ID НЕ НАЙДЕН" : "ID NOT FOUND"}</h2>
            <p style={{color: '#555', lineHeight:'1.5', marginBottom:'25px'}}>
              {lang === 'ru' 
                ? "Связь невозможна: старый ID удален. Пожалуйста, возьмите новый ID у Старшего пользователя." 
                : "Connection impossible: old ID deleted. Please get a new ID from the Senior user."}
            </p>
            <button style={{...s.bigBtn, backgroundColor: '#2196F3', padding:'20px'}} onClick={handleFullReset}>
              {lang === 'ru' ? "ВЕРНУТЬСЯ В НАЧАЛО" : "BACK TO START"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}