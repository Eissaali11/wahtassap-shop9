import { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  Users,
  MessageSquare,
  BarChart2,
  Play,
  Square,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useSessionsQuery } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './BulkMessaging.css';

const API_BASE = '/api';

function apiKey() {
  return sessionStorage.getItem('openwa_api_key') || '';
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey(), ...opts.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactList {
  id: string;
  name: string;
  description?: string;
  contact_count: number;
  source: string;
  created_at: string;
}

interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
}

interface BulkMessage {
  id: string;
  title: string;
  contact_list_id: string;
  message_template: string;
  message_type: string;
  status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed';
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  created_at: string;
}

interface Stats {
  total_messages: number;
  total_sent: number;
  total_failed: number;
  total_contacts: number;
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'contacts' | 'messages' | 'stats';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'مسودة', cls: 'badge-gray' },
    scheduled: { label: 'مجدول', cls: 'badge-blue' },
    processing: { label: 'يُرسَل...', cls: 'badge-yellow' },
    completed: { label: 'مكتمل', cls: 'badge-green' },
    failed: { label: 'فشل', cls: 'badge-red' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'badge-gray' };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BulkMessaging() {
  useDocumentTitle('الإرسال الجماعي');
  const { data: allSessions = [] } = useSessionsQuery();
  const sessions = allSessions.filter(s => s.status === 'ready');

  const [sessionId, setSessionId] = useState('');
  const [tab, setTab] = useState<Tab>('contacts');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Contact lists state
  const [lists, setLists] = useState<ContactList[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [listContacts, setListContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // Add contact state
  const [showAddContact, setShowAddContact] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [addingContact, setAddingContact] = useState(false);

  // Excel import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importingExcel, setImportingExcel] = useState(false);

  // Bulk messages state
  const [bulkMessages, setBulkMessages] = useState<BulkMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreateMsg, setShowCreateMsg] = useState(false);
  const [newMsgTitle, setNewMsgTitle] = useState('');
  const [newMsgTemplate, setNewMsgTemplate] = useState('');
  const [newMsgListId, setNewMsgListId] = useState('');
  const [creatingMsg, setCreatingMsg] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Expanded detail for bulk message
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);

  // Gemini AI Copywriter state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAiText, setGeneratingAiText] = useState(false);
  const [aiResult, setAiResult] = useState('');

  async function generateAiText() {
    if (!aiPrompt.trim()) return;
    setGeneratingAiText(true);
    setAiResult('');
    try {
      const data = await apiFetch<{ data: { text: string } }>(
        `/sessions/${sessionId}/bulk-messaging/generate-marketing-text`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: aiPrompt }),
        }
      );
      setAiResult(data.data?.text || '');
      showToast('success', 'تم توليد النص بنجاح!');
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setGeneratingAiText(false);
    }
  }

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Session selector ────────────────────────────────────────────────────────

  async function handleSessionChange(id: string) {
    setSessionId(id);
    setLists([]);
    setListsLoaded(false);
    setBulkMessages([]);
    setMessagesLoaded(false);
    setStats(null);
    setSelectedList(null);
    setListContacts([]);
    if (!id) return;
    if (tab === 'contacts') loadLists(id);
    if (tab === 'messages') loadMessages(id);
    if (tab === 'stats') loadStats(id);
  }

  async function handleTabChange(t: Tab) {
    setTab(t);
    if (!sessionId) return;
    if (t === 'contacts' && !listsLoaded) loadLists(sessionId);
    if (t === 'messages' && !messagesLoaded) loadMessages(sessionId);
    if (t === 'stats') loadStats(sessionId);
  }

  // ── Contact lists ───────────────────────────────────────────────────────────

  async function loadLists(sid: string) {
    setLoadingLists(true);
    try {
      const data = await apiFetch<{ data: ContactList[] }>(`/sessions/${sid}/bulk-messaging/contact-lists`);
      setLists(data.data || []);
      setListsLoaded(true);
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setLoadingLists(false);
    }
  }

  async function createList() {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      await apiFetch(`/sessions/${sessionId}/bulk-messaging/contact-lists`, {
        method: 'POST',
        body: JSON.stringify({ name: newListName, description: newListDesc, source: 'manual' }),
      });
      setNewListName('');
      setNewListDesc('');
      setShowCreateList(false);
      await loadLists(sessionId);
      showToast('success', 'تم إنشاء القائمة بنجاح');
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setCreatingList(false);
    }
  }

  async function deleteList(id: string) {
    if (!confirm('هل تريد حذف هذه القائمة؟')) return;
    try {
      await apiFetch(`/sessions/${sessionId}/bulk-messaging/contact-lists/${id}`, { method: 'DELETE' });
      if (selectedList?.id === id) { setSelectedList(null); setListContacts([]); }
      await loadLists(sessionId);
      showToast('success', 'تم حذف القائمة');
    } catch (e) {
      showToast('error', (e as Error).message);
    }
  }

  async function openList(list: ContactList) {
    setSelectedList(list);
    setLoadingContacts(true);
    try {
      const data = await apiFetch<{ data: { contacts: Contact[] } }>(`/sessions/${sessionId}/bulk-messaging/contact-lists/${list.id}`);
      setListContacts(data.data?.contacts || []);
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function addContact() {
    if (!newPhone.trim() || !selectedList) return;
    setAddingContact(true);
    try {
      await apiFetch(`/sessions/${sessionId}/bulk-messaging/contact-lists/${selectedList.id}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ phone: newPhone, name: newName }),
      });
      setNewPhone('');
      setNewName('');
      setShowAddContact(false);
      await openList(selectedList);
      await loadLists(sessionId);
      showToast('success', 'تمت إضافة جهة الاتصال');
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setAddingContact(false);
    }
  }

  async function deleteContact(contactId: string) {
    if (!confirm('هل تريد حذف جهة الاتصال هذه؟')) return;
    try {
      await apiFetch(`/sessions/${sessionId}/bulk-messaging/contacts/${contactId}`, { method: 'DELETE' });
      setListContacts(prev => prev.filter(c => c.id !== contactId));
      if (selectedList) await loadLists(sessionId);
      showToast('success', 'تم حذف جهة الاتصال');
    } catch (e) {
      showToast('error', (e as Error).message);
    }
  }

  async function importExcel(file: File) {
    if (!selectedList) return;
    setImportingExcel(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `${API_BASE}/sessions/${sessionId}/bulk-messaging/contact-lists/${selectedList.id}/import-excel`,
        { method: 'POST', headers: { 'X-API-Key': apiKey() }, body: formData },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message);
      }
      const result = await res.json();
      await openList(selectedList);
      await loadLists(sessionId);
      showToast('success', `تم استيراد ${result.data?.imported ?? result.imported ?? 0} جهة اتصال بنجاح!`);
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setImportingExcel(false);
    }
  }

  function downloadTemplate() {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + "رقم الجوال,الاسم,البريد الإلكتروني,المدينة\n"
      + "966501234567,أحمد علي,ahmed@example.com,الرياض\n"
      + "966551234567,سارة أحمد,sara@example.com,جدة\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "نموذج_استيراد_أرقام_openwa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Bulk messages ───────────────────────────────────────────────────────────

  async function loadMessages(sid: string) {
    setLoadingMessages(true);
    try {
      const data = await apiFetch<{ data: BulkMessage[] }>(`/sessions/${sid}/bulk-messaging/messages`);
      setBulkMessages(data.data || []);
      setMessagesLoaded(true);
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function createMessage() {
    if (!newMsgTitle.trim() || !newMsgTemplate.trim() || !newMsgListId) return;
    setCreatingMsg(true);
    try {
      await apiFetch(`/sessions/${sessionId}/bulk-messaging/messages`, {
        method: 'POST',
        body: JSON.stringify({
          title: newMsgTitle,
          contact_list_id: newMsgListId,
          message_template: newMsgTemplate,
        }),
      });
      setNewMsgTitle('');
      setNewMsgTemplate('');
      setNewMsgListId('');
      setShowCreateMsg(false);
      await loadMessages(sessionId);
      showToast('success', 'تم إنشاء الرسالة الجماعية');
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setCreatingMsg(false);
    }
  }

  async function sendMessage(id: string) {
    setSendingId(id);
    try {
      await apiFetch(`/sessions/${sessionId}/bulk-messaging/messages/${id}/send`, {
        method: 'POST',
        body: JSON.stringify({ delay_ms: 1500 }),
      });
      await loadMessages(sessionId);
      showToast('success', 'بدأ الإرسال الجماعي');
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setSendingId(null);
    }
  }

  async function stopMessage(id: string) {
    setStoppingId(id);
    try {
      await apiFetch(`/sessions/${sessionId}/bulk-messaging/messages/${id}/stop`, { method: 'POST' });
      await loadMessages(sessionId);
      showToast('success', 'تم إيقاف الإرسال');
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setStoppingId(null);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('هل تريد حذف هذه الرسالة الجماعية؟')) return;
    try {
      await apiFetch(`/sessions/${sessionId}/bulk-messaging/messages/${id}`, { method: 'DELETE' });
      await loadMessages(sessionId);
      showToast('success', 'تم حذف الرسالة');
    } catch (e) {
      showToast('error', (e as Error).message);
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  async function loadStats(sid: string) {
    setLoadingStats(true);
    try {
      const data = await apiFetch<Stats>(`/sessions/${sid}/bulk-messaging/statistics`);
      setStats(data);
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setLoadingStats(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bulk-page">
      <PageHeader title="الإرسال الجماعي" subtitle="إدارة قوائم جهات الاتصال وإرسال الرسائل الجماعية" />

      {/* Toast */}
      {toast && (
        <div className={`bulk-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Session selector */}
      <div className="bulk-session-bar">
        <label>الجلسة:</label>
        <select value={sessionId} onChange={e => handleSessionChange(e.target.value)}>
          <option value="">-- اختر جلسة --</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.phone || 'غير متصل'})</option>
          ))}
        </select>
        {sessions.length === 0 && (
          <span className="bulk-no-session">لا توجد جلسات متصلة. قم بتشغيل جلسة أولاً.</span>
        )}
      </div>

      {/* Tabs */}
      <div className="bulk-tabs">
        <button className={tab === 'contacts' ? 'active' : ''} onClick={() => handleTabChange('contacts')}>
          <Users size={16} /> قوائم جهات الاتصال
        </button>
        <button className={tab === 'messages' ? 'active' : ''} onClick={() => handleTabChange('messages')}>
          <MessageSquare size={16} /> الرسائل الجماعية
        </button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => handleTabChange('stats')}>
          <BarChart2 size={16} /> الإحصائيات
        </button>
      </div>

      {!sessionId ? (
        <div className="bulk-placeholder">
          <Users size={48} />
          <p>اختر جلسة واتساب للبدء</p>
        </div>
      ) : (
        <div className="bulk-content">

          {/* ── CONTACTS TAB ── */}
          {tab === 'contacts' && (
            <div className="bulk-split">
              {/* Left: Lists */}
              <div className="bulk-panel">
                <div className="panel-header">
                  <h3>قوائم جهات الاتصال</h3>
                  <button className="btn-primary btn-sm" onClick={() => setShowCreateList(true)}>
                    <Plus size={14} /> قائمة جديدة
                  </button>
                </div>

                {showCreateList && (
                  <div className="inline-form">
                    <input placeholder="اسم القائمة *" value={newListName} onChange={e => setNewListName(e.target.value)} />
                    <input placeholder="وصف (اختياري)" value={newListDesc} onChange={e => setNewListDesc(e.target.value)} />
                    <div className="form-actions">
                      <button className="btn-primary btn-sm" onClick={createList} disabled={creatingList || !newListName.trim()}>
                        {creatingList ? <Loader2 size={14} className="spin" /> : 'إنشاء'}
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => setShowCreateList(false)}>إلغاء</button>
                    </div>
                  </div>
                )}

                {loadingLists ? (
                  <div className="loading-center"><Loader2 className="spin" size={24} /></div>
                ) : lists.length === 0 ? (
                  <div className="empty-state">
                    <Users size={32} />
                    <p>لا توجد قوائم بعد. أنشئ قائمة للبدء.</p>
                  </div>
                ) : (
                  <ul className="list-items">
                    {lists.map(l => (
                      <li
                        key={l.id}
                        className={`list-item ${selectedList?.id === l.id ? 'selected' : ''}`}
                        onClick={() => openList(l)}
                      >
                        <div className="list-item-info">
                          <strong>{l.name}</strong>
                          <span className="item-meta">{l.contact_count} جهة اتصال · {l.source}</span>
                        </div>
                        <button
                          className="btn-icon-danger"
                          onClick={e => { e.stopPropagation(); deleteList(l.id); }}
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Right: Contacts in selected list */}
              <div className="bulk-panel">
                {!selectedList ? (
                  <div className="empty-state">
                    <FileText size={32} />
                    <p>اختر قائمة لعرض جهات الاتصال</p>
                  </div>
                ) : (
                  <>
                    <div className="panel-header">
                      <h3>{selectedList.name}</h3>
                       <div className="header-actions">
                        <button className="btn-outline btn-sm" onClick={downloadTemplate} title="تحميل نموذج ملف الاستيراد">
                          <Upload size={14} style={{ transform: 'rotate(180deg)' }} /> تحميل النموذج
                        </button>
                        <button className="btn-outline btn-sm" onClick={() => setShowAddContact(!showAddContact)}>
                          <Plus size={14} /> إضافة
                        </button>
                        <label className="btn-outline btn-sm" style={{ cursor: importingExcel ? 'wait' : 'pointer' }}>
                          {importingExcel ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                          استيراد Excel
                          <input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            onChange={e => e.target.files?.[0] && importExcel(e.target.files[0])}
                          />
                        </label>
                      </div>
                    </div>

                    {showAddContact && (
                      <div className="inline-form">
                        <input placeholder="رقم الهاتف * (مثال: 966501234567)" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                        <input placeholder="الاسم (اختياري)" value={newName} onChange={e => setNewName(e.target.value)} />
                        <div className="form-actions">
                          <button className="btn-primary btn-sm" onClick={addContact} disabled={addingContact || !newPhone.trim()}>
                            {addingContact ? <Loader2 size={14} className="spin" /> : 'إضافة'}
                          </button>
                          <button className="btn-ghost btn-sm" onClick={() => setShowAddContact(false)}>إلغاء</button>
                        </div>
                      </div>
                    )}

                    {loadingContacts ? (
                      <div className="loading-center"><Loader2 className="spin" size={24} /></div>
                    ) : listContacts.length === 0 ? (
                      <div className="empty-state">
                        <p>لا توجد جهات اتصال في هذه القائمة.</p>
                        <p className="hint-text">أضف جهات اتصال يدوياً أو استورد من ملف Excel.</p>
                        <p className="hint-text">تنسيق Excel: عمود "phone" مطلوب، وعمود "name" اختياري.</p>
                      </div>
                    ) : (
                      <table className="bulk-table">
                        <thead>
                          <tr>
                            <th>رقم الهاتف</th>
                            <th>الاسم</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {listContacts.map(c => (
                            <tr key={c.id}>
                              <td className="mono">{c.phone}</td>
                              <td>{c.name || '—'}</td>
                              <td>
                                <button className="btn-icon-danger" onClick={() => deleteContact(c.id)}>
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── MESSAGES TAB ── */}
          {tab === 'messages' && (
            <div className="bulk-panel full-width">
              <div className="panel-header">
                <h3>الرسائل الجماعية</h3>
                <button className="btn-primary btn-sm" onClick={() => { setShowCreateMsg(true); if (!listsLoaded) loadLists(sessionId); }}>
                  <Plus size={14} /> رسالة جديدة
                </button>
              </div>

              {showCreateMsg && (
                <div className="create-msg-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>عنوان الحملة *</label>
                      <input placeholder="مثال: عروض رمضان" value={newMsgTitle} onChange={e => setNewMsgTitle(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>قائمة جهات الاتصال *</label>
                      <select value={newMsgListId} onChange={e => setNewMsgListId(e.target.value)}>
                        <option value="">-- اختر قائمة --</option>
                        {lists.map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.contact_count})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ marginBottom: 0 }}>نص الرسالة * (يمكن استخدام {'{{name}}'} للاسم)</label>
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '11px', height: 'auto', border: '1px solid #7c3aed', color: '#7c3aed' }}
                        onClick={() => setShowAiModal(true)}
                      >
                        💡 توليد بالذكاء الاصطناعي (Gemini)
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      placeholder={'مثال: مرحباً {{name}}، لدينا عروض خاصة لك اليوم!'}
                      value={newMsgTemplate}
                      onChange={e => setNewMsgTemplate(e.target.value)}
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn-primary"
                      onClick={createMessage}
                      disabled={creatingMsg || !newMsgTitle.trim() || !newMsgTemplate.trim() || !newMsgListId}
                    >
                      {creatingMsg ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                      إنشاء
                    </button>
                    <button className="btn-ghost" onClick={() => setShowCreateMsg(false)}>إلغاء</button>
                  </div>
                </div>
              )}

              {loadingMessages ? (
                <div className="loading-center"><Loader2 className="spin" size={24} /></div>
              ) : bulkMessages.length === 0 ? (
                <div className="empty-state">
                  <MessageSquare size={40} />
                  <p>لا توجد رسائل جماعية. أنشئ رسالة للبدء.</p>
                </div>
              ) : (
                <div className="msg-list">
                  {bulkMessages.map(msg => (
                    <div key={msg.id} className="msg-card">
                      <div className="msg-card-header" onClick={() => setExpandedMsgId(expandedMsgId === msg.id ? null : msg.id)}>
                        <div className="msg-card-title">
                          <strong>{msg.title}</strong>
                          <StatusBadge status={msg.status} />
                        </div>
                        <div className="msg-card-meta">
                          <span>{msg.total_contacts} جهة اتصال</span>
                          <span className="sent">✓ {msg.sent_count}</span>
                          <span className="failed">✗ {msg.failed_count}</span>
                          {expandedMsgId === msg.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {expandedMsgId === msg.id && (
                        <div className="msg-card-body">
                          <div className="msg-template-preview">
                            <label>نص الرسالة:</label>
                            <p>{msg.message_template}</p>
                          </div>
                          <div className="msg-progress">
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: msg.total_contacts ? `${(msg.sent_count / msg.total_contacts) * 100}%` : '0%' }}
                              />
                            </div>
                            <span>{msg.total_contacts ? Math.round((msg.sent_count / msg.total_contacts) * 100) : 0}%</span>
                          </div>
                        </div>
                      )}

                      <div className="msg-card-actions">
                        {(msg.status === 'draft' || msg.status === 'failed') && (
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => sendMessage(msg.id)}
                            disabled={sendingId === msg.id}
                          >
                            {sendingId === msg.id ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
                            إرسال
                          </button>
                        )}
                        {msg.status === 'processing' && (
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => stopMessage(msg.id)}
                            disabled={stoppingId === msg.id}
                          >
                            {stoppingId === msg.id ? <Loader2 size={14} className="spin" /> : <Square size={14} />}
                            إيقاف
                          </button>
                        )}
                        {msg.status !== 'processing' && (
                          <button className="btn-ghost btn-sm btn-icon" onClick={() => deleteMessage(msg.id)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STATS TAB ── */}
          {tab === 'stats' && (
            <div className="bulk-panel full-width">
              <div className="panel-header">
                <h3>الإحصائيات</h3>
                <button className="btn-outline btn-sm" onClick={() => loadStats(sessionId)}>
                  تحديث
                </button>
              </div>
              {loadingStats ? (
                <div className="loading-center"><Loader2 className="spin" size={24} /></div>
              ) : stats ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats.total_contacts ?? 0}</div>
                    <div className="stat-label">إجمالي جهات الاتصال</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.total_messages ?? 0}</div>
                    <div className="stat-label">إجمالي الحملات</div>
                  </div>
                  <div className="stat-card green">
                    <div className="stat-value">{stats.total_sent ?? 0}</div>
                    <div className="stat-label">رسائل مرسلة</div>
                  </div>
                  <div className="stat-card red">
                    <div className="stat-value">{stats.total_failed ?? 0}</div>
                    <div className="stat-label">رسائل فشلت</div>
                  </div>
                </div>
              ) : (
                <div className="empty-state"><p>لا توجد إحصائيات بعد.</p></div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Gemini AI Copywriter Modal */}
      {showAiModal && (
        <div className="ai-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="ai-modal" style={{
            backgroundColor: '#ffffff', borderRadius: '12px',
            width: '90%', maxWidth: '600px', padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            direction: 'rtl'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🤖 كاتب الإعلانات الذكي (Gemini AI)
              </h3>
              <button
                type="button"
                onClick={() => { setShowAiModal(false); setAiPrompt(''); setAiResult(''); }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '13px' }}>
                اكتب فكرتك أو العرض التسويقي باختصار:
              </label>
              <textarea
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', resize: 'vertical' }}
                placeholder="مثال: عرض نهاية العام خصم 20% على العطور لعملائنا في الرياض وشحن مجاني للطلبات فوق 200 ريال"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#7c3aed', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={generatingAiText || !aiPrompt.trim()}
                onClick={generateAiText}
              >
                {generatingAiText ? <Loader2 size={14} className="spin" /> : '💡 توليد النص التسويقي'}
              </button>
            </div>

            {aiResult && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '13px', color: '#10b981' }}>
                  ✨ النص التسويقي المقترح:
                </label>
                <div style={{
                  padding: '12px', borderRadius: '8px', backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb', fontSize: '13px', whiteSpace: 'pre-wrap',
                  maxHeight: '200px', overflowY: 'auto', lineHeight: '1.6'
                }}>
                  {aiResult}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer' }}
                    onClick={() => {
                      setNewMsgTemplate(aiResult);
                      setShowAiModal(false);
                      setAiPrompt('');
                      setAiResult('');
                    }}
                  >
                    📥 استخدام هذا النص
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: '8px 16px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={generateAiText}
                  >
                    🔄 إعادة الصياغة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for Excel */}
      <input
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        id="excel-upload-global"
      />
    </div>
  );
}

export default BulkMessaging;
