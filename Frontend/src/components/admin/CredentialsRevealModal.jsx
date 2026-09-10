import { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import Modal from "../ui/Modal";
import PrimaryButton from "../ui/PrimaryButton";

export default function CredentialsRevealModal({ isOpen, onClose, credentials }) {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !credentials) return null;

  const { role, name, email, tempPassword } = credentials;

  function handleCopy() {
    const text = `${role} Name: ${name}\nLogin Email: ${email}\nTemporary Password: ${tempPassword}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${role} Account Created`} maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={20} />
        </div>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{name}</span>&apos;s {role.toLowerCase()} account was created
          with a securely generated password — share these credentials with them.
        </p>
      </div>

      <div className="mt-5 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Login Email</span><span className="font-mono font-medium text-slate-800">{email}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Temporary Password</span><span className="font-mono font-medium text-slate-800">{tempPassword}</span></div>
      </div>

      <button onClick={handleCopy} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
        <Copy size={13} /> {copied ? "Copied Credentials!" : "Copy Credentials"}
      </button>

      <div className="mt-4">
        <PrimaryButton onClick={onClose}>Done</PrimaryButton>
      </div>
    </Modal>
  );
}
