/**
 * 模拟 AI 流式响应生成
 * 返回按 token 拆分的数组，用于逐块发送到客户端
 */

// 预设回复模板池
const templates: Record<string, string> = {
  default: `你好！我是 AI 助手，很高兴为你服务。

下面我演示一下我支持的 Markdown 功能：

## 代码高亮

这是一个 TypeScript 示例：

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  return response.json();
}

// 使用示例
const user = await fetchUser(1);
console.log(user.name);
\`\`\`

## 表格

| 特性 | 支持状态 | 说明 |
|------|----------|------|
| Markdown 渲染 | ✅ | 支持 GFM 扩展语法 |
| 代码高亮 | ✅ | 使用 highlight.js |
| LaTeX 公式 | ✅ | 支持行内和块级公式 |
| 流式输出 | ✅ | 打字机效果 |
| 虚拟滚动 | ✅ | 大量消息性能优化 |

## LaTeX 数学公式

行内公式：$E = mc^2$

块级公式：

$$
\\frac{\\partial f}{\\partial t} + \\nabla \\cdot (\\mathbf{v} f) = 0
$$

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

## 列表

1. 第一项
2. 第二项
   - 嵌套列表
   - 另一个嵌套项
3. 第三项

> 这是一段引用文字。流式输出的 Markdown 渲染支持多种富文本格式。

如果你有任何问题，欢迎随时提问！😊`,

  hello: `你好！👋 有什么我可以帮助你的吗？

我可以帮你：
- 解答技术问题
- 编写代码示例
- 解释复杂概念
- 演示 Markdown 渲染

请随时向我提问！`,

  code: `好的，让我给你展示一些代码示例。

## JavaScript 异步处理

\`\`\`javascript
// Promise 链式调用
fetchData()
  .then(data => processData(data))
  .then(result => displayResult(result))
  .catch(error => console.error('Error:', error));

// async/await 语法
async function loadUserProfile(userId) {
  try {
    const user = await fetchUser(userId);
    const posts = await fetchPosts(user.id);
    return { user, posts };
  } catch (error) {
    console.error('Failed to load profile:', error);
    return null;
  }
}
\`\`\`

## Python 数据处理

\`\`\`python
import pandas as pd
import numpy as np

def analyze_data(df: pd.DataFrame) -> dict:
    """分析数据框的基本统计信息"""
    return {
        "shape": df.shape,
        "columns": list(df.columns),
        "null_count": df.isnull().sum().to_dict(),
        "numeric_stats": df.describe().to_dict()
    }

# 使用示例
data = pd.read_csv('data.csv')
result = analyze_data(data)
print(f"数据集大小: {result['shape']}")
\`\`\`

这些示例覆盖了常见的异步操作和数据处理场景，你可以根据实际需求进行调整。`,

  math: `好的，让我解释一些数学概念。

## 微积分基础

导数的定义：

$$
f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}
$$

## 线性代数

矩阵乘法的定义：若 $A \\in \\mathbb{R}^{m \\times n}$，$B \\in \\mathbb{R}^{n \\times p}$，则：

$$
(AB)_{ij} = \\sum_{k=1}^{n} A_{ik} B_{kj}
$$

## 概率论

贝叶斯定理：

$$
P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}
$$

其中 $P(B) = \\sum_{i} P(B|A_i) \\cdot P(A_i)$

## 信息论

熵的定义：

$$
H(X) = -\\sum_{i=1}^{n} P(x_i) \\log_2 P(x_i)
$$

这些是机器学习和深度学习中最基础的数学概念。理解它们对学习 AI 非常有帮助！`,

  table: `以下是一些数据的对比分析：

## 编程语言性能对比

| 语言 | 执行速度 | 内存占用 | 开发效率 | 学习曲线 |
|------|----------|----------|----------|----------|
| C/C++ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Rust | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Go | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Java | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Python | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| JavaScript | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| TypeScript | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 前端框架对比

| 框架 | 类型 | 学习曲线 | 生态系统 | 适用场景 |
|------|------|----------|----------|----------|
| React | UI 库 | 中等 | 非常丰富 | 中大型应用 |
| Vue | 渐进式框架 | 较低 | 丰富 | 各种规模 |
| Angular | 完整框架 | 较陡 | 丰富 | 企业级应用 |
| Svelte | 编译器框架 | 较低 | 成长中 | 性能敏感应用 |
| Solid | 响应式库 | 中等 | 成长中 | 高性能应用 |

选择技术栈时，建议根据项目需求、团队经验和长期维护来综合考虑。`,
};

// 任务相关关键词匹配
const keywordTemplates: [string[], string][] = [
  [['代码', '编程', 'code', 'javascript', 'python', 'typescript', '示例'], 'code'],
  [['数学', '公式', 'math', 'latex', '公式', '证明', '定理'], 'math'],
  [['表格', '对比', 'table', '比较', '数据'], 'table'],
  [['你好', 'hello', '嗨', 'hi', '帮助', 'help'], 'hello'],
];

/**
 * 根据用户消息匹配最合适的回复模板
 */
function matchTemplate(message: string): string {
  const lowerMsg = message.toLowerCase();
  for (const [keywords, templateKey] of keywordTemplates) {
    if (keywords.some(kw => lowerMsg.includes(kw))) {
      return templates[templateKey];
    }
  }
  return templates.default;
}

/**
 * 将文本拆分为模拟的 token 数组
 * 按中文词组、英文单词、标点符号、换行等拆分
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  // 使用正则匹配：中文单字+标点、英文单词、空白符、换行
  const regex = /([一-鿿])|([a-zA-Z0-9_]+)|(\s+)|(\n)|([^一-鿿\w\s])/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // 中文字符单独作为 token（逐字输出）
      tokens.push(match[1]);
    } else {
      // 英文单词、空白、换行、标点直接作为 token
      tokens.push(match[0]);
    }
  }

  return tokens;
}

/**
 * 生成流式响应 token 数组
 * @param message 用户输入的消息
 * @returns 按顺序发送的 token 数组
 */
export function generateStream(message: string): string[] {
  const template = matchTemplate(message);
  return tokenize(template);
}
