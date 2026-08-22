import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Users,
  ArrowUpDown,
  FileText,
  Loader2,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  UserCheck,
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

  // Form Modal State (Add / Edit as Popup)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Role Members Viewer Modal State
  const [viewingRoleForMembers, setViewingRoleForMembers] = useState<Role | null>(null);

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
    setFormError(null);
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
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setFormError('Role name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
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
      setFormError(err?.message || 'Failed to save role to database.');
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

  const getRoleMembers = (roleId: string) => {
    return members.filter((m) => m.role_id === roleId && m.status === 'active');
  };

  const activeMembersForViewing = viewingRoleForMembers
    ? getRoleMembers(viewingRoleForMembers.id)
    : [];

  return (
    <>
      {/* Main Roles Management List Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Roles Management"
        maxWidth="max-w-3xl sm:max-w-3xl lg:max-w-4xl"
      >
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-blue-50/70 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Club Roles & Hierarchy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Directly manage role definitions, hierarchy order, and view assigned members in Supabase.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleStartCreate}
              className="shrink-0 shadow-md shadow-blue-500/20"
            >
              Add New Role
            </Button>
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

          {/* Roles List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
              <span>AVAILABLE ROLES ({rolesList.length})</span>
              <span>MEMBERS / ACTIONS</span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">Fetching roles from database...</span>
              </div>
            ) : rolesList.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No roles found in database. Click "Add New Role" above to create one.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {rolesList.map((role) => {
                  const roleMembers = getRoleMembers(role.id);
                  const memberCount = roleMembers.length;
                  return (
                    <div
                      key={role.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 hover:border-blue-400/80 dark:hover:border-slate-600 transition-all flex items-center justify-between gap-4 group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 text-xs font-black flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-500/20">
                          #{role.display_order ?? 99}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                            <span>{role.name}</span>
                          </div>
                          {role.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-lg mt-0.5">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Interactive Pill to view members assigned to this role */}
                        <button
                          type="button"
                          onClick={() => setViewingRoleForMembers(role)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-sky-400 border border-slate-200/60 dark:border-slate-600/60 hover:border-blue-300 dark:hover:border-blue-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.03] active:scale-95"
                          title={`Click to view all active members holding "${role.name}"`}
                        >
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>{memberCount} active</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(role)}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setRoleToDelete(role)}
                            className="p-2 rounded-xl text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                            title="Delete Role"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Dedicated Add / Edit Role Popup Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={resetForm}
        title={editingRoleId ? 'Edit Role' : 'Create New Role'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
              rows={3}
              placeholder="Brief description of role responsibilities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
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
              icon={
                isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )
              }
            >
              {isSubmitting ? 'Saving...' : editingRoleId ? 'Update Role' : 'Save Role'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Role Assigned Members Details Popup */}
      <Modal
        isOpen={!!viewingRoleForMembers}
        onClose={() => setViewingRoleForMembers(null)}
        title={`Members with Role — ${viewingRoleForMembers?.name || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Subheader info card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">
                #{viewingRoleForMembers?.display_order ?? 99}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {viewingRoleForMembers?.name}
                </h4>
                {viewingRoleForMembers?.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {viewingRoleForMembers.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-sky-400 text-xs font-extrabold shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span>{activeMembersForViewing.length} Assigned</span>
            </div>
          </div>

          {/* Members List */}
          {activeMembersForViewing.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-1.5">
              <UserCheck className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
              <p className="text-xs font-semibold">No active members currently hold this role.</p>
              <p className="text-[11px] text-slate-400">
                You can assign this role to any member from the Members Management list.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {activeMembersForViewing.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:border-blue-300 dark:hover:border-slate-600 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {member.name}
                          </span>
                          {member.is_core_member && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Core
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>{member.registration_id}</span>
                          {member.uid && <span>• UID: <strong className="text-slate-700 dark:text-slate-200">{member.uid}</strong></span>}
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                      Active
                    </span>
                  </div>

                  {/* Contact & Academic Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`mailto:${member.email}`}
                        className="truncate hover:text-blue-600 dark:hover:text-sky-400 transition-colors"
                      >
                        {member.email}
                      </a>
                    </div>

                    {member.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                    )}

                    {(member.department || member.year) && (
                      <div className="flex items-center gap-2 truncate sm:col-span-2">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {member.department || 'Department'}{' '}
                          {member.year ? `• ${member.year}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingRoleForMembers(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
