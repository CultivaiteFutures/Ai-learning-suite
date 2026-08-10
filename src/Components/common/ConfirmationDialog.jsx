import { AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import PrimaryButton from "../ui/PrimaryButton";

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  tone = "danger",
  loading = false,
}) {
  const toneStyles = {
    danger: "bg-rose-50 text-rose-600",
    warning: "bg-amber-50 text-amber-600",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneStyles[tone]}`}>
          <AlertTriangle size={18} />
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <div className="w-32">
          <PrimaryButton onClick={onConfirm} loading={loading} variant={tone === "danger" ? "danger" : "primary"}>
            {confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}