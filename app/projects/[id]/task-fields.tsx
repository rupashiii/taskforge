type Defaults = {
  title?: string;
  description?: string;
  skills?: string;
  criteria?: string;
  complexity?: number;
  hours?: number | null;
  reward?: number | null;
  deadline?: string;
};

export default function TaskFields({ defaults = {} }: { defaults?: Defaults }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">
          Task Title
        </label>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={defaults.title}
          placeholder="e.g. Design responsive navbar & dashboard layout"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">
          Detailed Description
        </label>
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={defaults.description}
          placeholder="What specific tasks, technical requirements, or assets need to be delivered?"
          className="w-full rounded-xl border border-gray-200 p-3 text-xs leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">
          Skills Required{" "}
          <span className="font-normal text-gray-400">— Comma separated</span>
        </label>
        <input
          name="skills"
          defaultValue={defaults.skills}
          placeholder="e.g. figma, tailwind, react, typescript"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">
          Acceptance Criteria{" "}
          <span className="font-normal text-gray-400">— One per line (used during review)</span>
        </label>
        <textarea
          name="criteria"
          rows={3}
          defaultValue={defaults.criteria}
          placeholder={"Figma file includes desktop and mobile views\nClean component auto-layout used\nInteractive prototype linked"}
          className="w-full rounded-xl border border-gray-200 p-3 text-xs leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Complexity
          </label>
          <select
            name="complexity"
            defaultValue={String(defaults.complexity ?? 3)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
          >
            <option value="1">1 - Very easy</option>
            <option value="2">2 - Easy</option>
            <option value="3">3 - Medium</option>
            <option value="4">4 - Hard</option>
            <option value="5">5 - Complex</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Est. Hours
          </label>
          <input
            name="hours"
            type="number"
            min="0.5"
            step="0.5"
            defaultValue={defaults.hours ?? ""}
            placeholder="e.g. 6"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Reward (₹)
          </label>
          <input
            name="reward"
            type="number"
            required
            min="1"
            step="1"
            defaultValue={defaults.reward ?? ""}
            placeholder="e.g. 5000"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            Target Deadline
          </label>
          <input
            name="deadline"
            type="date"
            defaultValue={defaults.deadline}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>
    </div>
  );
}
