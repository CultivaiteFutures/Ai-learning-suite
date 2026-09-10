import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw, X } from "lucide-react";
import Modal from "../ui/Modal";
import { schoolAdminAPI } from "../../services/api";

export default function StudentExcelUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  function resetState() {
    setFile(null);
    setUploading(false);
    setResult(null);
    setError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith(".xlsx")) {
        setError("Only .xlsx Excel files are supported.");
        return;
      }
      setFile(selected);
      setError(null);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const res = await schoolAdminAPI.downloadStudentTemplate();
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student_upload_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download template.");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select an Excel file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await schoolAdminAPI.uploadStudentsExcel(file);
      setResult(res.data);
      if (onUploadSuccess) onUploadSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please check the Excel format.");
    } finally {
      setUploading(false);
    }
  }

  function exportCredentialsCSV() {
    if (!result?.credentials || result.credentials.length === 0) return;
    
    const headers = ["Student Name", "Username / Email", "Initial Password", "Grade", "Section"];
    const rows = result.credentials.map((c) => [
      `"${c.name}"`,
      `"${c.username || c.email}"`,
      `"${c.initialPassword}"`,
      `"${c.grade}"`,
      `"${c.section}"`,
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_login_credentials.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Student Upload via Excel" maxWidth="max-w-xl">
      <div className="space-y-5">
        {!result ? (
          <>
            {/* Template Download Section */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Download Excel Template</p>
                <p className="text-xs text-slate-500">Columns: Name, Grade, Section</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm"
              >
                <Download size={14} className="text-indigo-600" />
                {downloadingTemplate ? "Downloading..." : "Download Template"}
              </button>
            </div>

            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/20 transition"
            >
              <FileSpreadsheet size={36} className="text-indigo-600" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                {file ? file.name : "Click to select or drag & drop .xlsx file"}
              </p>
              <p className="mt-1 text-xs text-slate-400">Supported: Microsoft Excel (.xlsx)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Processing Students...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Upload & Generate Credentials
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Result Summary & Credential Export */
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 border border-emerald-200">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">{result.message}</p>
                <p className="text-xs text-emerald-700">
                  Created: {result.createdCount} | Duplicates: {result.duplicateCount || 0} | Invalid: {result.invalidCount || 0}
                </p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="max-h-28 overflow-y-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 space-y-1">
                {result.errors.map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-2">
              <p className="text-xs font-medium text-slate-500">
                Initial passwords have been automatically generated and securely hashed. Download the distribution spreadsheet below to share logins with students.
              </p>
              <button
                type="button"
                onClick={exportCredentialsCSV}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <Download size={15} />
                Export Generated Credentials (.CSV)
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
