import { Plus, X } from "lucide-react";
import InlineEditableField from "./InlineEditableField";

export default function EditableList({ items, onChange, placeholder = "Add item...", addLabel = "Add item" }) {
  function updateItem(index, value) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...items, ""]);
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
          <div className="flex-1">
            <InlineEditableField value={item} onChange={(v) => updateItem(index, v)} placeholder={placeholder} className="text-sm" />
          </div>
          <button
            onClick={() => removeItem(index)}
            className="mt-1 shrink-0 rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1 pl-3.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}