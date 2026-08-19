import { Sparkles } from "lucide-react";
import InputField from "../../ui/InputField";
import SelectField from "../../ui/SelectField";
import TextAreaField from "../../ui/TextAreaField";
import PrimaryButton from "../../ui/PrimaryButton";

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Computer Science",
  "Art",
  "Music",
  "Physical Education",
].map((s) => ({ value: s, label: s }));

const LANGUAGE_OPTIONS = ["English", "Hindi", "Spanish", "French", "Tamil"].map((l) => ({ value: l, label: l }));
const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Advanced"].map((d) => ({ value: d, label: d }));
const MODULE_COUNT_OPTIONS = Array.from({ length: 7 }, (_, i) => i + 2).map((n) => ({
  value: String(n),
  label: `${n} modules`,
}));
const DURATION_OPTIONS = ["30 minutes", "45 minutes", "60 minutes", "90 minutes"].map((d) => ({ value: d, label: d }));
const GRADE_OPTIONS = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((g) => ({ value: g, label: g }));

export default function CourseBuilderForm({ formData, onChange, onGenerate, isGenerating, errors }) {
  function handleChange(e) {
    const { name, value } = e.target;
    onChange(name, value);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Course Details</h2>
          <p className="mt-1 text-xs text-slate-500">Tell the AI what to build. The more detail, the better the result.</p>
        </div>

        <InputField
          label="Course Name"
          name="courseName"
          value={formData.courseName}
          onChange={handleChange}
          error={errors.courseName}
          placeholder="e.g. Introduction to Algebra"
        />

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Grade" name="grade" value={formData.grade} onChange={handleChange} options={GRADE_OPTIONS} />
          <SelectField label="Subject" name="subject" value={formData.subject} onChange={handleChange} options={SUBJECT_OPTIONS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Language" name="language" value={formData.language} onChange={handleChange} options={LANGUAGE_OPTIONS} />
          <SelectField label="Difficulty" name="difficulty" value={formData.difficulty} onChange={handleChange} options={DIFFICULTY_OPTIONS} />
        </div>

        <TextAreaField
          label="Learning Objectives"
          name="learningObjectives"
          value={formData.learningObjectives}
          onChange={handleChange}
          placeholder={"One per line, e.g.\nUnderstand linear equations\nSolve real-world word problems"}
          rows={4}
        />

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Number of Modules"
            name="numberOfModules"
            value={formData.numberOfModules}
            onChange={handleChange}
            options={MODULE_COUNT_OPTIONS}
          />
          <SelectField
            label="Lesson Duration"
            name="lessonDuration"
            value={formData.lessonDuration}
            onChange={handleChange}
            options={DURATION_OPTIONS}
          />
        </div>

        <TextAreaField
          label="Additional Instructions"
          name="additionalInstructions"
          value={formData.additionalInstructions}
          onChange={handleChange}
          placeholder="Optional — anything specific the AI should keep in mind (tone, pacing, focus areas...)"
          rows={3}
        />
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <PrimaryButton onClick={onGenerate} loading={isGenerating}>
          {!isGenerating && <Sparkles size={16} />}
          {isGenerating ? "Generating Course..." : "Generate Course"}
        </PrimaryButton>
      </div>
    </div>
  );
}