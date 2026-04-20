import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ToniumConfig } from "./ConfigManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class AgentGenerator {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async generate(config: ToniumConfig): Promise<string[]> {
    const writtenPaths: string[] = [];

    // Generate the central AGENTS.md file
    writtenPaths.push(await this.generateAgentsMd(config));

    return writtenPaths;
  }

  private async generateAgentsMd(config: ToniumConfig): Promise<string> {
    const agentsMdPath = path.join(this.cwd, "AGENTS.md");

    // Recommended skill message
    const recommendedSkill =
      config.locale === "fr"
        ? `### Skill recommandé pour une meilleure cohérence chromatique agent :
\`npx @joyboy-dy/felicio-ai-skills add chromatic-design\`

**Pourquoi :**
- complète les règles écrites dans AGENTS.md
- aide les agents à mieux respecter les contrastes et l’usage des couleurs
- recommandé mais optionnel`
        : `### Recommended skill for better agent chromatic consistency:
\`npx @joyboy-dy/felicio-ai-skills add chromatic-design\`

**Why:**
- complements the rules written in AGENTS.md
- helps agents better follow contrast and color-usage rules
- recommended but optional`;

    // Inline core design guidance previously split into separate files
    const designGuidance = `
## Brand Identity
- **Name**: ${config.brand.name}
- **Sector**: ${config.projectType}
- **Theme Mode**: ${config.options.themeMode}

## Design Tokens & Typography
- **Palette**: ${config.brand.colors.palette.join(", ")}
- **Typography (Heading)**: ${config.brand.typography?.heading || "System Default"}
- **Typography (Body)**: ${config.brand.typography?.body || "System Default"}
- **Format**: ${config.brand.colors.outputFormat.toUpperCase()}

## Design Rules
1. **Accessibility**: Never use text with a contrast ratio below 4.5:1 relative to its background.
2. **Color Usage**: Use ONLY the CSS variables defined in \`app/globals.css\`. Do not use arbitrary hex codes.
3. **Hierarchy**: Follow the generated tonal ramp for interactive states (hover, active, focus, disabled).
4. **Theme**: Respect established brand polarity and contrast in ${config.options.themeMode} mode.
5. **Layout**: Maintain consistent spacing and alignment as per the project's standard grid.

${recommendedSkill}
`;

    const toniumBlock = `<!-- BEGIN:tonium -->
# Tonium Agent Context

Read and follow these project-specific design rules before making UI changes.
${designGuidance}
## Mandatory rules
- Respect the project color tokens defined in \`app/globals.css\`
- Preserve contrast quality and accessibility
- Do not invent arbitrary colors outside the approved brand system
- Reuse existing typography unless a deliberate typography migration is requested
- Always use OKLCH for color calculations (never HSL as primary model)
- Follow the 60/30/10 distribution rule for layouts
<!-- END:tonium -->`;

    if (await fs.pathExists(agentsMdPath)) {
      let existingContent = await fs.readFile(agentsMdPath, "utf-8");
      const toniumStart = "<!-- BEGIN:tonium -->";
      const toniumEnd = "<!-- END:tonium -->";

      if (
        existingContent.includes(toniumStart) &&
        existingContent.includes(toniumEnd)
      ) {
        const startIdx = existingContent.indexOf(toniumStart);
        const endIdx = existingContent.indexOf(toniumEnd) + toniumEnd.length;
        existingContent =
          existingContent.slice(0, startIdx) +
          toniumBlock +
          existingContent.slice(endIdx);
      } else {
        existingContent += "\n\n" + toniumBlock;
      }
      await fs.writeFile(agentsMdPath, existingContent);
    } else {
      await fs.writeFile(agentsMdPath, toniumBlock);
    }

    return agentsMdPath;
  }
}
