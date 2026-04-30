Generate release notes for version ${{ inputs.tag }}.

Read the file `github_changes.tmp.json` in the current directory. It has this shape:

```json
{
  "current_tag": "YYYY.MM.DD.N",
  "previous_tag": "YYYY.MM.DD.N",
  "github_generated_notes": "<markdown string from GitHub's generate-notes API>",
  "commits": [
    {
      "sha": "<short sha>",
      "message": "<first line of commit message>",
      "author": "<name>",
      "date": "<ISO 8601>",
      "url": "<commit URL>"
    }
  ]
}
```

**Two sources, both equally important:**

- `github_generated_notes` — A markdown list of **merged PRs** in this release, generated server-side by GitHub. This is the authoritative source for changes that came in via pull request.
- `commits` — Every commit in the range between the previous and current tag. This is the authoritative source for **direct-push changes** (commits not associated with a PR). Many real changes land this way.

**Deduplication:** A commit and a PR entry may describe the same change (e.g., a PR merge commit). When they clearly refer to the same thing, include it once — prefer the PR entry since it has richer metadata (number, author). Do not list a change twice.

Use ONLY data from these two sources — do not look up additional history.

---

## FORMAT

The release notes must follow this structure, in this order, with no additional sections:

1. **Title** — A single H2 heading using this pattern:
   ## 🚀 Plexus v[X.Y.Z]

2. **Release Date** — A bolded line immediately below the title:
   **Release Date:** [Month DD, YYYY]

3. **Overview** — An H3 section with a short narrative (3-5 sentences) that:
   - Summarizes the theme or biggest impact of the release
   - Explains why users should care
   - Thanks contributors or the community if appropriate
   - Does NOT simply repeat the bullet points that follow

4. **Breaking Changes** — An H3 section (⚠️ icon) that calls out any
   backwards-incompatible changes. Each bullet should:
   - Clearly state what changed and what the impact is
   - Link to a migration guide or workaround if one exists
   - Reference the PR or issue number in parentheses at the end, or the commit SHA if no PR exists
   If there are NO breaking changes, omit this entire section entirely. Do not include the heading with an empty list.

5. **New Features** — An H3 section (✨ icon) listing new capabilities. Each bullet should:
   - Bold the feature name, followed by an em dash, then a one-sentence description
   - Reference the PR number in parentheses at the end, or the short commit SHA if no PR exists
   - Example (PR): **Feature Name** — Description of the feature. (#1234)
   - Example (direct push): **Feature Name** — Description of the feature. (abc1234)

6. **Bug Fixes** — An H3 section (🐛 icon) listing resolved issues. Each bullet should:
   - Start with "Fixed", "Resolved", or "Corrected"
   - Briefly describe the bug and its fix
   - Reference the PR number or commit SHA in parentheses at the end
   - Example: Fixed an issue where [description of bug]. (#5678)

7. **Other Changes** — An H3 section (🔧 icon) for deprecations, notable internal improvements, or anything that doesn't fit above, but only when it is meaningful to end users, operators, or integrators. Do NOT include items that are purely dependency updates or purely CI/workflow/build-pipeline maintenance. Same bullet format as the other sections.

8. **Contributors** — An H3 section (👥 icon) listing the people who contributed, prefixed with @. Format as a comma-separated line:
   Thanks to the following people who contributed to this release:
   @username1, @username2, @username3

---

## RULES

- Do NOT add sections not listed above (no Upgrade Instructions, no Links, no FAQ, etc.).
- Breaking Changes comes immediately after Overview, before New Features.
- If a section has no items, omit the section and its heading entirely — do not leave an empty section.
- Treat direct-push commits as full equals to PR-based changes — do not bury or omit them because they lack a PR number.
- Exclude changes that are purely dependency/version bumps, lockfile refreshes, or package manager maintenance unless there is a clear user-visible impact.
- Exclude changes that are purely CI, GitHub Actions, workflow, release automation, test harness, or build-pipeline maintenance unless there is a clear user-visible operational impact.
- If a PR or commit mixes substantive product changes with dependency or CI/workflow churn, include only the substantive product-facing change.
- Every bullet must end with a PR number (#NNN) or short commit SHA in parentheses. Only omit a reference if the input provides absolutely none.
- Keep the narrative overview concise (3-5 sentences). It should read like a human wrote it, not an automated log.
- Use consistent tense: present tense for features ("Adds"), past tense for fixes ("Fixed").
- Do not use the header divider (---) between sections; only use it after the title/date block and after the overview.
