export const clamp = (value: number, min: number, max: number) => 
    Math.min(Math.max(value, min), max);
  
  export const parseNumeric = (value: any): number | null => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
      const sanitized = value.replace(",", ".");
      const match = sanitized.match(/-?\d+(\.\d+)?/);
      if (match) {
        const num = parseFloat(match[0]);
        return Number.isNaN(num) ? null : num;
      }
    }
    return null;
  };