/**
 * 流式Markdown安全修补函数
 * 修补未闭合的代码围栏、数学公式等，避免渲染崩溃
 */
export function sanitizeStreamingMarkdown(text: string): string {
  let safe = text;

  // 1. 未闭合的代码围栏 (```)
  const fenceMatches = safe.match(/(```+)/g);
  if (fenceMatches) {
    const threeBacktickFences = fenceMatches.filter(f => f.length >= 3);
    if (threeBacktickFences.length % 2 !== 0) {
      safe += '\n```';
    }
  }

  // 2. 未闭合的 LaTeX 块级公式 $$
  const displayMathCount = (safe.match(/\$\$/g) || []).length;
  if (displayMathCount % 2 !== 0) {
    safe += '$$';
  }

  // 3. 行内公式 $ （需区分 $$）
  const inlineDollarMatches = safe.match(/(?<!\$)\$(?!\$)/g);
  if (inlineDollarMatches && inlineDollarMatches.length % 2 !== 0) {
    safe += '$';
  }

  return safe;
}
