// Helper function to convert to Hex
export const toHex = (string: string): string => {
  const s = unescape(encodeURIComponent(string));
  let h = "";

  for (let i = 0; i < s.length; i++) {
    h += s.charCodeAt(i).toString(16);
  }

  return h;
};
