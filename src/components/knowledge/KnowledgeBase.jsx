import React, { useState, useEffect } from 'react';
import { knowledgeApi } from '../../api/knowledgeApi';
import {
  BookOpen,
  Plus,
  Upload,
  FileText,
  Trash2,
  Edit3,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
  X
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Documents' },
  { id: 'POLICY', label: 'General Policy' },
  { id: 'RETURN_POLICY', label: 'Return Policy' },
  { id: 'REFUND_POLICY', label: 'Refund Policy' },
  { id: 'DELIVERY_POLICY', label: 'Delivery Policy' },
  { id: 'FAQ', label: 'Customer FAQs' },
  { id: 'SOP', label: 'Internal SOP' },
  { id: 'PHARMACY_INFORMATION', label: 'Store Info' },
  { id: 'OTHER', label: 'Other' },
];

export const KnowledgeBase = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('manual'); // 'manual' or 'upload'
  const [editingDoc, setEditingDoc] = useState(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('POLICY');
  const [formContent, setFormContent] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await knowledgeApi.getDocuments(selectedCategory);
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to load knowledge documents:', err);
      setError('Unable to load knowledge documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingDoc(null);
    setFormTitle('');
    setFormCategory('POLICY');
    setFormContent('');
    setUploadFile(null);
    setModalMode('manual');
    setModalOpen(true);
  };

  const handleOpenEditModal = (doc) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormCategory(doc.category || 'POLICY');
    setFormContent(doc.content);
    setModalMode('manual');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (modalMode === 'upload') {
        if (!uploadFile) {
          setError('Please select a file to upload (.txt, .pdf, or .docx).');
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', uploadFile);
        if (formTitle.trim()) {
          formData.append('title', formTitle.trim());
        }
        formData.append('category', formCategory);

        await knowledgeApi.uploadFile(formData);
        showNotification('Document uploaded and indexed into knowledge base successfully!');
      } else {
        if (!formTitle.trim() || !formContent.trim()) {
          setError('Title and content are required.');
          setSubmitting(false);
          return;
        }

        if (editingDoc) {
          await knowledgeApi.updateDocument(editingDoc.id, {
            title: formTitle.trim(),
            category: formCategory,
            content: formContent.trim(),
          });
          showNotification('Document updated and re-indexed successfully!');
        } else {
          await knowledgeApi.createDocument({
            title: formTitle.trim(),
            category: formCategory,
            content: formContent.trim(),
          });
          showNotification('Document created and indexed into knowledge base successfully!');
        }
      }

      setModalOpen(false);
      fetchDocuments();
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.response?.data?.detail || 'Failed to save document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await knowledgeApi.deleteDocument(docId);
      showNotification('Document deleted successfully.');
      fetchDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete document.');
    }
  };

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      (doc.content && doc.content.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-emerald-800/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Pharmacy Knowledge Base</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl">
            Manage your store policies, refund rules, delivery hours, and standard operating procedures (SOPs).
            The MedGuard AI Assistant strictly references these documents when answering customer and staff queries.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Search and Category Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Documents Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-900/60 border border-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No documents found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
              Add your store return policy, delivery guidelines, or FAQs so your AI Assistant can answer inquiries accurately.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium rounded-xl text-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 text-[11px] font-semibold tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    {doc.category || 'OTHER'}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleOpenEditModal(doc)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
                      title="Edit Document"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-400"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-white text-base mb-2 group-hover:text-emerald-300 transition">
                  {doc.title}
                </h3>
                <p className="text-slate-400 text-xs line-clamp-4 leading-relaxed whitespace-pre-line">
                  {doc.content}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-400" />
                  {doc.chunk_count || 1} vector chunks
                </span>
                <span>
                  {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Document Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-white">
                  {editingDoc ? 'Edit Knowledge Document' : 'Add Knowledge Document'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Mode Selector (only when adding new) */}
            {!editingDoc && (
              <div className="flex border-b border-slate-800 bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setModalMode('manual')}
                  className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                    modalMode === 'manual'
                      ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Write Policy Text
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('upload')}
                  className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                    modalMode === 'upload'
                      ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload File (.PDF, .DOCX, .TXT)
                </button>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Document Title {modalMode === 'upload' && '(Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Return & Exchange Policy 2026"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    required={modalMode === 'manual'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {modalMode === 'manual' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Policy / SOP Content
                  </label>
                  <textarea
                    rows={8}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Enter the complete text of the policy, FAQ, or SOP. The AI Assistant will use this content when answering questions."
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed font-sans"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Select File (.txt, .pdf, .docx up to 10MB)
                  </label>
                  <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center bg-slate-950/40 transition">
                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <input
                      type="file"
                      accept=".txt,.pdf,.docx"
                      onChange={(e) => setUploadFile(e.target.files[0] || null)}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                    />
                    {uploadFile && (
                      <p className="mt-2 text-xs text-emerald-400 font-medium">
                        Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Indexing vector chunks...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingDoc ? 'Update & Re-index' : 'Save & Index Document'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
