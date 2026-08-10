import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import Modal from "../../ui/Modal";
import PrimaryButton from "../../ui/PrimaryButton";

export default function PDFUploadModal({ isOpen, onClose, onGenerate, loading }) {
  const [file, setFile] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }

  function handleGenerateClick() {
    onGenerate(file);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate from PDF" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Upload a PDF (lesson notes, a textbook chapter, a syllabus) and AI will extract the content and generate a
          full course structure — modules, lessons, activities, and quiz placeholders — ready for you to edit.
        </p>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center hover:border-indigo-300 hover:bg-indigo-50/40">
          <FileUp size={24} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">{file ? file.name : "Click to select a PDF"}</span>
          <span className="text-xs text-slate-400">PDF files only</span>
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
        </label>

        {loading && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
            <Loader2 size={14} className="animate-spin" /> Extracting text and generating course structure...
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <div className="w-40">
            <PrimaryButton onClick={handleGenerateClick} loading={loading} disabled={!file}>
              Generate Course
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}