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
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Task Title
        </label>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={defaults.title}
          placeholder="e.g. Design responsive navbar & dashboard layout"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Detailed Deliverable Description
        </label>
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={defaults.description}
          placeholder="What specific tasks, technical requirements, or assets need to be delivered?"
          className="w-full rounded-md border border-input bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Skills Required{" "}
          <span className="font-normal lowercase text-muted-foreground">— comma separated</span>
        </label>
        <input
          name="skills"
          defaultValue={defaults.skills}
          placeholder="e.g. figma, tailwind, react, typescript"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Acceptance Criteria{" "}
          <span className="font-normal lowercase text-muted-foreground">— one per line (evaluated during review)</span>
        </label>
        <textarea
          name="criteria"
          rows={3}
          defaultValue={defaults.criteria}
          placeholder={"Figma file includes desktop and mobile views\nClean component auto-layout used\nInteractive prototype linked"}
          className="w-full rounded-md border border-input bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Complexity
          </label>
          <select
            name="complexity"
            defaultValue={String(defaults.complexity ?? 3)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors cursor-pointer"
          >
            <option value="1">1 - Very easy</option>
            <option value="2">2 - Easy</option>
            <option value="3">3 - Medium</option>
            <option value="4">4 - Hard</option>
            <option value="5">5 - Complex</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Est. Hours
          </label>
          <input
            name="hours"
            type="number"
            min="0.5"
            step="0.5"
            defaultValue={defaults.hours ?? ""}
            placeholder="e.g. 6"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Target Deadline
          </label>
          <input
            name="deadline"
            type="date"
            defaultValue={defaults.deadline}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
