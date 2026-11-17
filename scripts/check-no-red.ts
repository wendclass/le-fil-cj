import fs from "fs";
import path from "path";

/**
 * Script de vérification automatique : aucune couleur rouge, rose ou orange dans l'interface.
 * Conforme au Prompt de correction A (Section 4 & Section 11).
 */

const DIRS_TO_SCAN = ["app", "components", "lib"];
const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".css", ".json"];

// Mots et motifs strictement interdits
// (en dehors des fichiers images dans /public/brand)
const FORBIDDEN_PATTERNS: { regex: RegExp; label: string }[] = [
  // Classes CSS Tailwind interdites
  { regex: /\b(?:text|bg|border|ring|fill|stroke|from|to|via)-(?:red|rose|orange|crimson)-\d+\b/i, label: "Classe Tailwind interdite (red/rose/orange/crimson)" },
  { regex: /\b(?:text|bg|border|ring)-(?:alert)\b/i, label: "Token obsolète alert (text-alert, bg-alert, border-alert)" },
  { regex: /--color-alert\b/i, label: "Variable CSS obsolète --color-alert" },
  { regex: /--color-on-alert\b/i, label: "Variable CSS obsolète --color-on-alert" },

  // Codes hexadécimaux rouges / oranges / roses interdits
  { regex: /#(?:[eE]3141[aA]|[eE][fF]4444|[dD][cC]2626|[bB]91[cC]1[cC]|[fF]87171|[fF]43[fF]5[eE]|[eE]11[dD]48|[fF]97316|[eE][aA]580[cC])\b/, label: "Code hexadécimal rouge/rose/orange" },

  // Variants de boutons ou badges "danger" ou "alert" résiduels
  { regex: /variant=["']danger["']/i, label: "variant='danger' interdit (utiliser contour bleu marine avec ConfirmModal)" },
  { regex: /variant=["']alert["']/i, label: "variant='alert' interdit (utiliser 'yellow', 'yellow-soft' ou 'neutral')" },
];

interface Violation {
  file: string;
  line: number;
  pattern: string;
  matchedText: string;
  content: string;
}

const violations: Violation[] = [];

function scanFile(filePath: string) {
  // Ignorer scripts/check-no-red.ts lui-même
  if (filePath.replace(/\\/g, "/").includes("check-no-red.ts")) return;

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((lineText, idx) => {
    // Ignorer les commentaires qui mentionnent les règles de non-utilisation du rouge
    const trimmed = lineText.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return;
    }

    for (const { regex, label } of FORBIDDEN_PATTERNS) {
      const match = lineText.match(regex);
      if (match) {
        violations.push({
          file: filePath,
          line: idx + 1,
          pattern: label,
          matchedText: match[0],
          content: lineText.trim(),
        });
      }
    }
  });
}

function scanDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
        continue;
      }
      scanDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

console.log("\x1b[36m%s\x1b[0m", "→ Vérification de l'absence totale de rouge dans l'interface (Prompt A)...");

DIRS_TO_SCAN.forEach((dir) => {
  scanDir(path.resolve(process.cwd(), dir));
});

if (violations.length > 0) {
  console.error("\x1b[31m%s\x1b[0m", `\n✖ Échec : ${violations.length} violation(s) de couleur interdite détectée(s) :`);
  violations.forEach((v) => {
    console.error(
      `  \x1b[33m${v.file}:${v.line}\x1b[0m\n    Motif: \x1b[31m${v.pattern}\x1b[0m (trouvé: "${v.matchedText}")\n    Extrait: ${v.content}\n`
    );
  });
  console.error(
    "\x1b[31m%s\x1b[0m",
    "Correction requise : remplace toutes les utilisations de rouge par la nouvelle palette (jaune soleil, vert, bleu marine)."
  );
  process.exit(1);
} else {
  console.log("\x1b[32m%s\x1b[0m", "✔ Succès : aucun rouge, rose ou orange détecté dans l'interface !");
  process.exit(0);
}
