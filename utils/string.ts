export function htmlTagEscape(text: string) {
  return text.replace(/&/g, " ").replace(/</g, " ").replace(/>/g, " ");
}

export function isUrl(str: string) {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Word wraps a string to a specific line length.
 * Note: Naive implementation.
 */
export function wordWrap(text: string, { width = 20 }: { width: number }): string {
  const words = text.split(" ");
  let line = "";
  let result = "";

  for (const word of words) {
    if ((line + word).length > width) {
      if (result) result += "\n";
      result += line.trim();
      line = "";
    }
    line += word + " ";
  }

  if (line.trim().length > 0) {
    if (result) result += "\n";
    result += line.trim();
  }

  return result;
}