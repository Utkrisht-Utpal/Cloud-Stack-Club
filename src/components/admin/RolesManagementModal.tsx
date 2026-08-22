import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Users,
  ArrowUpDown,
  FileText,
  Loader2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { getRoles, createRole, updateRole, deleteRole } from '../../services/roles';
import type { Role, Member } from '../../types/database';

interface RolesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onRolesUpdated: () => void;
}

export const RolesManagementModal: React.FC<RolesManagementModalProps> = ({
  isOpen,
  onClose,
  members,
  onRolesUpdated,
}) => {
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRolesData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRoles();
      setRolesList(data);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
      setError(err?.message || 'Failed to fetch roles from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRolesData();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingRoleId(null);
    setRoleName('');
    setDisplayOrder(rolesList.length > 0 ? Math.max(...rolesList.map((r) => r.display_order || 0)) + 1 : 1);
    setDescription('');
    setError(null);
  };

  const handleStartCreate = () => {
    resetForm();
    const nextOrder =
      rolesList.length > 0
        ? Math.max(...rolesList.map((r) => r.display_order || 0)) + 1
        : 1;
    setDisplayOrder(nextOrder);
    setIsFormOpen(true);
  };

  const handleStartEdit = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setDisplayOrder(role.display_order || 1);
    setDescription(role.description || '');
    setIsFormOpen(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError('Role name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingRoleId) {
        // Update
        const updated = await updateRole(editingRoleId, {
          name: roleName.trim(),
          display_order: Number(displayOrder) || 99,
          description: description.trim() || null,
        });
        setRolesList((prev) =>
          prev
            .map((r) => (r.id === updated.id ? updated : r))
            .sort((a, b) => (a.display_order || 99) - (b.display_order || 99) || a.name.localeCompare(b.name))
        );
        setSuccessMsg(`Role "${updated.name}" updated successfully.`);
      } else {
        // Create
        const created = await createRole({
          name: roleName.trim(),
          display_order: Number(displayOrder) || 99,
          description: description.trim() || null,
        });
        setRolesList((prev) =>
          [...prev, created].sort(
            (a, b) => (a.display_order || 99) - (b.display_order || 99) || a.name.localeCompare(b.name)
          )
        );
        setSuccessMsg(`Role "${created.name}" created successfully.`);
      }

      resetForm();
      onRolesUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Role save error:', err);
      setError(err?.message || 'Failed to save role to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteRole(roleToDelete.id);
      setRolesList((prev) => prev.filter((r) => r.id !== roleToDelete.id));
      setSuccessMsg(`Role "${roleToDelete.name}" deleted from database.`);
      setRoleToDelete(null);
      onRolesUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Role delete error:', err);
      setError(err?.message || 'Failed to delete role.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleMemberCount = (roleId: string) => {
    return members.filter((m) => m.role_id === roleId && m.status === 'active').length;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Roles Management">
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Club Roles & Hierarchy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Directly manage role definitions, hierarchy order, and descriptions in Supabase.
              </p>
            </div>
          </div>

          {!isFormOpen && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleStartCreate}
              className="shrink-0"
            >
              Add New Role
            </Button>
          )}
        </div>

        {/* Notifications / Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Add / Edit Form Card */}
        {isFormOpen && (
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-blue-300 dark:border-blue-500/40 shadow-lg space-y-4 transition-all"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />
                {editingRoleId ? 'Edit Role' : 'Create New Role'}
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Role Name */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Role Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Secretary, Tech Lead, Coordinator"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {/* Display Order */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  <span>Order Rank</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Description / Scope (Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Brief description of role responsibilities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !roleName.trim()}
                icon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              >
                {isSubmitting ? 'Saving...' : editingRoleId ? 'Update Role' : 'Save Role'}
              </Button>
            </div>
          </form>
        )}

        {/* Roles List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span>AVAILABLE ROLES ({rolesList.length})</span>
            <span>ORDER / MEMBERS</span>
          </div>

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Fetching roles from database...</span>
            </div>
          ) : rolesList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No roles found in database. Click "Add New Role" above to create one.
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {rolesList.map((role) => {
                const memberCount = getRoleMemberCount(role.id);
                return (
                  <div
                    key={role.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 hover:border-blue-300 dark:hover:border-slate-600 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 text-xs font-black flex items-center justify-center shrink-0">
                        #{role.display_order ?? 99}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                          <span>{role.name}</span>
                        </div>
                        {role.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{memberCount} active</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(role)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                          title="Edit Role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setRoleToDelete(role)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                          title="Delete Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!roleToDelete}
          onClose={() => setRoleToDelete(null)}
          onConfirm={executeDeleteRole}
          title={`Delete Role "${roleToDelete?.name}"?`}
          message={`Are you sure you want to delete the "${roleToDelete?.name}" role from the database? Any members currently holding this role will remain intact with their role set to unassigned.`}
          confirmText="Delete Role"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </Modal>
  );
};
