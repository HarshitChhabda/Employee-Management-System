// Common Hindi spelling variations dictionary
// Maps variant → canonical form
const hindiVariations: Record<string, string> = {
  // Helper variations
  'हैल्पर': 'हेल्पर',
  'हेल्पर': 'हेल्पर',
  'हैल्पर ': 'हेल्पर',
  ' हेल्पर': 'हेल्पर',

  // Manager variations
  'मैनेजर': 'मैनेजर',
  'मेनेजर': 'मैनेजर',
  'मैनजर': 'मैनेजर',
  'मेनजर': 'मैनेजर',

  // Supervisor variations
  'सुपरवाइजर': 'सुपरवाइजर',
  'सुपरवाइज़र': 'सुपरवाइजर',
  'सुपरवाइज़र ': 'सुपरवाइजर',

  // Accountant variations
  'अकाउंटेंट': 'अकाउंटेंट',
  'अकाउंटेंट ': 'अकाउंटेंट',
  'एकाउंटेंट': 'अकाउंटेंट',
  'हिसाबकार': 'अकाउंटेंट',

  // Clerk variations
  'क्लर्क': 'क्लर्क',
  'क्लर्क ': 'क्लर्क',
  ' क्लर्क': 'क्लर्क',

  // Peon variations
  'पियन': 'पियन',
  'पियॉन': 'पियन',
  'पियोन': 'पियन',

  // Guard variations
  'गार्ड': 'गार्ड',
  'गार्ड ': 'गार्ड',
  ' गार्ड': 'गार्ड',
  'चौकीदार': 'गार्ड',

  // Driver variations
  'ड्राइवर': 'ड्राइवर',
  'ड्रायवर': 'ड्राइवर',
  'चालक': 'ड्राइवर',

  // Cook variations
  'कुक': 'कुक',
  'रसोइया': 'कुक',
  'रसोइयाः': 'कुक',

  // Cleaner variations — canonical: सफाई कर्मचारी
  'क्लीनर': 'सफाई कर्मचारी',
  'साफ़ कर्मचारी': 'सफाई कर्मचारी',
  'सफाई कर्मचारी': 'सफाई कर्मचारी',

  // Carpenter variations
  'बढ़ई': 'बढ़ई',
  'बड़ई': 'बढ़ई',

  // Electrician variations
  'इलेक्ट्रीशियन': 'इलेक्ट्रीशियन',
  'इलेक्ट्रिशियन': 'इलेक्ट्रीशियन',
  'बिजली मिस्त्री': 'इलेक्ट्रीशियन',

  // Plumber variations
  'प्लंबर': 'प्लंबर',
  'प्लम्बर': 'प्लंबर',
  'नलसाज': 'प्लंबर',

  // Teacher variations
  'शिक्षक': 'शिक्षक',
  'अध्यापक': 'शिक्षक',
  'प्राध्यापक': 'शिक्षक',

  // Doctor variations
  'डॉक्टर': 'डॉक्टर',
  'डॉक्टर ': 'डॉक्टर',
  ' डॉक्टर': 'डॉक्टर',
  'चिकित्सक': 'डॉक्टर',

  // Nurse variations
  'नर्स': 'नर्स',
  'नर्स ': 'नर्स',
  ' सिस्टर': 'नर्स',
  'सिस्टर': 'नर्स',

  // Sweeper variations — canonical: सफाई कर्मचारी
  'सफाईवाला': 'सफाई कर्मचारी',

  // उपभोक्ता भंडार variations
  'उपभोक्ता भण्डार': 'उपभोक्ता भंडार',
  'उपभोक्ता भंडार ': 'उपभोक्ता भंडार',
  'उपभोक्ता  भंडार': 'उपभोक्ता भंडार',

  // Common matra variations (same-char mappings removed as they are no-ops)
  // Handled by NFC normalization

  // Common department variations
  'ऑफिस': 'कार्यालय',
  'अकाउंट': 'लेखा',
  'अकाउंट्स': 'लेखा',
};

// Normalize a single Hindi word by applying dictionary rules
function normalizeHindiWord(word: string): string {
  let normalized = word.trim();

  // Direct dictionary lookup
  if (hindiVariations[normalized]) {
    return hindiVariations[normalized];
  }

  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Apply dictionary lookup after space normalization
  if (hindiVariations[normalized]) {
    return hindiVariations[normalized];
  }

  return normalized;
}

// Calculate similarity between two Hindi strings (0-1)
function hindiSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[a.length][b.length];
  return 1 - distance / maxLen;
}

export interface NameVariant {
  original: string;
  normalized: string;
  count: number;
}

export interface NameVariantGroup {
  canonical: string;
  variants: NameVariant[];
  totalCount: number;
  confidence: number;
}

// Find all name variants in a list of names
export function findNameVariants(names: string[]): NameVariantGroup[] {
  // Step 1: Normalize all names and group
  const normalizedMap: Record<string, NameVariant[]> = {};

  for (const name of names) {
    if (!name || name.trim() === '') continue;
    const normalized = normalizeHindiWord(name);

    if (!normalizedMap[normalized]) {
      normalizedMap[normalized] = [];
    }

    const existing = normalizedMap[normalized].find(v => v.original === name);
    if (existing) {
      existing.count++;
    } else {
      normalizedMap[normalized].push({ original: name, normalized, count: 1 });
    }
  }

  // Step 2: Find groups where original differs but normalization is same
  const groups: NameVariantGroup[] = [];

  for (const [canonical, variants] of Object.entries(normalizedMap)) {
    // Only include if there are different original spellings
    const uniqueOriginals = new Set(variants.map(v => v.original));
    if (uniqueOriginals.size > 1) {
      const totalCount = variants.reduce((sum, v) => sum + v.count, 0);
      groups.push({
        canonical,
        variants: variants.sort((a, b) => b.count - a.count),
        totalCount,
        confidence: 0.95,
      });
    }
  }

  // Step 3: Also do fuzzy matching between normalized names
  const allNormalized = Object.keys(normalizedMap);
  const fuzzyGroups: NameVariantGroup[] = [];

  for (let i = 0; i < allNormalized.length; i++) {
    for (let j = i + 1; j < allNormalized.length; j++) {
      const sim = hindiSimilarity(allNormalized[i], allNormalized[j]);
      if (sim >= 0.75 && sim < 1.0) {
        // These are similar but not identical
        const variantsA = normalizedMap[allNormalized[i]];
        const variantsB = normalizedMap[allNormalized[j]];

        const allVariants: NameVariant[] = [
          ...variantsA.map(v => ({ ...v })),
          ...variantsB.map(v => ({ ...v })),
        ];

        const totalCount = allVariants.reduce((sum, v) => sum + v.count, 0);
        // Prefer longer name (more formal Hindi), then higher count
        const canonical = allNormalized[i].length > allNormalized[j].length
          ? allNormalized[i]
          : allNormalized[i].length < allNormalized[j].length
            ? allNormalized[j]
            : variantsA[0].count >= variantsB[0].count ? allNormalized[i] : allNormalized[j];

        // Check if this group already exists
        const existingGroup = fuzzyGroups.find(g =>
          g.variants.some(v => allNormalized.includes(v.normalized))
        );

        if (!existingGroup) {
          fuzzyGroups.push({
            canonical,
            variants: allVariants,
            totalCount,
            confidence: sim,
          });
        }
      }
    }
  }

  return [...groups, ...fuzzyGroups];
}
