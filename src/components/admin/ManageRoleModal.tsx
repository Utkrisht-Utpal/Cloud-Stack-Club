import React, { useState, useEffect } from 'react';
import { Award, Check, UserMinus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { updateMemberRoleAndCoreStatusAdmin } from '../../services/members';
import type { Member, Role } from '../../types/database';

interface ManageRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  roles: Role[];
  onSuccess: () => void;
}

export const ManageRoleModal: React.FC<ManageRoleModalProps> = ({
  isOpen,
  onClose,
  member,
  roles,
  onSuccess,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setSelectedRoleId(member.role_id || (roles[0]?.id || ''));
    }
  }, [member, roles]);

  if (!member) return null;

  const handleAssignCoreRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateMemberRoleAndCoreStatusAdmin(member.id, selectedRoleId || null, true);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Failed to assign role: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMakeNormalMember = async () => {
    if (!confirm(`Are you sure you want to convert ${member.name} to a normal user (remove core status and responsibility)?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateMemberRoleAndCoreStatusAdmin(member.id, null, false);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Failed to convert member: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Role — ${member.name}`}>
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm shrink-0">
            {member.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{member.name}</span>
              {member.is_core_member ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Current: Core Member
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                  Current: Normal User
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 font-mono">{member.registration_id} • {member.email}</div>
          </div>
        </div>

        {/* Option 1: Re-allocate / Assign Core Responsibility */}
        <form onSubmit={handleAssignCoreRole} className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Award className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <span>Re-allocate Core Responsibility (Fetch from Roles Table)</span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Select executive role from database to assign or update core responsibility:
          </p>

          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.description ? `(${r.description})` : ''}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || !selectedRoleId}
            icon={<Check className="w-3.5 h-3.5" />}
            className="w-full"
          >
            {isSubmitting ? 'Saving Role...' : 'Save & Assign Core Responsibility'}
          </Button>
        </form>

        {/* Option 2: Convert to Normal Member */}
        {member.is_core_member && (
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400">
              <UserMinus className="w-4 h-4 text-amber-600" />
              <span>Convert to Normal User</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Removes executive core responsibility and converts member back to a general club user.
            </p>
            <button
              type="button"
              onClick={handleMakeNormalMember}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Make Normal User</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
