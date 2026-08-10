import { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import Modal from "../ui/Modal";
import PrimaryButton from "../ui/PrimaryButton";

export default function CredentialsRevealModal({ isOpen, onClose, school, admin }) {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !school || !admin) return null;

  function handleCopy() {
    const text = `School Code: ${school.schoolCode}\nAdmin Email: ${admin.email}\nTemporary Password: ${admin.tempPassword}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="School Onboarded Successfully" maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={20} />
        </div>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{school.schoolName}</span> has been onboarded. A School Admin
          account was generated automatically — share these credentials securely.
        </p>
      </div>

      <div className="mt-5 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">School Code</span><span className="font-mono font-medium text-slate-800">{school.schoolCode}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Admin Email</span><span className="font-mono font-medium text-slate-800">{admin.email}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Temp Password</span><span className="font-mono font-medium text-slate-800">{admin.tempPassword}</span></div>
      </div>

      <button onClick={handleCopy} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
        <Copy size={13} /> {copied ? "Copied!" : "Copy Credentials"}
      </button>

      <div className="mt-4">
        <PrimaryButton onClick={onClose}>Done</PrimaryButton>
      </div>
    </Modal>
  );
}