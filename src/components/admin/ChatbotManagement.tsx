import React, { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Save,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import {
  getAllChatbotFaqsAdmin,
  createChatbotFaq,
  updateChatbotFaq,
  deleteChatbotFaq,
} from '../../services/chatbot';
import type { ChatbotFaq } from '../../types/database';

export const ChatbotManagement: React.FC = () => {
  const [faqs, setFaqs] = useState<ChatbotFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<ChatbotFaq | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    keywordsInput: '',
    keywords: [] as string[],
    display_order: 1,
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const data = await getAllChatbotFaqsAdmin();
      setFaqs(data);
    } catch (err) {
      console.error('Failed to load FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenCreateModal = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      category: 'About Club',
      keywordsInput: '',
      keywords: [],
      display_order: faqs.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (faq: ChatbotFaq) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'General',
      keywordsInput: '',
      keywords: faq.keywords || [],
      display_order: faq.display_order || 1,
      is_active: faq.is_active,
    });
    setIsModalOpen(true);
  };

  const handleAddKeyword = () => {
    const raw = formData.keywordsInput.trim().toLowerCase();
    if (!raw) return;
    if (!formData.keywords.includes(raw)) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, raw],
        keywordsInput: '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, keywordsInput: '' }));
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      alert('Question and Answer are required.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingFaq) {
        const updated = await updateChatbotFaq(editingFaq.id, {
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          keywords: formData.keywords,
          display_order: Number(formData.display_order) || 1,
          is_active: formData.is_active,
        });

        setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? updated : f)));
        showToast('Question updated successfully! 🎉');
      } else {
        const created = await createChatbotFaq({
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          keywords: formData.keywords,
          display_order: Number(formData.display_order) || 1,
          is_active: formData.is_active,
        });

        setFaqs((prev) => [created, ...prev]);
        showToast('New question added to chatbot! 🚀');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save FAQ:', err);
      alert('Failed to save FAQ: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (faq: ChatbotFaq) => {
    const nextState = !faq.is_active;
    try {
      const updated = await updateChatbotFaq(faq.id, { is_active: nextState });
      setFaqs((prev) => prev.map((f) => (f.id === faq.id ? updated : f)));
      showToast(`Question ${nextState ? 'activated' : 'hidden'}!`);
    } catch (err) {
      console.error('Failed to toggle FAQ status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chatbot question?')) return;
    setDeletingId(id);
    try {
      await deleteChatbotFaq(id);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      showToast('Question deleted successfully.');
    } catch (err) {
      console.error('Failed to delete FAQ:', err);
      alert('Failed to delete FAQ.');
    } finally {
      setDeletingId(null);
    }
  };

  const categories = Array.from(new Set(faqs.map((f) => f.category || 'General'))).filter(Boolean);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCat = selectedCategory === 'all' || (faq.category || 'General') === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCat;

    const matchesQ = faq.question.toLowerCase().includes(query);
    const matchesA = faq.answer.toLowerCase().includes(query);
    const matchesKw = (faq.keywords || []).some((k) => k.toLowerCase().includes(query));

    return matchesCat && (matchesQ || matchesA || matchesKw);
  });

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-xl animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-sky-500/10 border border-blue-500/20 dark:border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Chatbot Knowledge Base
              </h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Feed questions & answers for the bottom-right assistant widget. Instant & 100% deterministic.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Controls: Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, answers, or keywords..."
            className="w-full pl-10 pr-4 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Categories ({faqs.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Grid Cards */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Loading Questions...
          </p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No questions found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No matching questions for "${searchQuery}". Try a different term or clear the search.`
              : 'Click "+ Add Question" to add your first chatbot question.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-800/80 border transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                faq.is_active
                  ? 'border-slate-200/90 dark:border-slate-700/80'
                  : 'border-slate-200/40 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="space-y-3">
                {/* Card Header: Category Badge + Status Toggle */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                    {faq.category || 'General'}
                  </span>

                  <button
                    onClick={() => handleToggleActive(faq)}
                    title={faq.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                      faq.is_active
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        faq.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    <span>{faq.is_active ? 'Active' : 'Hidden'}</span>
                  </button>
                </div>

                {/* Question Title */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {faq.question}
                </h3>

                {/* Answer Preview */}
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                  {faq.answer}
                </p>

                {/* Keywords Chips */}
                {faq.keywords && faq.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {faq.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 font-bold">
                  Order: #{faq.display_order}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(faq)}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Edit question"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    disabled={deletingId === faq.id}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaq ? 'Edit Chatbot Question' : 'Add New Chatbot Question'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Question Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Question Title *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="e.g. Who is the Secretary of Cloud Stack Club?"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Category Dropdown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="About Club">About Club</option>
                <option value="Membership">Membership</option>
                <option value="Leadership">Leadership</option>
                <option value="Events">Events</option>
                <option value="Contact">Contact</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) || 1 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Answer Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Answer Content *
            </label>
            <textarea
              rows={4}
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Enter answer. Supports **bold text** and [clickable links](/events)."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tip: Use <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">**bold**</code> for emphasis or <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">[Text](/join)</code> to link to website pages.
            </p>
          </div>

          {/* Keywords / Aliases */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Search Keywords & Synonyms
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={formData.keywordsInput}
                onChange={(e) => setFormData({ ...formData, keywordsInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="e.g. secretary, gen sec, lead (press Enter)"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>

            {formData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                {formData.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-sky-400 text-xs font-semibold border border-blue-500/20"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(i)}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_toggle"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active_toggle" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Active in Chatbot (Visible to visitors)
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : editingFaq ? 'Update Question' : 'Save Question'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
